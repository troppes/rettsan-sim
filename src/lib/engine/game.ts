/* Spiel-Engine: interpretiert die Falldaten. Keine Oberfläche, kein DOM. */
import type { Action, ActionKind, CaseDef, IvRun, Letter, Moment, ProcMode, Quiz, StressConfig, TreatEffect, VitalKey } from '../types';
import { ACTIONS, ACTION_GROUPS, ECG, LETTERS, PROCEDURES, REA, RULES } from '../data';
import { clamp, fill, pick, shuffle } from '../util';
import { mutate, test, variant, type Ctx } from './conditions';
import type { Choice, FaceState, GameState, LogEntry, LogType, Prompt, PromptCtl, ScoreEvent, Settings } from './state';
import { ProcSession } from './procedure';
import { procMemory } from './memory';
import { Rea } from './rea';
import { debrief, type Debrief } from './scoring';

const T = RULES.texts;
const li = (l: Letter) => LETTERS.indexOf(l);

export type Toast = { text: string; tone: 'good' | 'bad' | '' };

export class Game {
  readonly s: GameState;
  readonly log: LogEntry[] = [];
  prompt: Prompt | null = null;
  result: Debrief | null = null;
  private ctl: PromptCtl | null = null;
  private proc: ProcSession | null = null;
  /** Für Tests: Modus der Maßnahmen festlegen statt zufällig wählen */
  forceProcMode: ProcMode | null = null;
  private lastProcMode: ProcMode | null = null;
  private askedProcQ: Record<string, number[]> = {};
  readonly rea: Rea | null;
  /** Gesprächsmomente des Falls plus zufällige Störungen je nach Schwierigkeit */
  readonly moments: Moment[];
  onChange: () => void = () => {};
  onToast: (t: Toast) => void = () => {};

  constructor(readonly c: CaseDef, readonly settings: Settings, dispatch = c.dispatches[Math.floor(Math.random() * c.dispatches.length)]) {
    const { status, ...vitals } = c.start;
    this.s = {
      dispatch, v: { ...vitals }, status, mood: c.mood, time: 0,
      count: {}, lastAt: {}, fixed: {}, flags: {}, warned: {}, quizDone: {}, momentDone: {}, rulesDone: {},
      letters: {}, unlocked: [], events: [], attached: { ekg: false, spo2: false }, nibp: null, afShown: null,
      measured: {}, quickAsk: 0, over: false, rea: null,
    };
    for (const p of c.problems ?? []) this.s.fixed[p.id] = false;
    this.rea = c.rea ? new Rea(this) : null;
    this.moments = [...(c.moments ?? []), ...this.pickStress()];
    this.addLog('dispatch', dispatch.text, '🚑 Einsatzmeldung');
    this.addLog('info', T.start);
  }

  /** Zufällige Störungen (Funk, Telefon, Gaffer …), mehr bei schwereren Fällen */
  private pickStress(): Moment[] {
    if (this.c.noStress) return [];
    const st = RULES.stress as unknown as StressConfig;
    const n = st.interruptions[String(this.c.level)] ?? 0;
    const pool = shuffle(st.pool.filter((m) => !(m.except ?? []).includes(this.c.id) && (!m.only || m.only.includes(this.c.id))));
    const [from, to] = st.window;
    return pool.slice(0, n).map((m, i) => {
      const at = Math.round(from + ((to - from) * (i + 0.2 + Math.random() * 0.6)) / n);
      const { except: _e, only: _o, ...rest } = m;
      return { ...rest, id: 'stress_' + m.id, at };
    });
  }
  /** Schwerere Fälle verschlechtern sich schneller */
  get worsenFactor() { return (RULES.stress as unknown as StressConfig).worsenFactor[String(this.c.level)] ?? 1; }

  get ctx(): Ctx { return { s: this.s, settings: this.settings }; }
  changed() { this.onChange(); }

  /* ------------------------------------------------------------ Log & Punkte */
  addLog(type: LogType, text: string, who?: string, pts?: number) { this.log.push({ type, text, who, pts }); }
  toast(text: string, tone: Toast['tone'] = '') { this.onToast({ text, tone }); }
  addEvent(pts: number, max: number, text: string, why?: string, type?: ScoreEvent['type']) {
    this.s.events.push({ pts, max, text, why, type: type ?? (pts < 0 ? 'bad' : 'good'), at: this.s.time });
  }
  penalty(pts: number, text: string) {
    const p = Math.abs(pts);
    this.addEvent(-p, 0, text, undefined, 'bad');
    this.addLog('bad', text, undefined, -p);
    this.toast(`−${p} Punkte`, 'bad');
  }
  reward(pts: number, max: number, text: string) {
    this.addEvent(pts, max, text, undefined, 'good');
    if (pts > 0) { this.addLog('good', text, undefined, pts); this.toast(`+${pts} Punkte`, 'good'); }
  }
  warnOnce(key: string, pts: number, text: string) {
    if (this.s.warned[key]) { this.addLog('info', text); return; }
    this.s.warned[key] = true;
    this.penalty(pts, text);
  }
  get score() { return Math.round(this.s.events.reduce((t, e) => t + e.pts, 0)); }

  /* ------------------------------------------------------------ Zeit & Verlauf */
  advance(sec: number) {
    const steps = Math.max(1, Math.round(sec / 10));
    const dt = sec / steps;
    for (let i = 0; i < steps; i++) {
      this.s.time += dt;
      this.tick(dt / 60);
      this.clampVitals();
    }
  }
  private tick(dtMin: number) {
    const { s, c } = this;
    if (this.settings.worsen) {
      for (const p of c.problems ?? []) {
        if (s.fixed[p.id] || !p.worsen || !this.active(p.activeIf)) continue;
        for (const [k, d] of Object.entries(p.worsen)) s.v[k as VitalKey] += d! * dtMin * this.worsenFactor;
      }
    }
    for (const tr of c.trends ?? []) {
      if (!test(tr.if, this.ctx)) continue;
      for (const [k, d] of Object.entries(tr.perMin)) {
        const key = k as VitalKey;
        s.v[key] += d! * dtMin;
        if (tr.min?.[key] != null) s.v[key] = Math.max(tr.min[key]!, s.v[key]);
        if (tr.max?.[key] != null) s.v[key] = Math.min(tr.max[key]!, s.v[key]);
      }
    }
    for (const r of c.rules ?? []) {
      if (s.rulesDone[r.id] || !test(r.if, this.ctx)) continue;
      s.rulesDone[r.id] = true;
      mutate(s, r);
      for (const id of r.fix ?? []) s.fixed[id] = true;
      if (r.alert) { this.addLog('alert', '⚠️ ' + r.alert); this.toast('⚠️ Zustand verändert', 'bad'); }
      if (r.info) this.addLog('info', 'ℹ️ ' + r.info);
    }
  }
  clampVitals() {
    const v = this.s.v;
    v.spo2 = clamp(v.spo2, 0, 100);
    v.gcs = clamp(Math.round(v.gcs), 3, 15);
    v.hr = Math.max(0, v.hr);
    v.sys = Math.max(0, v.sys);
    v.dia = Math.max(0, Math.min(v.dia, v.sys - 10));
    v.af = Math.max(0, v.af);
    v.bz = Math.max(10, v.bz);
  }
  active(cond: Parameters<typeof test>[0]) { return test(cond, this.ctx); }
  private openBlocking(maxIdx: number, exceptId?: string) {
    return (this.c.problems ?? [])
      .filter((p) => p.blocking && !this.s.fixed[p.id] && this.active(p.activeIf) && li(p.letter) < maxIdx && !(p.fixedBy ?? []).includes(exceptId ?? ''))
      .sort((a, b) => li(a.letter) - li(b.letter));
  }

  /* ------------------------------------------------------------ Reihenfolge */
  private checkOrder(a: Action) {
    const { s, c } = this;
    if (a.kind === 'rea' || c.rea) return;
    const sc = RULES.scoring;
    if ((a.kind === 'assess' || a.kind === 'treat') && a.id !== 'sss' && !s.count.sss && !s.warned.sss) {
      s.warned.sss = true;
      this.penalty(c.sssPts ?? sc.sssPenalty, T.sss);
    }
    if (a.kind === 'ask') {
      if (RULES.freeQuestions.includes(a.id) || a.followup) return;
      const open = this.openBlocking(li('D'));
      if (open.length) s.quickAsk++;
      if (open.length && s.quickAsk > sc.quickQuestions && !s.warned.ask) {
        s.warned.ask = true;
        this.penalty(sc.askPenalty, fill(T.askEarly, { label: open[0].label, letter: open[0].letter }));
      }
      return;
    }
    const L = a.letter;
    if (!L || L === 'S') return;
    const open = this.openBlocking(li(L), a.id);
    if (open.length) {
      const p = open[0];
      const key = `blk_${a.id}_${p.id}`;
      if (!s.warned[key]) {
        s.warned[key] = true;
        this.penalty(sc.blockingPenalty, fill(T.blocking, { action: a.label, letter: L, pletter: p.letter, label: p.label }));
      }
      return;
    }
    if (a.kind === 'assess' && LETTERS.slice(1, li(L)).some((l) => !s.letters[l]) && !s.warned.skiptip) {
      s.warned.skiptip = true;
      this.addLog('info', T.skipTip);
    }
  }

  /* ------------------------------------------------------------ Aktionen */
  actionFor(id: string): Action | null {
    if (ACTIONS[id]) return ACTIONS[id];
    const f = this.c.followups?.[id];
    return f ? { id, label: f.label, kind: 'ask', group: 'Nachfragen', time: 15, followup: true } : null;
  }

  /** Aktionen eines Bereichs für das Auswahlmenü, mit freigeschalteten Nachfragen */
  sheet(kind: ActionKind) {
    const groups = ACTION_GROUPS[kind].map((g) => ({ group: g.group, items: g.items.map((it) => ACTIONS[it.id]) }));
    if (kind === 'ask' && this.s.unlocked.length) groups.unshift({ group: 'Nachfragen', items: this.s.unlocked.map((id) => this.actionFor(id)!) });
    return groups.map((g) => ({ group: g.group, items: g.items.map((a) => ({ id: a.id, label: a.label, time: a.kind === 'ask' ? 0 : a.time, done: !!this.s.count[a.id] })) }));
  }

  act(id: string) {
    if (this.s.over || this.prompt) return;
    const a = this.actionFor(id);
    if (!a) throw new Error('Unbekannte Aktion: ' + id);
    this.addLog('you', a.label);
    this.checkOrder(a);
    const go = () => {
      const quiz = this.findQuiz(a);
      const run = () => (this.useProc(a) ? this.runProc(a, () => this.perform(a)) : this.perform(a));
      if (quiz) { this.s.quizDone[quiz.idx] = true; this.runQuiz(quiz.q, run); } else run();
    };
    const mo = this.findMoment({ before: id });
    if (mo) this.showMoment(mo, go); else go();
    this.changed();
  }

  private useProc(a: Action) {
    if (!this.settings.detail || !PROCEDURES[a.id] || this.s.count[a.id]) return false;
    if (this.rea && !this.rea.st.rosc) return false;
    if (a.id === 'm_tq' && !(this.c.problems ?? []).some((p) => (p.fixedBy ?? []).includes('m_tq'))) return false;
    return true;
  }

  private findQuiz(a: Action) {
    const qs = this.c.quizzes ?? [];
    for (let i = 0; i < qs.length; i++) {
      if (this.s.quizDone[i]) continue;
      if (qs[i].on === a.id) return { idx: i, q: qs[i] };
      if (qs[i].on === 'treat' && a.kind === 'treat' && !RULES.noQuizTrigger.includes(a.id)) return { idx: i, q: qs[i] };
    }
    return null;
  }

  perform(a: Action) {
    if (this.rea && this.rea.handle(a)) { this.afterAction(a.id); return; }
    if (a.kind === 'assess') this.doAssess(a);
    else if (a.kind === 'ask') this.doAsk(a);
    else this.doTreat(a);
    this.afterAction(a.id);
  }

  markDone(a: Action) {
    this.s.count[a.id] = (this.s.count[a.id] ?? 0) + 1;
    this.s.lastAt[a.id] = this.s.time;
  }

  /* ------------------------------------------------------------ Patient */
  conscious() { return this.s.v.gcs >= 13 && !(this.rea && !this.rea.st.rosc); }
  answerer(): string | null { return variant<{ who: string }>(this.c.answerer, this.ctx)?.who ?? null; }
  showMood() { return this.conscious() && !this.c.child; }
  /** Gesichtsausdruck und Hautzeichen aus Stimmung, Bewusstsein und Vitalwerten */
  face(): FaceState {
    const v = this.s.v;
    const arrest = !!this.rea && !this.rea.st.rosc;
    const eyes = arrest || v.gcs <= 8 ? 'closed' : v.gcs < 13 ? 'half' : 'open';
    const sign = (k: 'pale' | 'sweat' | 'flushed' | 'cyanotic') => {
      const cond = this.c.look.signs?.[k];
      return !!cond && test(cond, this.ctx);
    };
    return {
      mood: eyes === 'open' ? this.s.mood : null,
      eyes,
      pale: arrest || v.sys < 90 || sign('pale'),
      cyanotic: arrest || v.spo2 < 88 || sign('cyanotic'),
      flushed: !arrest && (v.temp >= 39 || sign('flushed')),
      sweat: !arrest && sign('sweat'),
    };
  }
  moodChange(d: number) {
    if (!d) return;
    this.s.mood = clamp(this.s.mood + d, 0, 10);
    if (d < 0 && this.c.moodDrop) mutate(this.s, this.c.moodDrop);
  }
  finding(id: string): string | undefined {
    const f = this.c.findings?.[id];
    if (f == null) return undefined;
    const text = typeof f === 'string' ? f : variant(f, this.ctx)?.text;
    return text == null ? undefined : fill(text, { gcs: this.s.v.gcs });
  }

  /* ------------------------------------------------------------ Untersuchen */
  private doAssess(a: Action) {
    const { s } = this;
    this.markDone(a);
    if (a.letter && a.letter !== 'S') s.letters[a.letter] = true;
    const v = s.v;
    const extra = this.finding(a.id);
    const DEF = RULES.findings as Record<string, string>;
    let base: string;
    switch (a.id) {
      case 'ansprechen': base = extra ?? T.ansprechenDefault; break;
      case 'b_af': s.afShown = Math.round(v.af); base = `AF ${s.afShown}/min. ` + (extra ?? 'Atmung unauffällig.'); break;
      case 'b_spo2': s.attached.spo2 = true; base = `SpO₂ ${Math.round(v.spo2)} %. ` + (extra ?? ''); break;
      case 'c_puls': base = `Puls ${Math.round(v.hr)}/min. ` + (extra ?? DEF.c_puls); break;
      case 'c_rr': s.nibp = { sys: Math.round(v.sys), dia: Math.round(v.dia) }; base = `RR ${s.nibp.sys}/${s.nibp.dia} mmHg. ` + (extra ?? ''); break;
      case 'c_ekg': s.attached.ekg = true; base = 'EKG läuft. ' + (extra ?? ''); break;
      case 'd_gcs': s.measured.gcs = v.gcs; base = extra ?? `GCS ${v.gcs}.`; break;
      case 'd_bz': {
        const bz = Math.round(v.bz);
        s.measured.bz = bz;
        base = `BZ ${bz} mg/dl (${(bz / 18).toFixed(1).replace('.', ',')} mmol/l). ` + (extra ?? '');
        break;
      }
      case 'e_temp': s.measured.temp = v.temp.toFixed(1).replace('.', ','); base = `Temperatur ${s.measured.temp} °C. ` + (extra ?? ''); break;
      default: base = extra ?? DEF[a.id] ?? T.unremarkable;
    }
    this.addLog('find', base.trim(), 'Befund');
    this.advance(a.time);
    if (a.id === 'c_ekg' && !s.flags.rhythmQuiz) {
      s.flags.rhythmQuiz = true;
      const k = this.currentRhythm();
      this.rhythmQuiz(k, { pulseKnown: true }, (ok, help) => {
        this.reward(ok ? (help ? 1 : 3) : 0, 3, `Rhythmus richtig erkannt: ${ECG.rhythms[k].name}`);
        if (!ok) this.addLog('info', `Richtig wäre gewesen: ${ECG.rhythms[k].name}.`);
      });
    }
  }

  /* ------------------------------------------------------------ Fragen */
  private doAsk(a: Action) {
    const { s, c } = this;
    const who = this.answerer();
    const name = who ?? c.name;
    const ptTalks = !who && this.conscious();
    if (a.id === 'q_hallo') {
      this.markDone(a);
      const text = this.rea && !this.rea.st.rosc ? T.noReaction : who ? fill(T.introBystander, { name: c.name }) : this.conscious() ? `„${c.name}.“` : T.noAnswerConfused;
      this.addLog('pt', text, name);
      if (s.count.q_hallo === 1) this.moodChange(1);
      this.advance(10);
      return;
    }
    if (a.id === 'q_erkl') {
      this.markDone(a);
      this.addLog('pt', ptTalks ? (s.mood >= 4 ? T.explainPatientGood : T.explainPatientMeh) : who ? T.explainBystander : T.noReaction, name);
      this.moodChange(1);
      this.advance(10);
      return;
    }
    if (ptTalks && s.mood <= 1 && !c.child) {
      this.addLog('pt', T.moodBlock, name);
      if (!s.warned.moodtip) { s.warned.moodtip = true; this.addLog('info', T.moodTip); }
      this.advance(10);
      return;
    }
    this.markDone(a);
    const raw = a.followup ? c.followups![a.id].ans : c.answers?.[a.id];
    let text = typeof raw === 'object' && raw ? (who ? raw.by : raw.pt) : raw;
    if (!text) text = who ? T.noAnswerBystander : s.v.gcs < 13 ? T.noAnswerConfused : T.noAnswerPatient;
    if (ptTalks && s.mood <= 3 && !a.followup && Math.random() < 0.5) text = T.annoyed + text;
    this.addLog('pt', text, name);
    for (const [fid, f] of Object.entries(c.followups ?? {})) {
      if (f.after === a.id && !s.unlocked.includes(fid)) { s.unlocked.push(fid); this.addLog('info', fill(T.newFollowup, { label: f.label })); }
    }
    this.advance(a.time);
  }

  /* ------------------------------------------------------------ Maßnahmen */
  effect(id: string): TreatEffect {
    const e = variant(this.c.effects?.[id], this.ctx);
    if (e) {
      const pen = e.penalties?.find((p) => test(p.if, this.ctx));
      return pen ? { ...e, pts: pen.pts, why: pen.why } : e;
    }
    return (RULES.wrongTreatments as Record<string, TreatEffect>)[id] ?? {};
  }

  private doTreat(a: Action) {
    const { s } = this;
    const e = this.effect(a.id);
    if (e.needs && !e.needs.some((id) => s.count[id])) {
      this.addLog('info', '🤔 ' + e.needText);
      this.advance(5);
      return;
    }
    const first = !s.count[a.id];
    if (!first && !RULES.repeatable.includes(a.id) && !e.repeat) { this.addLog('info', T.alreadyDone); return; }
    if (!e.noCount) {
      this.markDone(a);
      if (a.letter && a.letter !== 'S') s.letters[a.letter] = true;
    }
    const bad = (e.pts ?? 0) < 0;
    const text = e.text ?? (RULES.treatments as Record<string, string>)[a.id] ?? T.doneDefault;
    if (!(bad && !e.text)) this.addLog('find', text, 'Ergebnis');
    if (bad && first) this.penalty(-e.pts!, e.why ?? T.wrongDefault);
    else if (bad) this.addLog('info', e.why ?? '');
    mutate(s, e);
    const fixes = new Set(e.fix ?? []);
    if (!bad && !e.noCount) for (const p of this.c.problems ?? []) if ((p.fixedBy ?? []).includes(a.id) && this.active(p.activeIf)) fixes.add(p.id);
    for (const pid of fixes) s.fixed[pid] = true;
    if (a.id === 'm_defi_kleben') s.attached.ekg = true;
    if (a.id === 'm_nef') s.flags.nefAt = s.time;
    if (a.id === 'm_betreuung') this.moodChange(2);
    if (bad && first && this.conscious()) this.moodChange(-1);
    this.clampVitals();
    this.advance(a.time);
  }

  /* ------------------------------------------------------------ Monitor */
  currentRhythm() { return this.rea ? this.rea.st.monRhythm : this.s.v.rhythm; }

  /** Was Monitor und Vitalwerte anzeigen */
  monitor() {
    const { s } = this;
    const key = this.currentRhythm();
    const r = ECG.rhythms[key];
    const pulse = r.pulse && (!this.rea || this.rea.st.rosc);
    const continuous = r.pattern.type === 'continuous';
    const on = s.attached.ekg || s.attached.spo2;
    const hr = !on ? '--' : pulse ? String(Math.round(s.v.hr)) : s.attached.ekg ? (continuous ? '---' : String(r.monitorRate ?? Math.round(s.v.hr))) : '--';
    const mini: [string, string][] = [];
    if (s.measured.bz != null) mini.push(['BZ', String(s.measured.bz)]);
    if (s.measured.temp != null) mini.push(['T', `${s.measured.temp} °C`]);
    if (s.measured.gcs != null) mini.push(['GCS', String(s.measured.gcs)]);
    if (this.rea) mini.push(...this.rea.mini());
    return {
      rhythm: on ? key : null,
      rate: pulse && !continuous ? Math.round(s.v.hr) : undefined,
      showEcg: s.attached.ekg,
      showPleth: s.attached.spo2,
      cpr: !!(this.rea && this.rea.st.hdm && !this.rea.st.rosc && !this.rea.st.paused),
      hr,
      spo2: s.attached.spo2 && pulse ? String(Math.round(s.v.spo2)) : '--',
      nibp: s.nibp ? `${s.nibp.sys}/${s.nibp.dia}` : '--/--',
      af: s.afShown != null ? String(s.afShown) : '--',
      mini,
    };
  }

  /* ------------------------------------------------------------ Dialoge */
  private open(p: Prompt, ctl: PromptCtl) { this.prompt = p; this.ctl = ctl; }
  private closePrompt() {
    const next = this.ctl?.next;
    this.prompt = null; this.ctl = null; this.proc = null;
    if (next) next(); else this.afterAction('__none');
  }

  /** Antwort auf den offenen Dialog (Index in den angezeigten Auswahlmöglichkeiten) */
  choose(i: number) {
    const p = this.prompt;
    if (!p || !this.ctl) return;
    if (p.kind === 'proc') { this.proc!.refusalPick(i); this.changed(); return; }
    if (p.kind === 'order' || ('answered' in p && p.answered)) return;
    if ('answered' in p) p.answered = true;
    this.ctl.onAnswer?.(this.ctl.keys[i]);
    this.changed();
  }
  /** „Weiter“ im Dialog */
  next() {
    if (!this.prompt) return;
    this.closePrompt();
    this.changed();
  }

  /* Quiz */
  runQuiz(q: Quiz, next: () => void, opt: { kicker?: string; label?: string; pts?: number; onRight?: () => void } = {}) {
    if (q.type === 'order') {
      this.open({ kind: 'order', title: q.q, items: shuffle(q.items), picked: [] }, { keys: [], next, quiz: q });
      return;
    }
    const pts = opt.pts ?? 5;
    const order = shuffle(q.options.map((_, i) => i));
    const p: Prompt = { kind: 'mc', kicker: opt.kicker ?? 'Quiz', title: q.q, choices: order.map((i) => ({ label: q.options[i] })), answered: false, cont: 'Weiter' };
    this.open(p, {
      keys: order, next, quiz: q,
      onAnswer: (k) => {
        const ok = k === q.answer;
        const label = opt.label ?? `Quiz: ${q.q}`;
        markChoices(p.choices, order, k, q.answer);
        this.reward(ok ? pts : 0, pts, label);
        if (ok) opt.onRight?.();
        if (!ok) this.addEvent(0, 0, `Falsch beantwortet: ${q.q}`, q.options[q.answer], 'miss');
        p.explain = q.explain;
      },
    });
  }
  orderPick(item: string) {
    const p = this.prompt;
    if (p?.kind !== 'order' || p.result || p.picked.includes(item)) return;
    p.picked.push(item);
    this.changed();
  }
  orderReset() {
    const p = this.prompt;
    if (p?.kind !== 'order' || p.result) return;
    p.picked = [];
    this.changed();
  }
  orderCheck() {
    const p = this.prompt;
    const q = this.ctl?.quiz;
    if (p?.kind !== 'order' || p.result || q?.type !== 'order' || p.picked.length !== q.items.length) return;
    p.result = p.picked.map((item, i) => ({ item, ok: q.items[i] === item, right: q.items[i] }));
    const right = p.result.filter((r) => r.ok).length;
    this.reward(Math.round((5 * right) / q.items.length), 5, `Reihenfolge-Quiz: ${right} von ${q.items.length} richtig`);
    if (right < q.items.length) this.addEvent(0, 0, `Reihenfolge: ${q.q}`, q.items.map((t, i) => `${i + 1}. ${t}`).join(' · '), 'miss');
    this.changed();
  }

  /* Gesprächsmomente */
  private findMoment(trig: { before?: string; after?: string; tick?: boolean }): Moment | null {
    for (const m of this.moments) {
      if (this.s.momentDone[m.id]) continue;
      if (trig.before && m.before === trig.before) return m;
      if (trig.after && m.after?.includes(trig.after)) return m;
      if (trig.tick) {
        if (m.at != null && this.s.time >= m.at && !m.after && !m.before) return m;
        if (m.if && test(m.if, this.ctx)) return m;
      }
    }
    return null;
  }
  afterAction(id: string) {
    if (this.prompt) return;
    const m = this.findMoment({ after: id }) ?? this.findMoment({ tick: true });
    if (m) this.showMoment(m);
  }
  private showMoment(m: Moment, next?: () => void) {
    this.s.momentDone[m.id] = true;
    this.addLog('moment', m.say, m.who);
    const order = shuffle(m.options.map((_, i) => i));
    const p: Prompt = { kind: 'moment', who: m.who, say: m.say, choices: order.map((i) => ({ label: m.options[i].t })), answered: false };
    this.open(p, {
      keys: order, next, moment: m,
      onAnswer: (k) => {
        const o = m.options[k as number];
        const best = m.options.reduce((mx, x) => Math.max(mx, x.pts ?? 0), 0);
        const pts = o.pts ?? 0;
        p.choices[order.indexOf(k as number)].state = pts >= best && pts > 0 ? 'right' : pts < 0 ? 'wrong' : 'neutral';
        // Bei einer schwächeren Wahl die beste Antwort zeigen
        if (pts < best) p.choices[order.indexOf(m.options.findIndex((x) => (x.pts ?? 0) === best))].state = 'right';
        this.addLog('you', o.t);
        if ((o.pts ?? 0) > 0) this.reward(o.pts!, best, 'Gut reagiert: ' + m.who);
        else {
          this.addEvent(0, best, 'Gesprächsmoment: ' + m.who, undefined, 'none');
          if ((o.pts ?? 0) < 0) this.penalty(-o.pts!, o.why ?? 'Ungünstige Reaktion.');
        }
        this.moodChange(o.mood ?? 0);
        if (o.delta) { mutate(this.s, { delta: o.delta }); this.clampVitals(); }
        if (o.reply) this.addLog('pt', o.reply, m.who);
        p.reply = o.reply;
        p.why = pts >= best ? undefined : o.why;
      },
    });
  }

  /* Maßnahmen: abwechselnd Schritt für Schritt, einfach klappen, eine Frage oder Elektroden kleben */
  private procMode(id: string): ProcMode {
    if (this.forceProcMode) return this.forceProcMode;
    const P = PROCEDURES[id];
    const mem = procMemory.get(id);
    const w = { ...RULES.procedure.modes, ...(P.modes ?? {}) } as Record<ProcMode, number>;
    const usable: Record<ProcMode, boolean> = {
      steps: P.steps.length > 0,
      quick: true,
      question: this.openQuestions(id).length > 0,
      place: !!P.place,
      gauge: !!P.gauge,
      iv: !!P.iv,
    };
    let modes = (Object.keys(w) as ProcMode[]).filter((m) => w[m] > 0 && usable[m]);
    // Nicht zweimal hintereinander gleich: weder im Einsatz noch bei dieser Maßnahme seit dem letzten Mal
    for (const avoid of [this.lastProcMode, mem.lastMode]) if (modes.length > 1 && avoid) modes = modes.filter((m) => m !== avoid);
    if (!modes.length) return 'quick';
    let r = Math.random() * modes.reduce((t, m) => t + w[m], 0);
    for (const m of modes) { r -= w[m]; if (r < 0) return m; }
    return modes[modes.length - 1];
  }
  /** Kurzfragen, die weder in diesem Einsatz kamen noch schon einmal richtig beantwortet wurden */
  private openQuestions(id: string) {
    const asked = this.askedProcQ[id] ?? [];
    const right = procMemory.get(id).right;
    return (PROCEDURES[id].questions ?? []).map((_, k) => k).filter((k) => !asked.includes(k) && !right.includes(k));
  }

  private runProc(a: Action, next: () => void) {
    const P = PROCEDURES[a.id];
    const PT = RULES.procedure;
    const mode = this.procMode(a.id);
    this.lastProcMode = mode;
    procMemory.get(a.id).lastMode = mode;
    procMemory.save();
    if (mode === 'quick') {
      this.addLog('info', fill(P.quick ?? PT.quickDefault, { title: P.title }));
      next();
    } else if (mode === 'question') {
      const asked = (this.askedProcQ[a.id] ??= []);
      const i = pick(this.openQuestions(a.id));
      asked.push(i);
      const q = P.questions![i];
      this.runQuiz({ on: a.id, type: 'mc', ...q }, next, {
        onRight: () => { procMemory.get(a.id).right.push(i); procMemory.save(); }, kicker: fill(PT.questionKicker, { title: P.title }), label: fill(PT.questionRight, { title: P.title }), pts: PT.questionPts });
    } else if (mode === 'place') {
      const v = pick(P.place!.variants);
      this.open(
        { kind: 'place', title: P.title, task: P.place!.task, view: (P.place!.view ?? [0, 0, 200, 260]).join(' '), variant: v.name, electrodes: v.electrodes.map(({ id, label, color }) => ({ id, label, color })), pos: {} },
        { keys: [], next, targets: v.electrodes },
      );
    } else if (mode === 'iv') {
      this.open({ kind: 'iv', title: P.title, cfg: P.iv! }, { keys: [], next });
    } else if (mode === 'gauge') {
      const v = this.s.v;
      this.open({ kind: 'gauge', title: P.title, cfg: P.gauge!, hr: Math.round(v.hr), sys: Math.round(v.sys), dia: Math.round(v.dia) }, { keys: [], next });
    } else {
      this.proc = new ProcSession(this, a);
      this.open(this.proc.prompt, { keys: [], next });
    }
  }
  /** Übungsmodus: eine Maßnahme direkt in einem festen Modus starten */
  practice(id: string, mode: ProcMode, done: () => void) {
    const a = this.actionFor(id);
    if (!a || this.prompt) return;
    this.forceProcMode = mode;
    this.runProc(a, done);
    this.changed();
  }
  procPick(stepId: string) {
    if (this.prompt?.kind !== 'proc' || !this.proc) return;
    this.proc.pick(stepId);
    this.changed();
  }
  /** Elektrode auf die Figur setzen (Figur-Koordinaten) */
  placeSet(id: string, x: number, y: number) {
    const p = this.prompt;
    if (p?.kind !== 'place' || p.result || !p.electrodes.some((e) => e.id === id)) return;
    p.pos[id] = { x, y };
    this.changed();
  }
  /** Ergebnis des Blutdruck-Minispiels: abgelesene Werte, höchster Druck, mittlere Ablassgeschwindigkeit */
  gaugeDone(read: { sys: number; dia: number; maxP: number; rate: number }) {
    const p = this.prompt;
    if (p?.kind !== 'gauge' || p.result) return;
    const g = p.cfg;
    const sysOk = Math.abs(read.sys - p.sys) <= g.tolerance;
    const diaOk = Math.abs(read.dia - p.dia) <= g.tolerance;
    const low = read.maxP < p.sys + g.pumpAbove;
    const fast = read.rate > g.maxRate;
    const lines = [
      { ok: sysOk, text: fill(g.texts.sys, { read: Math.round(read.sys), true: p.sys }) },
      { ok: diaOk, text: fill(g.texts.dia, { read: Math.round(read.dia), true: p.dia }) },
    ];
    if (low) lines.push({ ok: false, text: g.texts.low });
    if (fast) lines.push({ ok: false, text: fill(g.texts.fast, { rate: read.rate.toFixed(1).replace('.', ',') }) });
    if (!low && !fast) lines.push({ ok: true, text: g.texts.good });
    p.result = { lines };
    const right = +sysOk + +diaOk;
    const max = 2 * g.pts.value + g.pts.technique;
    this.reward(right * g.pts.value + (!low && !fast ? g.pts.technique : 0), max, fill(g.texts.score, { right }));
    const wrong = lines.filter((l) => !l.ok);
    if (wrong.length) this.addEvent(0, 0, p.title + ': manuell ungenau', wrong.map((l) => l.text).join(' '), 'miss');
    this.changed();
  }
  /** Ergebnis des i.v.-Minispiels bewerten */
  ivDone(r: IvRun) {
    const p = this.prompt;
    if (p?.kind !== 'iv' || p.result) return;
    const { pts: P, texts: T2, angle: [lo, hi], order } = p.cfg;
    const vein = p.cfg.veins.find((v) => v.id === r.vein);
    const hygiene = !r.early && !r.retouched;
    const angleOk = r.angle >= lo && r.angle <= hi;
    const orderOk = r.order.length === order.length && r.order.every((x, i) => x === order[i]);
    const lines: { ok: boolean; text: string; pts: number }[] = [
      { ok: r.stauOk, text: r.stauOk ? T2.stauOk : T2.stauBad, pts: r.stauOk ? P.stau : 0 },
      { ok: vein?.quality === 'good', text: `${vein?.label ?? '?'}: ${vein?.why ?? ''}`, pts: vein?.quality === 'good' ? P.vein : vein?.quality === 'ok' ? Math.ceil(P.vein / 2) : 0 },
      ...(r.early ? [{ ok: false, text: T2.early, pts: 0 }] : []),
      ...(r.retouched ? [{ ok: false, text: T2.retouched, pts: 0 }] : []),
      ...(hygiene ? [{ ok: true, text: T2.hygieneOk, pts: P.hygiene }] : []),
      { ok: angleOk, text: fill(angleOk ? T2.angleOk : r.angle < lo ? T2.angleFlat : T2.angleSteep, { angle: r.angle }), pts: angleOk ? P.angle : 0 },
      { ok: r.hit === 'in', text: r.hit === 'in' ? T2.hitIn : r.hit === 'through' ? T2.hitThrough : T2.hitShort, pts: r.hit === 'in' ? P.hit : 0 },
    ];
    if (r.hit === 'in') lines.push({ ok: orderOk, text: orderOk ? T2.orderOk : fill(T2.orderBad, { right: order.join(' → ') }), pts: orderOk ? P.order : 0 });
    const max = Object.values(P).reduce((a, b) => a + b, 0);
    const got = lines.reduce((a, l) => a + l.pts, 0);
    p.result = { lines: lines.map(({ ok, text }) => ({ ok, text })) };
    this.reward(got, max, fill(T2.score, { pts: got, max }));
    const wrong = lines.filter((l) => !l.ok);
    if (wrong.length) this.addEvent(0, 0, p.title + ': Fehler beim Legen', wrong.map((l) => l.text).join(' '), 'miss');
    this.changed();
  }
  placeCheck() {
    const p = this.prompt;
    const targets = this.ctl?.targets;
    if (p?.kind !== 'place' || p.result || !targets || targets.some((e) => !p.pos[e.id])) return;
    const PT = RULES.procedure;
    p.result = targets.map((e) => {
      const at = p.pos[e.id];
      const ok = [e, ...(e.alt ?? [])].some((t) => Math.hypot(at.x - t.x, at.y - t.y) <= t.r);
      return { id: e.id, ok, target: { x: e.x, y: e.y, r: e.r }, where: e.where };
    });
    const right = p.result.filter((r) => r.ok).length;
    const n = targets.length;
    this.reward(Math.round((PT.placePts * right) / n), PT.placePts, fill(PT.placeScore, { title: p.title, right, n }));
    const wrong = targets.filter((_, i) => !p.result![i].ok);
    if (wrong.length) this.addEvent(0, 0, fill(PT.placeWrong, { title: p.title }), wrong.map((e) => `${e.label}: ${e.where}`).join(' · '), 'miss');
    this.changed();
  }

  /* Rhythmus erkennen */
  rhythmQuiz(key: string, opt: { rea?: boolean; pulseKnown?: boolean; rate?: number }, done: (ok: boolean, help: boolean, note: string) => void) {
    const cfg = ECG.trainer;
    const keys = opt.rea ? cfg.reaQuiz.choices : shuffle([key, ...shuffle(cfg.caseQuiz.pool.filter((k) => k !== key)).slice(0, cfg.caseQuiz.choices - 1)]);
    const label = (k: string) => (opt.rea && k === 'sinus' ? cfg.reaQuiz.roscLabel : ECG.rhythms[k].name);
    const r = ECG.rhythms[key];
    const p: Prompt = {
      kind: 'rhythm', kicker: opt.rea ? 'Rhythmusanalyse' : 'EKG', title: 'Welcher Rhythmus ist das?', rhythm: key, rate: opt.rate,
      pulseKnown: !!opt.pulseKnown, pulseText: opt.pulseKnown ? 'Puls: tastbar' : undefined,
      choices: keys.map((k) => ({ label: label(k) })), answered: false,
    };
    const organized = r.pattern.type !== 'continuous' && key !== 'pvt' && key !== 'vt';
    let note = '';
    let ok = false;
    this.open(p, {
      keys,
      onAnswer: (k) => {
        ok = k === key;
        markChoices(p.choices, keys, k, key);
        if (opt.rea && organized && !p.pulseText) note = REA.texts.organizedNoPulse;
        p.explain = (r.hint ?? r.help) + (note ? '\n' + note : '');
      },
      next: () => done(ok, !!p.help, note),
    });
  }
  rhythmPulse() {
    const p = this.prompt;
    if (p?.kind !== 'rhythm' || p.answered) return;
    p.pulseText = ECG.rhythms[p.rhythm].pulse ? 'Puls (Carotis): tastbar ✓' : 'Puls (Carotis): NICHT tastbar ✗';
    this.changed();
  }
  rhythmHelp() {
    const p = this.prompt;
    if (p?.kind !== 'rhythm' || p.answered || p.help) return;
    p.help = (this.ctl!.keys as string[]).map((k, i) => ({ label: p.choices[i].label, text: ECG.rhythms[k].hint ?? ECG.rhythms[k].help }));
    this.changed();
  }

  /** Allgemeine Auswahlfrage (Diagnose, Rea-Entscheidung) */
  ask(kicker: string, title: string, options: { key: string | number; label: string }[], onAnswer: (key: string | number, p: Extract<Prompt, { kind: 'mc' }>) => void, next: () => void, cont = 'Weiter') {
    const p: Prompt = { kind: 'mc', kicker, title, choices: options.map((o) => ({ label: o.label })), answered: false, cont };
    this.open(p, { keys: options.map((o) => o.key), onAnswer: (k) => onAnswer(k, p), next });
  }

  /* ------------------------------------------------------------ Abschluss */
  /** Diagnose-Auswahl, abhängig davon, was der Spieler herausgefunden hat */
  diagnosis(): { options: string[]; answer: number } {
    const d = this.c.diagnosis;
    return d.variants?.find((v) => test(v.if, this.ctx)) ?? d;
  }

  finish() {
    if (this.s.over || this.prompt) return;
    const d = this.diagnosis();
    const order = shuffle(d.options.map((_, i) => i));
    const more = (this.c.quizzes ?? []).some((x) => x.on === 'finish');
    this.ask('Übergabe', 'Deine Verdachtsdiagnose?', order.map((i) => ({ key: i, label: d.options[i] })), (k, p) => {
      const ok = k === d.answer;
      markChoices(p.choices, order, k, d.answer);
      this.addEvent(ok ? 10 : 0, 10, ok ? `Diagnose richtig: ${d.options[d.answer]}` : `Diagnose falsch (richtig: ${d.options[d.answer]})`, undefined, ok ? 'good' : 'miss');
      if (this.c.diagnosis.guard && test(this.c.diagnosis.guard.if, this.ctx)) this.addEvent(this.c.diagnosis.guard.pts, 0, this.c.diagnosis.guard.why, undefined, 'bad');
    }, () => this.review(), more ? 'Weiter' : 'Zur Auswertung');
    this.changed();
  }
  /** Rückblick-Quizze erst nach der Diagnose, damit sie nichts verraten */
  private review() {
    const qs = this.c.quizzes ?? [];
    const idx = qs.findIndex((x, i) => x.on === 'finish' && !this.s.quizDone[i]);
    if (idx >= 0) {
      this.s.quizDone[idx] = true;
      this.runQuiz(qs[idx], () => this.review());
      this.changed();
      return;
    }
    this.s.over = true;
    this.result = debrief(this);
    this.changed();
  }
}

/** Gewählte Antwort markieren und die richtige zeigen */
export function markChoices(choices: Choice[], keys: (string | number)[], picked: string | number, right: string | number) {
  const pi = keys.indexOf(picked);
  choices[pi].state = picked === right ? 'right' : 'wrong';
  if (picked !== right) choices[keys.indexOf(right)].state = 'right';
}
