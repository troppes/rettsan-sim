/* Spielt alle Fälle mit einer sinnvollen Vorgehensweise durch. */
import { describe, expect, it } from 'vitest';
import { CASES, caseById } from '../src/lib/data';
import { Game } from '../src/lib/engine/game';
import { answerPrompts, play } from './play';

/** Gute Reihenfolge aus den Daten ableiten: SSS, Ersteindruck, Probleme nach xABCDE, Pflichtmaßnahmen */
function goodPlan(id: string): string[] {
  const c = caseById(id)!;
  const plan = ['sss', 'ansprechen', 'q_hallo'];
  const letters = ['x', 'A', 'B', 'C', 'D', 'E'];
  const probs = [...(c.problems ?? [])].sort((a, b) => letters.indexOf(a.letter) - letters.indexOf(b.letter));
  for (const p of probs) if (p.fixedBy?.length && !p.activeIf) plan.push(p.fixedBy[0]);
  for (const r of c.required ?? []) plan.push(...(r.all ?? (r.any ? [r.any[0]] : [])));
  return plan;
}

describe('Fälle durchspielen', () => {
  for (const c of CASES.filter((x) => !x.rea)) {
    for (const detail of [true, false]) {
      it(`${c.id} (${detail ? 'mit' : 'ohne'} Detail-Maßnahmen) endet mit Auswertung`, () => {
        const g = play(c, goodPlan(c.id), detail);
        expect(g.result).not.toBeNull();
        expect(g.result!.pct).toBeGreaterThan(40);
        expect(g.result!.record.diagnose_richtig).toBe(true);
      });
    }
  }

  it('Allergen entfernen geht erst nach Bodycheck oder Frage', () => {
    const g = new Game(caseById('anaphylaxie')!, { worsen: false, detail: false });
    g.act('sss'); answerPrompts(g);
    g.act('m_allergen'); answerPrompts(g);
    expect(g.s.count.m_allergen ?? 0).toBe(0);
    g.act('q_e'); answerPrompts(g);
    g.act('m_allergen'); answerPrompts(g);
    expect(g.s.count.m_allergen).toBe(1);
  });

  it('Blutzucker bei offener Blutung kostet Punkte', () => {
    const g = new Game(caseById('poly')!, { worsen: false, detail: false });
    g.act('sss'); answerPrompts(g);
    g.act('d_bz'); answerPrompts(g);
    expect(g.s.events.some((e) => e.type === 'bad' && e.text.includes('Treat first'))).toBe(true);
  });

  it('Hypo: Regel lässt die Patientin ohne Glucose eintrüben', () => {
    const g = new Game(caseById('hypo')!, { worsen: true, detail: false });
    g.act('sss'); answerPrompts(g);
    g.advance(400);
    expect(g.s.v.gcs).toBe(9);
    expect(g.s.flags.eingetruebt).toBe(true);
  });

  it('Hitzschlag: Kühlen im Schatten senkt die Temperatur', () => {
    const g = new Game(caseById('hitzschlag')!, { worsen: true, detail: false });
    const t0 = g.s.v.temp;
    for (const id of ['sss', 'm_raus', 'm_kuehl']) { g.act(id); answerPrompts(g); }
    g.advance(600);
    expect(g.s.v.temp).toBeLessThan(t0 - 1);
  });
});

describe('Reanimation', () => {
  const rea = caseById('rea')!;
  for (let path = 0; path < 4; path++) {
    it(`Pfad ${path + 1} erreicht ROSC`, () => {
      const g = new Game(rea, { worsen: true, detail: true });
      const R = g.rea!.st;
      const paths = [['vf', 'vf', 'vf', 'rosc'], ['pvt', 'vf', 'vf', 'rosc'], ['asystolie', 'asystolie', 'pea', 'rosc'], ['pea', 'pea', 'rosc']];
      R.path = paths[path]; R.monRhythm = R.path[0];
      const step = (id: string) => { g.act(id); answerPrompts(g); };
      for (const id of ['sss', 'bak', 'm_nef', 'r_hdm', 'r_defi', 'r_bmv', 'r_absaug', 'r_analyse', 'r_ivz']) step(id);
      for (let i = 0; i < 8 && !R.rosc; i++) {
        const shockable = ['vf', 'pvt'].includes(R.monRhythm);
        if ((!shockable || R.shocks >= 3) && (R.adr.length === 0 || R.blocks - R.adr[R.adr.length - 1] >= 2)) step('r_adr');
        step('r_block');
        step('r_analyse');
      }
      expect(R.rosc).toBe(true);
      step('c_12');
      g.finish(); answerPrompts(g);
      expect(g.result!.pct).toBeGreaterThan(60);
    });
  }
});

describe('Maßnahmen abwechslungsreich', () => {
  const acs = caseById('acs')!;
  const start = (mode: 'steps' | 'quick' | 'question' | 'place') => {
    const g = new Game(acs, { worsen: false, detail: true });
    g.forceProcMode = mode;
    return g;
  };

  it('„klappt einfach“ öffnet keinen Dialog und führt die Maßnahme aus', () => {
    const g = start('quick');
    g.act('d_bz');
    expect(g.prompt).toBeNull();
    expect(g.s.measured.bz).toBeGreaterThan(0);
  });

  it('Frage-Modus stellt eine Frage zur Maßnahme und gibt Punkte', () => {
    const g = start('question');
    g.act('c_rr');
    expect(g.prompt?.kind).toBe('mc');
    answerPrompts(g);
    expect(g.s.nibp).not.toBeNull();
    expect(g.s.events.some((e) => e.text.startsWith('Blutdruck messen: Frage richtig') && e.pts === 2)).toBe(true);
  });

  it('EKG-Elektroden richtig kleben gibt volle Punkte, falsch kleben zeigt die Stellen', () => {
    const g = start('place');
    g.act('c_ekg');
    const p = g.prompt!;
    expect(p.kind).toBe('place');
    if (p.kind !== 'place') return;
    // Seiten vertauscht: rechts und links aus Sicht des Betrachters
    for (const e of p.electrodes) g.placeSet(e.id, 200 - (e.id === 'rot' ? 60 : e.id === 'gelb' ? 140 : e.id === 'gruen' ? 136 : 64), e.id === 'rot' || e.id === 'gelb' ? 64 : 168);
    g.placeCheck();
    expect(p.result!.every((r) => !r.ok)).toBe(true);
    expect(g.s.events.some((e) => e.type === 'miss' && e.text.includes('falsch geklebt'))).toBe(true);
    g.next();
    answerPrompts(g);
    expect(g.s.attached.ekg).toBe(true);
  });

  it('jede Elektroden-Aufgabe ist mit den Zielen lösbar', () => {
    for (const id of ['c_ekg', 'c_12', 'm_defi_kleben']) {
      const g = start('place');
      g.act(id);
      answerPrompts(g);
      expect(g.s.events.some((e) => e.text.includes('richtig geklebt') && e.pts === e.max)).toBe(true);
    }
  });

  it('Reihenfolge-Quizze kommen erst bei der Übergabe', () => {
    for (const c of CASES) for (const q of c.quizzes ?? []) if (q.type === 'order') expect(q.on).toBe('finish');
  });

  it('Modus wechselt zwischen Maßnahmen', () => {
    const g = new Game(acs, { worsen: false, detail: true });
    const modes = new Set<string>();
    for (const id of ['d_bz', 'c_rr', 'b_spo2', 'm_ivz', 'm_o2_mask']) {
      g.act(id);
      modes.add(g.prompt ? g.prompt.kind : 'quick');
      answerPrompts(g);
    }
    expect(modes.size).toBeGreaterThan(1);
  });
});
