/* Maßnahme Schritt für Schritt: Der Spieler tippt die Schritte in seiner Reihenfolge an,
   der Patient reagiert je nach Aufklärung, Stimmung und Schmerz. */
import type { Action, Procedure, ProcStep } from '../types';
import { EXPLAIN_WHY, PROCEDURES, RULES } from '../data';
import { fill, shuffle } from '../util';
import type { Game } from './game';
import type { Prompt } from './state';

const T = RULES.procedure;
type ProcPrompt = Extract<Prompt, { kind: 'proc' }>;

export class ProcSession {
  readonly prompt: ProcPrompt;
  private readonly P: Procedure;
  private readonly awake: boolean;
  private readonly done: Record<string, boolean> = {};
  private explained = false;
  private consent: boolean;
  private refusalFor: ProcStep | null = null;
  private refusalOpts = shuffle(T.refusalOptions);

  constructor(private g: Game, private a: Action) {
    this.P = PROCEDURES[a.id];
    this.awake = g.conscious();
    this.consent = !!g.s.flags.consent;
    this.prompt = { kind: 'proc', title: this.P.title, done: [], steps: shuffle(this.P.steps), finished: false };
    this.refresh();
  }

  private get c() { return this.g.c; }
  private get who() {
    const by = this.g.answerer();
    return this.c.child ? 'Mutter' : by && !this.awake ? by : this.c.name;
  }
  private say(text: string, who = this.who) {
    this.prompt.react = { who, text };
    this.g.addLog('pt', text, who);
  }
  private refresh() {
    this.prompt.steps = this.prompt.steps.filter((st) => !this.done[st.id]);
    this.prompt.refusal = this.refusalFor ? this.refusalOpts.map((o) => ({ label: o.t })) : undefined;
  }
  private add(st: ProcStep, label = st.label, bad = false) {
    this.done[st.id] = true;
    this.prompt.done.push({ label, bad });
  }

  pick(id: string) {
    const st = this.P.steps.find((x) => x.id === id);
    if (!st || this.done[id] || this.prompt.finished || this.refusalFor) return;
    const { g, c } = this;
    const s = g.s;
    if (st.wrong) {
      this.add(st, st.label, true);
      g.warnOnce(this.a.id + st.id, 2, st.wrong);
      return this.refresh();
    }
    const missing = (st.needs ?? []).filter((n) => !this.done[n]);
    if (missing.length) {
      const names = missing.map((n) => this.P.steps.find((x) => x.id === n)!.label).join(', ');
      g.warnOnce(this.a.id + st.id + 'need', 1, fill(T.orderHint, { step: st.label, missing: names }));
      return;
    }
    if (st.id === 'erklaeren') {
      this.explained = true;
      this.add(st);
      g.addLog('you', st.say ?? st.label);
      if (g.rea && !g.rea.st.rosc) this.say(RULES.texts.noReaction);
      else if (!this.awake && !c.child) this.say(T.unconscious, 'Patient');
      else if (c.child) this.say(T.childExplain, 'Mutter');
      else {
        g.moodChange(1);
        if (c.nonverbal) this.say(s.mood >= 4 ? T.nodNonverbal : T.refuseNonverbal);
        else this.say(s.mood >= 6 ? T.consentGood : s.mood >= 4 ? T.consentMeh : T.consentNo);
        if (s.mood >= 4) this.consent = s.flags.consent = true;
      }
      return this.refresh();
    }
    if (st.invasive && this.awake && !c.child) {
      if (!this.explained && !s.flags['expl_' + this.a.id]) {
        s.flags['expl_' + this.a.id] = true;
        g.warnOnce('explain', 2, EXPLAIN_WHY);
        g.moodChange(-2);
        this.say(c.react?.[this.a.id + '.noexplain'] ?? (st.hurt ? T.noExplainHurt : T.noExplain));
      } else if (s.mood <= 2 && !this.consent) {
        this.refusalFor = st;
        this.say(c.nonverbal ? T.refusalNonverbal : T.refusal);
        return this.refresh();
      }
    }
    this.add(st);
    const key = `${this.a.id}.${st.id}`;
    const react = c.react?.[key + (this.explained ? '.explained' : '')] ?? c.react?.[key];
    if (react) this.say(react);
    else if (st.hurt && this.awake && this.explained && !c.child) this.say(c.nonverbal ? T.hurtNonverbal : s.mood >= 5 ? T.hurtOk : T.hurt);
    else if (st.hurt && c.child) this.say(T.hurtChild, 'Mutter');
    if (st.final) return this.finish();
    this.refresh();
  }

  /** Auswahl bei Ablehnung durch den Patienten */
  refusalPick(i: number) {
    const st = this.refusalFor;
    if (!st) return;
    const o = this.refusalOpts[i];
    const { g } = this;
    this.refusalFor = null;
    if (o.ok) {
      g.moodChange(o.mood ?? 0);
      this.consent = g.s.flags.consent = true;
      this.say(o.reply!);
      g.reward(2, 2, 'Ablehnung respektvoll gelöst');
      return this.refresh();
    }
    g.penalty(10, T.againstWill);
    g.moodChange(-3);
    this.consent = true;
    this.add(st, st.label + ' (gegen ihren Willen)', true);
    this.say(T.againstWillSay);
    if (st.final) return this.finish();
    this.refresh();
  }

  private finish() {
    const { g, P } = this;
    const skipped = P.steps.filter((x) => !x.wrong && !x.final && !this.done[x.id] && !(x.id === 'erklaeren' && (!this.awake || this.c.rea)));
    if (skipped.length) g.warnOnce(this.a.id + 'skip', Math.min(3, skipped.length), fill(T.forgot, { title: P.title, steps: skipped.map((x) => x.label).join(', ') }));
    else if (!this.prompt.done.some((x) => x.bad)) g.reward(2, 2, fill(T.clean, { title: P.title }));
    else g.addEvent(0, 2, fill(T.withErrors, { title: P.title }), undefined, 'none');
    this.prompt.finished = true;
    this.prompt.steps = [];
    this.prompt.refusal = undefined;
  }
}
