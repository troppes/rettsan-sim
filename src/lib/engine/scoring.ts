/* Auswertung am Ende des Einsatzes. */
import { ECG, RULES } from '../data';
import { test } from './conditions';
import type { Game } from './game';
import type { FaceState, ScoreEvent } from './state';
import type { Look } from '../types';

export interface Check { ok: boolean; pts: number; label: string; why: string }

export interface Debrief {
  caseId: string;
  title: string;
  person: string;
  solution: string;
  /** Was in diesem Einsatz anders war (Fallvariante) */
  variant?: string;
  reaPath?: string;
  pct: number;
  score: number;
  max: number;
  grade: { label: string; tone: string };
  minutes: number;
  /** Gesicht am Ende (nur bei ansprechbaren Erwachsenen) */
  face?: { look: Look; state: FaceState };
  done: Check[];
  missed: Check[];
  bad: ScoreEvent[];
  good: ScoreEvent[];
  miss: ScoreEvent[];
  schul: ScoreEvent[];
  teach: string[];
  /** Datensatz zum Speichern im Konto */
  record: {
    fall: string; meldung: string; prozent: number; punkte: number; max_punkte: number; dauer_s: number;
    diagnose_richtig: boolean; detail: boolean; fehler: string[]; vergessen: string[];
  };
}

export function debrief(g: Game): Debrief {
  const { c, s } = g;
  const sc = RULES.scoring;
  let req: Check[];
  if (g.rea) req = g.rea.required();
  else {
    req = (c.required ?? []).map((r) => {
      let ok = true;
      if (r.any) ok = r.any.some((id) => s.count[id]);
      if (r.all) ok = ok && r.all.every((id) => s.count[id]);
      if (r.if) ok = ok && test(r.if, g.ctx);
      return { ok, pts: r.pts, label: r.label, why: r.why };
    });
    req.push({ ok: !!s.count.q_hallo && (s.lastAt.q_hallo ?? 0) < sc.introWithin, pts: sc.introPts, label: RULES.texts.introRequired, why: RULES.texts.introWhy });
  }
  const reqPts = req.reduce((t, r) => t + (r.ok ? r.pts : 0), 0);
  const reqMax = req.reduce((t, r) => t + r.pts, 0);
  const evPts = s.events.reduce((t, e) => t + e.pts, 0);
  const evMax = s.events.reduce((t, e) => t + (e.max || 0), 0);
  const score = Math.max(0, reqPts + evPts);
  const max = reqMax + evMax;
  const pct = max ? Math.round((100 * score) / max) : 0;
  const grade = sc.grades.find((x) => pct >= x.min)!;
  const missed = req.filter((r) => !r.ok);
  const bad = s.events.filter((e) => e.type === 'bad');
  const d = g.diagnosis();
  return {
    caseId: c.id,
    title: s.dispatch.short,
    person: c.person,
    solution: d.options[d.answer],
    variant: g.c.variantNote,
    reaPath: s.rea ? s.rea.path.map((k) => (k === 'rosc' ? 'ROSC' : ECG.rhythms[k].name.split(' (')[0])).join(' → ') : undefined,
    pct, score, max,
    grade: { label: grade.label, tone: grade.tone },
    minutes: Math.floor(s.time / 60),
    face: c.rea || c.child ? undefined : { look: c.look, state: g.face() },
    done: req.filter((r) => r.ok),
    missed,
    bad,
    good: s.events.filter((e) => e.type === 'good' && e.pts > 0),
    miss: s.events.filter((e) => e.type === 'miss'),
    schul: s.events.filter((e) => e.type === 'schul'),
    teach: c.teach,
    record: {
      fall: c.id, meldung: s.dispatch.short, prozent: pct, punkte: score, max_punkte: max, dauer_s: Math.round(s.time),
      diagnose_richtig: s.events.some((e) => e.text.startsWith('Diagnose richtig')), detail: g.settings.detail,
      fehler: bad.map((e) => e.text), vergessen: missed.map((r) => r.label),
    },
  };
}
