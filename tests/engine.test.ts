/* Spielt alle Fälle mit einer sinnvollen Vorgehensweise durch. */
import { describe, expect, it } from 'vitest';
import { CASES, caseById } from '../src/lib/data';
import { Game } from '../src/lib/engine/game';
import { answerPrompts, play } from './play';
import { applyVariant, randomize } from '../src/lib/engine/variants';
import type { CaseDef } from '../src/lib/types';

/** Gute Reihenfolge aus den Daten ableiten: SSS, Ersteindruck, Probleme nach xABCDE, Pflichtmaßnahmen */
function goodPlan(id: string | CaseDef): string[] {
  const c = typeof id === 'string' ? caseById(id)! : id;
  const plan = ['sss', 'ansprechen', 'q_hallo'];
  const letters = ['x', 'A', 'B', 'C', 'D', 'E'];
  const probs = [...(c.problems ?? [])].sort((a, b) => letters.indexOf(a.letter) - letters.indexOf(b.letter));
  for (const p of probs) if (p.fixedBy?.length && !p.activeIf) plan.push(p.fixedBy[0]);
  for (const r of c.required ?? []) plan.push(...(r.all ?? (r.any ? [r.any[0]] : [])));
  return plan;
}

describe('Fälle durchspielen', () => {
  for (const c of CASES) for (const v of c.variants ?? []) {
    it(`Variante ${c.id}+${v.id} endet mit Auswertung und nennt die Variante`, () => {
      const cv = applyVariant(c, v);
      const g = play(cv, goodPlan(cv), true);
      expect(g.result).not.toBeNull();
      expect(g.result!.pct).toBeGreaterThan(40);
      expect(g.result!.variant).toBe(v.label);
    });
  }
  it('Auslosen und Streuung bleiben im Rahmen', () => {
    for (const c of CASES) for (let i = 0; i < 30; i++) {
      const r = randomize(c);
      if (!c.rea) expect(Math.abs(r.start.hr - (applyVariant(c, c.variants?.find((v) => v.label === r.variantNote) ?? null).start.hr))).toBeLessThanOrEqual(5);
      if (!c.rea) expect(r.start.dia).toBeLessThan(r.start.sys);
    }
  });

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

describe('Patientengesicht', () => {
  it('jeder Fall hat ein Aussehen', () => {
    for (const c of CASES) expect(c.look?.skin, c.id).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('Hypo: schwitzig und mit Stimmung, Rea: Augen zu und zyanotisch', () => {
    const hypo = new Game(caseById('hypo')!, { worsen: false, detail: false }).face();
    expect(hypo.sweat).toBe(true);
    expect(hypo.mood).not.toBeNull();
    const rea = new Game(caseById('rea')!, { worsen: false, detail: false }).face();
    expect(rea.eyes).toBe('closed');
    expect(rea.cyanotic).toBe(true);
    expect(rea.mood).toBeNull();
  });
});

describe('Krampfanfall: Vorgeschichte', () => {
  const krampf = caseById('krampf')!;
  it('ohne Bodycheck/Anamnese: allgemeine Diagnose und Abzug', () => {
    const g = new Game(krampf, { worsen: false, detail: false });
    expect(g.diagnosis().options[g.diagnosis().answer]).toBe('Generalisierter tonisch-klonischer Krampfanfall');
    g.finish(); answerPrompts(g);
    expect(g.result!.missed.some((m) => m.label.startsWith('Vorgeschichte'))).toBe(true);
  });
  it('mit Bodycheck: bekannte Epilepsie als Diagnose und Punkte', () => {
    const g = new Game(krampf, { worsen: false, detail: false });
    g.act('e_body'); answerPrompts(g);
    expect(g.diagnosis().options[g.diagnosis().answer]).toContain('bekannter Epilepsie');
    g.finish(); answerPrompts(g);
    expect(g.result!.done.some((m) => m.label.startsWith('Vorgeschichte'))).toBe(true);
  });
});

describe('EKG am Extremitätenansatz', () => {
  it('Grün an der linken Hüfte und Rot an der rechten Schulter zählen als richtig', () => {
    const g = new Game(caseById('acs')!, { worsen: false, detail: true });
    g.forceProcMode = 'place';
    g.act('c_ekg');
    const p = g.prompt!;
    if (p.kind !== 'place') throw new Error('kein Kleben');
    const at: Record<string, [number, number]> = { rot: [32, 64], gelb: [168, 64], gruen: [138, 222], schwarz: [62, 222] };
    for (const e of p.electrodes) g.placeSet(e.id, ...at[e.id]);
    g.placeCheck();
    expect(p.result!.every((r) => r.ok)).toBe(true);
  });
});

describe('Maßnahmen-Gedächtnis über Einsätze', () => {
  it('gleiche Maßnahme bekommt im nächsten Einsatz einen anderen Modus, richtige Fragen kommen nicht wieder', async () => {
    const { procMemory } = await import('../src/lib/engine/memory');
    procMemory.data = {};
    const kinds: string[] = [];
    for (let i = 0; i < 6; i++) {
      const g = new Game(caseById('acs')!, { worsen: false, detail: true });
      g.act('c_rr');
      const p = g.prompt;
      kinds.push(p ? (p.kind === 'mc' ? 'question' : p.kind) : 'quick');
      answerPrompts(g);
    }
    for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1]);
    expect(procMemory.get('c_rr').lastMode).toBeDefined();
    procMemory.data = { c_rr: { right: [0, 1, 2] } };
    for (let i = 0; i < 10; i++) {
      const g = new Game(caseById('acs')!, { worsen: false, detail: true });
      g.act('c_rr');
      expect(g.prompt?.kind).not.toBe('mc');
      answerPrompts(g);
    }
    procMemory.data = {};
  });
});

describe('Blutdruck von Hand', () => {
  it('genaue Werte mit guter Technik geben volle Punkte, zu schnell ablassen kostet', () => {
    const run = (read: { sys: number; dia: number; maxP: number; rate: number }) => {
      const g = new Game(caseById('acs')!, { worsen: false, detail: true });
      g.forceProcMode = 'gauge';
      g.act('c_rr');
      const p = g.prompt!;
      if (p.kind !== 'gauge') throw new Error('kein Minispiel');
      g.gaugeDone({ ...read, sys: p.sys + read.sys, dia: p.dia + read.dia, maxP: p.sys + read.maxP });
      const ev = g.s.events.find((e) => e.text.startsWith('Blutdruck manuell'))!;
      g.next(); answerPrompts(g);
      expect(g.s.nibp).not.toBeNull();
      return ev;
    };
    const good = run({ sys: 2, dia: -4, maxP: 30, rate: 2.5 });
    expect(good.pts).toBe(good.max);
    const bad = run({ sys: -15, dia: 2, maxP: 10, rate: 9 });
    expect(bad.pts).toBe(2);
  });
});

describe('Opioid-Intoxikation', () => {
  it('Beatmen geht erst mit freiem Atemweg, Naloxon kommt mit dem Notarzt', () => {
    const g = new Game(caseById('opiat')!, { worsen: true, detail: false });
    for (const id of ['sss', 'ansprechen', 'm_bmv']) { g.act(id); answerPrompts(g); }
    expect(g.s.fixed.hypovent).toBe(false);
    for (const id of ['m_esmarch', 'm_bmv', 'm_nef']) { g.act(id); answerPrompts(g); }
    expect(g.s.fixed.hypovent).toBe(true);
    expect(g.s.v.spo2).toBeGreaterThan(85);
    g.advance(480);
    expect(g.s.flags.naloxon).toBeTruthy();
    expect(g.s.v.gcs).toBe(13);
  });

  it('i.v.-Minispiel: sauber gelegt volle Punkte, Fehler kosten Punkte', () => {
    const run = (r: Partial<import('../src/lib/types').IvRun>) => {
      const g = new Game(caseById('hypo')!, { worsen: false, detail: true });
      g.practice('m_ivz', 'iv', () => {});
      const p = g.prompt!;
      if (p.kind !== 'iv') throw new Error('kein Minispiel');
      const [lo, hi] = p.cfg.angle;
      g.ivDone({ stauOk: true, vein: p.cfg.veins.find((v) => v.quality === 'good')!.id, early: false, retouched: false, angle: Math.round((lo + hi) / 2), hit: 'in', order: [...p.cfg.order], ...r });
      return { ev: g.s.events.filter((e) => e.max > 0).at(-1)!, lines: (g.prompt as Extract<typeof p, { kind: 'iv' }>).result!.lines };
    };
    const good = run({});
    expect(good.ev.pts).toBe(good.ev.max);
    expect(good.lines.every((l) => l.ok)).toBe(true);
    const bad = run({ stauOk: false, early: true, angle: 55, hit: 'through' });
    expect(bad.ev.pts).toBeLessThan(bad.ev.max / 2);
    expect(bad.lines.filter((l) => !l.ok).length).toBeGreaterThanOrEqual(4);
  });

  it('Übungsmodus startet das Minispiel direkt und meldet das Ende', () => {
    const g = new Game({ ...caseById('acs')!, noStress: true }, { worsen: false, detail: true });
    let done = false;
    g.practice('c_ekg', 'place', () => (done = true));
    expect(g.prompt?.kind).toBe('place');
    g.next();
    expect(done).toBe(true);
  });
});
