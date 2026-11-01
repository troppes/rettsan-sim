/* Fallvarianten auslosen und anwenden, dazu leichte Streuung der Startwerte.
   Die Engine selbst bleibt deterministisch: Zufall passiert nur hier, beim Start eines Einsatzes. */
import type { CaseDef, CaseVariant, VitalKey } from '../types';

/** Variante auf den Fall anwenden (ohne Variante: Fall unverändert) */
export function applyVariant(c: CaseDef, v: CaseVariant | null): CaseDef {
  if (!v) return c;
  const merge = <T>(a: Record<string, T> | undefined, b: Record<string, T> | undefined) => (b ? { ...(a ?? {}), ...b } : a);
  const problems = v.problems ? [...(c.problems ?? []).filter((p) => !v.problems!.some((q) => q.id === p.id)), ...v.problems] : c.problems;
  return {
    ...c,
    start: { ...c.start, ...v.start },
    look: { ...c.look, ...v.look },
    dispatches: v.dispatches ?? c.dispatches,
    findings: merge(c.findings, v.findings),
    answers: merge(c.answers, v.answers),
    followups: merge(c.followups, v.followups),
    effects: merge(c.effects, v.effects),
    react: merge(c.react, v.react),
    problems,
    rules: [...(c.rules ?? []), ...(v.rules ?? [])],
    moments: [...(c.moments ?? []), ...(v.moments ?? [])],
    quizzes: [...(c.quizzes ?? []), ...(v.quizzes ?? [])],
    required: [...(c.required ?? []).filter((r) => !(v.dropRequired ?? []).includes(r.label)), ...(v.required ?? [])],
    teach: [...(v.teach ?? []), ...c.teach],
    variantNote: v.label,
  };
}

/** Variante nach Gewicht auslosen; null = Grundversion */
export function pickVariant(c: CaseDef, rnd = Math.random): CaseVariant | null {
  const vs = c.variants ?? [];
  if (!vs.length) return null;
  const total = (c.baseWeight ?? 1) + vs.reduce((t, v) => t + (v.weight ?? 1), 0);
  let r = rnd() * total - (c.baseWeight ?? 1);
  if (r < 0) return null;
  for (const v of vs) { r -= v.weight ?? 1; if (r < 0) return v; }
  return vs[vs.length - 1];
}

/** Kleine Streuung der Startwerte, damit kein Einsatz exakt gleich aussieht.
    Bleibt klein genug, um keine Grenzwerte der Fälle (z. B. HF 140, SpO₂ 90) zu überschreiten. */
const JITTER: Partial<Record<VitalKey, number>> = { hr: 5, sys: 8, dia: 5, af: 2, bz: 8 };
export function jitter(c: CaseDef, rnd = Math.random): CaseDef {
  if (c.rea) return c;
  const st = { ...c.start };
  for (const [k, d] of Object.entries(JITTER) as [VitalKey, number][]) {
    const v = st[k] as number;
    if (typeof v === 'number' && v > 0) (st[k] as number) = Math.max(1, Math.round(v + (rnd() * 2 - 1) * d));
  }
  if (st.dia >= st.sys - 15) st.dia = st.sys - 15;
  return { ...c, start: st };
}

/** Harmlose, aber auffällige EKG-Befunde für Nicht-Herz-Fälle. Für RettSan kein Handlungsbedarf. */
export const ODD_RHYTHMS: Record<string, string> = {
  avb1: 'AV-Block I. Grades',
  ves: 'Ventrikuläre Extrasystolen (Bigeminus)',
  wenckebach: 'AV-Block II. Grades Typ Wenckebach',
};
export function oddEcg(c: CaseDef, rnd = Math.random, chance = 0.35): CaseDef {
  // Nur bei stabilen Patienten ohne Hypoxie (dort wäre ein AV-Block ein Warnzeichen).
  // AV-Blöcke nur unter HF 100, weil ein langes PQ bei Tachykardie kaum möglich ist; VES bis HF 120.
  if (!c.oddEcg || c.rea || c.start.spo2 < 92 || rnd() >= chance) return c;
  const pool = Object.keys(ODD_RHYTHMS).filter((k) => c.start.hr < (k === 'ves' ? 120 : 100));
  if (!pool.length) return c;
  const k = pool[Math.floor(rnd() * pool.length)];
  const note = `Nebenbefund im EKG: ${ODD_RHYTHMS[k]} (harmlos)`;
  return { ...c, start: { ...c.start, rhythm: k }, oddRhythm: k, variantNote: c.variantNote ? `${c.variantNote} · ${note}` : note };
}

/** Für einen neuen Einsatz: Variante + Streuung + evtl. harmloser EKG-Nebenbefund */
export function randomize(c: CaseDef, rnd = Math.random): CaseDef {
  return oddEcg(jitter(applyVariant(c, pickVariant(c, rnd)), rnd), rnd);
}
