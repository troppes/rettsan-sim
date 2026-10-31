/* Reanimation nach Schulmeinung: Ablauf als Zustandsmaschine, Texte und Pfade aus rea.json. */
import type { Action } from '../types';
import { ACTIONS, ECG, REA, RULES } from '../data';
import { fill, pick } from '../util';
import type { Game } from './game';
import type { ReaState } from './state';

const X = REA.texts;
const shockable = (k: string) => REA.shockable.includes(k);

export class Rea {
  readonly st: ReaState;

  constructor(private g: Game) {
    const path = pick(REA.paths);
    this.st = {
      path, pi: 0, bak: false, hdm: false, paused: false, defi: false, analyses: 0, shocks: 0, blocks: 0, sinceAnalysis: 0,
      ivz: false, adr: [], airway: false, lt: false, rosc: false, nefBlock: null, monRhythm: path[0], absaug: false,
      hdmBeforeDefi: null, missAirway: false,
    };
    g.s.rea = this.st;
  }

  /** Rhythmus, der jetzt anliegt. ROSC erst, wenn Adrenalin (und bei schockbar 3 Schocks) gegeben wurde. */
  private rhythm(): string {
    const R = this.st;
    let k = R.path[R.pi];
    if (k === 'rosc') {
      const ok = R.adr.length > 0 && (!R.path.some(shockable) || R.shocks >= 3);
      if (!ok) k = R.path[R.pi - 1];
    }
    return k === 'rosc' ? 'sinus' : k;
  }

  mini(): [string, string][] {
    const R = this.st;
    return [['HDM', R.hdm && !R.rosc ? 'läuft' : 'aus'], ['Schocks', String(R.shocks)], ['Blöcke', String(R.blocks)], ['Adrenalin', `${R.adr.length} mg`]];
  }

  private note(t: string) { this.g.addLog('find', t, 'Ergebnis'); }
  private warn(key: string, pts: number, text: string) {
    const s = this.g.s;
    if (s.warned[key]) return false;
    s.warned[key] = true;
    this.g.penalty(pts, text);
    return true;
  }
  private undo(id: string) { this.g.s.count[id]--; }

  /** true, wenn die Rea-Logik die Aktion übernommen hat */
  handle(a: Action): boolean {
    const { g, st: R } = this;
    const s = g.s;
    const redirect = (REA.redirects as Record<string, string>)[a.id];
    if (!R.rosc && redirect && (a.kind === 'assess' || a.kind === 'treat')) return this.handle(ACTIONS[redirect]);

    if (a.kind === 'assess' && !R.rosc) {
      if (a.id === 'sss' || a.id === 'ansprechen') return false;
      g.markDone(a);
      if (a.id === 'bak') { R.bak = true; g.addLog('find', X.bak, 'Befund'); g.advance(a.time); return true; }
      if (!this.warn('reaassess', 2, X.assessNoPriority)) g.addLog('info', X.assessNoTime);
      g.advance(5);
      return true;
    }
    if (a.kind === 'treat' && !R.rosc) {
      g.markDone(a);
      if (a.id === 'm_nef') {
        if (R.nefBlock == null) R.nefBlock = R.blocks;
        s.flags.nefAt = s.time;
        this.note(X.nef);
        g.advance(a.time);
      } else if (REA.allowedTreat.includes(a.id)) {
        this.note((RULES.treatments as Record<string, string>)[a.id]);
        g.advance(a.time);
      } else this.warn('reatreat_' + a.id, 3, fill(X.treatWrong, { action: a.label }));
      return true;
    }
    if (a.kind === 'ask' && !R.rosc) return false;
    if (a.kind !== 'rea') return false;

    g.markDone(a);
    switch (a.id) {
      case 'r_hdm':
        if (R.rosc) { g.penalty(10, X.hdmAfterRosc); return true; }
        if (!R.bak) this.warn('hdmbak', 3, X.hdmNoBak);
        if (R.hdm) { g.addLog('info', X.hdmRunning); return true; }
        R.hdm = true; R.paused = false;
        if (R.hdmBeforeDefi == null) R.hdmBeforeDefi = !R.defi;
        this.note(X.hdmStart);
        s.status = X.hdmStatus;
        break;
      case 'r_defi':
        if (R.defi) { g.addLog('info', X.defiDone); return true; }
        R.defi = true; s.attached.ekg = true;
        R.monRhythm = this.rhythm(); s.v.rhythm = R.monRhythm;
        if (R.hdmBeforeDefi == null) R.hdmBeforeDefi = false;
        if (!R.hdm) this.warn('defihdm', 2, X.defiNoHdm);
        this.note(X.defi);
        break;
      case 'r_analyse':
        if (!R.defi) { g.addLog('info', X.analysisNoDefi); this.undo(a.id); return true; }
        if (R.rosc) { g.addLog('info', X.analysisRosc); return true; }
        if (R.analyses > 0 && R.sinceAnalysis === 0) {
          if (!this.warn('analyse', 2, X.analysisTooSoon)) g.addLog('info', X.analysisWaitBlock);
          return true;
        }
        this.analysis();
        return true;
      case 'r_puls': {
        const pulse = R.rosc || (R.path[R.pi] === 'rosc' && this.rhythm() === 'sinus');
        this.note(pulse ? X.pulsePresent : X.pulseAbsent);
        if (!R.defi || ECG.rhythms[R.monRhythm].pattern.type === 'continuous') this.warn('puls', 1, X.pulseWrongTime);
        break;
      }
      case 'r_block': {
        if (!R.hdm) { g.addLog('info', X.blockNoHdm); this.undo(a.id); return true; }
        if (R.rosc) { g.penalty(10, X.blockAfterRosc); return true; }
        if (R.analyses === 0 && R.defi) this.warn('frueh', 3, X.blockEarlyAnalysis);
        R.blocks++; R.sinceAnalysis++;
        this.note(fill(X.block, { n: R.blocks }));
        g.advance(a.time);
        if (!R.airway && !R.missAirway) { R.missAirway = true; g.penalty(5, X.blockNoAirway); }
        if (R.blocks >= 2 && R.nefBlock == null) this.warn('nef', 10, X.blockNoNef);
        if (!shockable(R.monRhythm) && R.ivz && R.adr.length === 0) this.warn('adrfrueh', 3, X.blockAdrEarly);
        if (R.adr.length > 0 && R.blocks - R.adr[R.adr.length - 1] >= 3) this.warn('adrrep' + R.adr.length, 2, X.blockAdrRepeat);
        g.addLog('info', X.blockEnd);
        return true;
      }
      case 'r_bmv':
        if (R.airway) { g.addLog('info', X.bmvDone); return true; }
        R.airway = true; this.note(X.bmv);
        break;
      case 'r_lt':
        if (R.lt) { g.addLog('info', X.ltDone); return true; }
        R.airway = true; R.lt = true; this.note(X.lt);
        break;
      case 'r_ivz':
        if (R.ivz) { g.addLog('info', X.ivzDone); return true; }
        R.ivz = true; this.note(X.ivz);
        break;
      case 'r_absaug':
        R.absaug = true; this.note(X.suction);
        break;
      case 'r_adr':
        if (!R.ivz) { g.addLog('info', X.adrNoIvz); this.undo(a.id); return true; }
        if (R.rosc) { g.penalty(5, X.adrAfterRosc); return true; }
        if (shockable(R.monRhythm) && R.shocks < 3) g.penalty(5, X.adrBeforeShock3);
        else if (R.adr.length && R.blocks - R.adr[R.adr.length - 1] < 2) g.penalty(3, X.adrTooSoon);
        R.adr.push(R.blocks);
        this.note(X.adr);
        break;
      default:
        return false;
    }
    g.advance(a.time);
    return true;
  }

  private analysis() {
    const { g, st: R } = this;
    R.paused = true;
    const k = this.rhythm();
    R.monRhythm = k; g.s.v.rhythm = k;
    g.advance(8);
    const isRosc = R.path[R.pi] === 'rosc' && k === 'sinus';
    const rate = (REA.analysisRates as Record<string, number>)[k];
    g.rhythmQuiz(k, { rea: true, rate }, (ok, help) => {
      const name = ECG.rhythms[k].name;
      g.reward(ok ? (help ? 1 : 3) : 0, 3, `Rhythmus erkannt: ${name}`);
      if (!ok) g.addEvent(0, 0, `Rhythmus nicht erkannt (${name})`, ECG.rhythms[k].hint ?? ECG.rhythms[k].help, 'miss');
      this.decision(k, isRosc);
    });
  }

  private decision(k: string, isRosc: boolean) {
    const { g, st: R } = this;
    const D = REA.decision;
    const opts = D.options.map((o) => ({ key: o.id, label: o.label }));
    const shock = shockable(k);
    const right = isRosc ? 'rosc' : shock ? 'shock' : 'noshock';
    g.ask('Entscheidung', 'Was machst du jetzt?', opts, (d, p) => {
      const ok = d === right;
      p.choices[opts.findIndex((o) => o.key === d)].state = ok ? 'right' : 'wrong';
      const msg = isRosc ? (ok ? D.rosc.ok : d === 'shock' ? D.rosc.shock : D.rosc.other)
        : shock ? (ok ? D.shockable.ok : D.shockable.wrong)
        : ok ? D.nonShockable.ok : d === 'shock' ? D.nonShockable.shock : D.nonShockable.rosc;
      if (ok) g.reward(D.pts, D.pts, 'Richtige Entscheidung nach der Analyse');
      else { g.addEvent(0, D.pts, 'Falsche Entscheidung nach der Analyse'); g.penalty(D.penalty, msg); }
      p.explain = msg;
      R.analyses++; R.sinceAnalysis = 0;
      if (d === 'shock') R.shocks++;
      if (isRosc && ok) {
        R.rosc = true; R.hdm = false; R.paused = false;
        Object.assign(g.s.v, REA.rosc.vitals);
        R.monRhythm = REA.rosc.vitals.rhythm;
        g.s.status = REA.rosc.status;
        g.s.attached.spo2 = true;
        g.addLog('good', REA.rosc.log);
      } else if (!isRosc) {
        if ((!shock || d === 'shock') && R.pi < R.path.length - 1) R.pi++;
        R.paused = false;
        R.monRhythm = this.rhythm();
        g.s.v.rhythm = R.monRhythm;
      }
    }, () => g.afterAction('__none'));
  }

  required() {
    const R = this.st, s = this.g.s;
    const checks: Record<string, boolean> = {
      bak: R.bak, hdm: R.hdm || R.rosc, hdmBeforeDefi: R.hdmBeforeDefi === true, defi: R.defi,
      nefInTime: R.nefBlock != null && R.nefBlock < 2, airway: R.airway, ivz: R.ivz, adrenalin: R.adr.length > 0,
      rosc: R.rosc, twelveLead: R.rosc && !!s.count.c_12, suction: R.absaug || !!s.count.m_absaug,
    };
    return REA.required.map(({ check, ...r }) => ({ ...r, ok: checks[check] }));
  }
}
