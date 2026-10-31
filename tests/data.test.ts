/* Prüft, dass alle Daten zueinander passen: Verweise auf Aktionen, Probleme, Rhythmen. */
import { describe, expect, it } from 'vitest';
import { ACTIONS, CASES, ECG, PROCEDURES, REA } from '../src/lib/data';
import type { Condition } from '../src/lib/types';
import { createSignal } from '../src/lib/ecg/signal';

function conditionRefs(c: Condition | undefined, out: { actions: string[]; problems: string[] }) {
  if (!c) return;
  if ('all' in c) c.all.forEach((x) => conditionRefs(x, out));
  else if ('any' in c) c.any.forEach((x) => conditionRefs(x, out));
  else if ('not' in c) conditionRefs(c.not, out);
  else if ('done' in c) out.actions.push(c.done);
  else if ('fixed' in c) out.problems.push(c.fixed);
  else if ('doneAfterFlag' in c) out.actions.push(c.doneAfterFlag.action);
}

describe('Fälle', () => {
  it('es gibt 11 Fälle mit eindeutigen IDs', () => {
    expect(CASES).toHaveLength(11);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(11);
  });

  for (const c of CASES) {
    describe(c.id, () => {
      const known = (id: string) => !!ACTIONS[id] || !!c.followups?.[id];
      const problems = new Set((c.problems ?? []).map((p) => p.id));
      const refs = { actions: [] as string[], problems: [] as string[] };
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') {
          for (const [k, x] of Object.entries(v)) {
            if (k === 'if' || k === 'activeIf') conditionRefs(x as Condition, refs);
            else walk(x);
          }
        }
      };
      walk(c);

      it('Startrhythmus existiert', () => expect(ECG.rhythms[c.start.rhythm]).toBeDefined());
      it('mindestens eine Einsatzmeldung', () => expect(c.dispatches.length).toBeGreaterThan(0));
      it('Diagnose-Antwort liegt im Bereich', () => expect(c.diagnosis.options[c.diagnosis.answer]).toBeDefined());
      it('Effekte gehören zu Maßnahmen', () => {
        for (const id of Object.keys(c.effects ?? {})) expect(ACTIONS[id]?.kind, id).toMatch(/treat|rea/);
      });
      it('Befunde gehören zu Untersuchungen', () => {
        for (const id of Object.keys(c.findings ?? {})) expect(ACTIONS[id]?.kind, id).toBe('assess');
      });
      it('Antworten gehören zu Fragen', () => {
        for (const id of Object.keys(c.answers ?? {})) expect(ACTIONS[id]?.kind, id).toBe('ask');
      });
      it('Verweise auf Aktionen existieren', () => {
        const ids = [
          ...(c.problems ?? []).flatMap((p) => p.fixedBy ?? []),
          ...(c.required ?? []).flatMap((r) => [...(r.any ?? []), ...(r.all ?? [])]),
          ...Object.values(c.effects ?? {}).flatMap((e) => (Array.isArray(e) ? e : [e]).flatMap((x) => x.needs ?? [])),
          ...Object.values(c.followups ?? {}).map((f) => f.after),
          ...(c.moments ?? []).flatMap((m) => [...(m.before ? [m.before] : []), ...(m.after ?? [])]),
          ...(c.quizzes ?? []).map((q) => q.on).filter((on) => on !== 'treat' && on !== 'finish'),
          ...refs.actions,
        ];
        for (const id of ids) expect(known(id), id).toBe(true);
      });
      it('Verweise auf Probleme existieren', () => {
        const ids = [...refs.problems, ...Object.values(c.effects ?? {}).flatMap((e) => (Array.isArray(e) ? e : [e]).flatMap((x) => x.fix ?? []))];
        for (const id of ids) expect(problems.has(id), id).toBe(true);
      });
      it('Reaktionen gehören zu Ablaufschritten', () => {
        for (const key of Object.keys(c.react ?? {})) {
          const [act, step] = key.split('.');
          expect(PROCEDURES[act], key).toBeDefined();
          if (step !== 'noexplain') expect(PROCEDURES[act].steps.some((s) => s.id === step), key).toBe(true);
        }
      });
    });
  }
});

describe('Abläufe', () => {
  for (const [id, p] of Object.entries(PROCEDURES)) {
    it(`${id}: Aktion existiert, genau ein Abschluss, Voraussetzungen bekannt`, () => {
      expect(ACTIONS[id]).toBeDefined();
      if (p.steps.length) expect(p.steps.filter((s) => s.final)).toHaveLength(1);
      else expect(p.modes && Object.keys(p.modes).every((m) => m === 'place' || m === 'quick')).toBe(true);
      for (const q of p.questions ?? []) {
        expect(q.options).toHaveLength(4);
        expect(q.answer).toBeLessThan(4);
      }
      for (const v of p.place?.variants ?? []) {
        const ids = v.electrodes.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
        // Ziele überlappen nicht, sonst wäre die Zuordnung zweideutig
        for (const a of v.electrodes) for (const b of v.electrodes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id}/${b.id}`).toBeGreaterThanOrEqual(Math.max(a.r, b.r));
      }
      const ids = new Set(p.steps.map((s) => s.id));
      for (const s of p.steps) for (const n of s.needs ?? []) expect(ids.has(n), `${id}.${s.id} braucht ${n}`).toBe(true);
    });
  }
});

describe('EKG', () => {
  const opts = ECG.analysisOptions;
  for (const [key, r] of Object.entries(ECG.rhythms)) {
    it(`${key}: Analyse-Werte gültig, Signal erzeugbar`, () => {
      expect(opts.rate[r.analysis.rate]).toBeDefined();
      expect(opts.regular[r.analysis.regular]).toBeDefined();
      expect(opts.qrs[r.analysis.qrs]).toBeDefined();
      expect(opts.p[r.analysis.p]).toBeDefined();
      expect(opts.todo[r.analysis.todo]).toBeDefined();
      const sig = createSignal(ECG, key, 6);
      for (let t = 0; t < 6; t += 0.01) expect(Number.isFinite(sig.value(t))).toBe(true);
      if (r.pattern.type !== 'continuous') {
        const cat = sig.hr < 60 ? 'brady' : sig.hr > 100 ? 'tachy' : 'normal';
        expect(cat, `HF ${sig.hr}`).toBe(r.analysis.rate);
      }
    });
  }
  it('Trainer-Sets und Rea-Pfade verweisen auf bekannte Rhythmen', () => {
    const all = [
      ...ECG.trainer.basic.rhythms, ...ECG.trainer.caseQuiz.pool, ...ECG.trainer.reaQuiz.choices,
      ...Object.values(ECG.trainer.pro.sets).flatMap((s) => (s.rhythms === '*' ? [] : s.rhythms)),
      ...REA.paths.flat().filter((k) => k !== 'rosc'), REA.rosc.vitals.rhythm,
    ];
    for (const k of all) expect(ECG.rhythms[k], k).toBeDefined();
  });
});
