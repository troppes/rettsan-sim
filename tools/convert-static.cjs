/* Einmalige Umwandlung: Aktionen, Abläufe, EKG-Rhythmen als JSON. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const fmt = require('./json-format.cjs');
const OLD = process.argv[2];
const ctx = { window: {}, document: {}, performance: { now: () => 0 } }; vm.createContext(ctx);
for (const f of ['actions', 'procedures', 'ecg']) vm.runInContext(fs.readFileSync(`${OLD}/js/${f}.js`, 'utf8'), ctx);
// ecg2: VIGNETTES mit exportieren
const e2 = fs.readFileSync(`${OLD}/js/ecg2.js`, 'utf8').replace('window.ECG2 = {', 'window.ECG2 = { VIGNETTES,');
vm.runInContext(e2, ctx);
const W = ctx.window, out = (n, v) => fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', n), fmt(v));

// Aktionen: Gruppen je Bereich, ohne die zur Laufzeit ergänzten Felder
const strip = (list) => list.map((g) => ({ group: g.group, items: g.items.map(({ kind, group, ...it }) => {
  if (it.letter === undefined || it.letter === null) delete it.letter;
  return it;
}) }));
out('actions.json', {
  letters: W.ACTIONS.LETTERS,
  assess: strip(W.ACTIONS.ASSESS),
  ask: strip(W.ACTIONS.ASK).map((g) => ({ group: g.group, items: g.items.map(({ letter, time, ...x }) => x) })),
  treat: strip(W.ACTIONS.TREAT),
  rea: strip(W.ACTIONS.REA),
});
out('procedures.json', { explainWhy: W.PROCS.EXPLAIN_WHY, procedures: W.PROCS.P });

// EKG-Rhythmen: Eigenschaften für die Analyse + Erzeugungsmuster + Texte
const PATTERN = {
  sinus: { type: 'sinus', hr: [65, 90], pq: 0.16 },
  sinustachy: { type: 'sinus', hr: [110, 140], pq: 0.13 },
  sinusbrady: { type: 'sinus', hr: [38, 52], pq: 0.17 },
  stemi: { type: 'sinus', hr: [70, 95], pq: 0.16, st: 0.35 },
  pea: { type: 'sinus', hr: [35, 50], pq: 0.16 },
  avb1: { type: 'sinus', hr: [60, 80], pq: [0.3, 0.38] },
  vhf: { type: 'irregular', rr: [0.33, 0.85], baseline: 'fib' },
  flattern: { type: 'flutter', flutterInterval: 0.2, ratios: [2, 2, 4] },
  svt: { type: 'regular', hr: [170, 210], complex: 'narrow' },
  wenckebach: { type: 'wenckebach', atrialHr: [75, 90], cycles: [3, 4], pq: 0.16, pqStep: 0.08 },
  mobitz2: { type: 'mobitz2', atrialHr: [75, 90], ratios: [2, 3], pq: 0.18 },
  avb3: { type: 'dissociated', atrialHr: [72, 90], hr: [30, 40], complex: 'escape' },
  ves: { type: 'bigeminy', hr: [68, 84], pq: 0.16, coupling: 0.6, ectopic: 'ectopic' },
  pacer: { type: 'paced', hr: [70, 70], complex: 'escape' },
  vt: { type: 'regular', hr: [160, 200], complex: 'vt' },
  pvt: { type: 'regular', hr: [160, 200], complex: 'vt' },
  torsade: { type: 'continuous', wave: 'torsade', hr: [240, 240] },
  vf: { type: 'continuous', wave: 'vf' },
  asystolie: { type: 'continuous', wave: 'asystole' },
};
const MON = W.ECG.RHYTHMS, HINT = W.ECG.HELP;
const rhythms = {};
for (const [k, r] of Object.entries(W.ECG2.R)) {
  rhythms[k] = {
    name: r.name, pulse: r.pulse, shockable: r.todo === 'schock',
    analysis: { rate: r.rate, regular: r.reg, qrs: r.qrs, p: r.p, todo: r.todo },
    pattern: PATTERN[k],
    help: r.help,
    ...(HINT[k] ? { hint: HINT[k] } : {}),
    ...(MON[k] ? { monitorRate: MON[k].rate } : {}),
    vignettes: W.ECG2.VIGNETTES[k] || [],
  };
}
out('ecg.json', {
  morphology: {
    p: [[0, 0.025, 0.15]],
    narrow: [[-0.035, 0.009, -0.12], [0, 0.011, 1.2], [0.035, 0.011, -0.3], [0.27, 0.05, 0.3]],
    escape: [[0, 0.04, 1.0], [0.07, 0.03, -0.35], [0.32, 0.07, -0.35]],
    ectopic: [[0, 0.05, -1.3], [0.09, 0.04, 0.5], [0.32, 0.07, 0.45]],
    vt: [[0, 0.05, 1.1], [0.13, 0.05, -0.55]],
    pleth: [[0.12, 0.06, 1], [0.34, 0.07, 0.35]],
  },
  analysisOptions: {
    rate: { brady: 'Unter 60/min', normal: '60–100/min', tachy: 'Über 100/min', none: 'Keine geordneten Kammerkomplexe' },
    regular: { ja: 'Regelmäßig', nein: 'Unregelmäßig', nb: 'Nicht beurteilbar' },
    qrs: { schmal: 'Schmal (unter 0,12 s = unter 3 kleinen Kästchen)', breit: 'Breit (0,12 s oder mehr)', teils: 'Teils schmal, teils breit', keine: 'Keine QRS-Komplexe erkennbar' },
    p: W.ECG2.P_OPTS,
    todo: W.ECG2.TODO,
  },
  rhythms,
});
console.log('ok');
