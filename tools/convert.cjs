/* Einmalige Umwandlung der alten JS-Fälle in reine JSON-Daten.
   Funktionen werden durch deklarative Bedingungen ersetzt (REPL). */
const fs = require('fs'), vm = require('vm'), path = require('path');
const OLD = process.argv[2];
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['actions', 'cases', 'cases_extra']) vm.runInContext(fs.readFileSync(`${OLD}/js/${f}.js`, 'utf8'), ctx);

const gcs = (op, value) => ({ vital: 'gcs', op, value });
const flag = (f) => ({ flag: f });
const not = (c) => ({ not: c });
const done = (a) => ({ done: a });
const fixed = (p) => ({ fixed: p });
const all = (...c) => ({ all: c });

const REPL = {
  'acs.effects.m_o2_mask': [
    { if: { vital: 'spo2', op: '>', value: 90 }, pts: -5, why: 'Schulmeinung: Sauerstoff ist beim STEMI mit SpO₂ über 90 % kontraindiziert. Zu viel O₂ verengt die Herzkranzgefäße. O₂ nur bei Atemnot oder SpO₂ unter 90 %.' },
    { text: 'O₂ läuft, die Sättigung steigt.', delta: { spo2: 4 } }],
  'acs.effects.m_o2_nb': [
    { if: { vital: 'spo2', op: '>', value: 90 }, pts: -5, why: 'Schulmeinung: Sauerstoff ist beim STEMI mit SpO₂ über 90 % kontraindiziert, auch über die Nasenbrille.' },
    { text: 'O₂ über Nasenbrille.', delta: { spo2: 2 } }],
  'hypo.answerer': [{ if: gcs('<', 14), who: 'Kollegin' }],
  'hypo.tick': [
    { id: 'eintruebung', if: all({ setting: 'worsen' }, not(fixed('hypo')), { time: 360 }), set: { gcs: 9, hr: 116 }, cap: { bz: 30 }, flags: { eingetruebt: true },
      status: 'Sie ist zusammengesackt, reagiert nur noch auf Schmerzreiz und schwitzt stark.', alert: 'Die Patientin trübt ein! Sie reagiert nur noch auf Schmerzreiz (GCS 9).' },
    { id: 'erholung', if: all(fixed('hypo'), { sinceFlag: 'glucAt', over: 300 }), set: { bz: 96, gcs: 15, hr: 88 }, flags: { erholt: true },
      status: 'Sie ist wieder klar, etwas verlegen und fragt, was passiert ist.', info: 'Die Patientin wird wieder klar.' }],
  'hypo.findings.ansprechen': [
    { if: gcs('>=', 14), text: 'Sie schaut dich an, wirkt aber abwesend: „Lassen Sie mich… ich muss noch arbeiten.“' },
    { text: 'Sie reagiert nicht auf Ansprache, nur auf Schmerzreiz mit Stöhnen.' }],
  'hypo.findings.a_check': [
    { if: gcs('>=', 14), text: 'Atemweg frei, sie spricht.' },
    { text: 'Atemweg frei, aber Schutzreflexe vermindert. Aspirationsgefahr!' }],
  'hypo.findings.d_gcs': [
    { if: gcs('>=', 14), text: 'GCS 14 (Augen spontan, verwirrt, befolgt Aufforderungen). Sie schluckt sicher.' },
    { text: 'GCS 9 (Augen auf Schmerz, unverständliche Laute, gezielte Abwehr).' }],
  'hypo.effects.m_gluc_oral': [
    { if: gcs('>=', 14), text: 'Sie trinkt in kleinen Schlucken ein Glas Saft (ca. 20 g Glucose) unter deiner Aufsicht.', fix: ['hypo'], set: { bz: 70 }, flags: { glucAt: { now: 0 } },
      penalties: [{ if: not(done('d_bz')), pts: -3, why: 'Erst BZ messen, dann Glucose: Ohne Messwert weißt du nicht, ob es wirklich eine Hypo ist (Indikation BZ unter 60 mg/dl).' }] },
    { pts: -10, why: 'Bewusstseinsgetrübte Patienten bekommen nichts oral: Aspirationsgefahr! Hier: Seitenlage, NEF, Zugang vorbereiten.', delta: { spo2: -4 } }],
  'hypo.effects.m_trinken': [
    { if: gcs('>=', 14), text: 'Sie trinkt etwas Wasser. Das enthält aber keinen Zucker.' },
    { pts: -10, why: 'Bewusstseinsgetrübte Patienten bekommen nichts zu trinken: Aspirationsgefahr!' }],
  'hypo.effects.m_gluc_iv': [
    { if: gcs('>=', 14), pts: -5, why: 'Schulmeinung: Wache Patientin (GCS 14–15) bekommt Glucose oral. i.v. durch RettSan nur bei GCS 3 mit gefährdetem Atemweg (§ 34).', fix: ['hypo'], set: { bz: 80 }, flags: { glucAt: { now: 0 } } },
    { pts: -3, why: 'Schulmeinung: Glucose i.v. durch RettSan nur bei GCS 3 mit gefährdetem Atemweg im Rahmen § 34. Bei GCS 9: Seitenlage, NEF, Zugang vorbereiten. Die Patientin reagiert trotzdem.', fix: ['hypo'], set: { bz: 80 }, flags: { glucAt: { now: -200 } } }],
  'hypo.effects.m_essen': [
    { if: flag('erholt'), text: 'Sie isst ein Brot. Das hält den Zucker länger oben.' },
    { text: 'Erst wenn sie wieder ganz wach ist und der BZ gestiegen ist.' }],
  'hypo.effects.m_ssl': [
    { if: gcs('<', 14), text: 'Stabile Seitenlage, Absaugbereitschaft. Atemweg geschützt.' },
    { text: 'Sie wehrt sich: „Ich will sitzen bleiben!“' }],
  'hypo.effects.m_ivz': [
    { if: gcs('>=', 14), pts: -3, why: 'Bei wacher Patientin kein i.v.-Zugang durch RettSan: Glucose oral reicht.' },
    { text: 'Zugang liegt.' }],
  'hypo.required.2.check': { doneAfterFlag: { action: 'd_bz', flag: 'glucAt' } },
  'hypo.moments.0.cond': flag('erholt'),
  'asthma.effects.m_spray': [
    { if: { vital: 'hr', op: '>', value: 140 }, pts: -5, why: 'KI für das β₂-Spray: HF über 140/min.' },
    { text: 'Er nimmt 2 Hübe seines eigenen Salbutamol-Sprays. Nach ein paar Minuten wird das Pfeifen leiser.', delta: { spo2: 4, af: -6, hr: 8 },
      status: 'Sitzt aufrecht, atmet deutlich ruhiger und kann wieder ganze Sätze sprechen.',
      penalties: [{ if: not({ any: [done('q_m'), done('q_p')] }), pts: -3, why: 'Vor der Hilfe beim Spray abfragen: bekanntes Asthma, ärztlich verordnet, kennt die Anwendung.' }] }],
  'anaphylaxie.effects.m_epipen': [
    { text: 'Autoinjektor in den seitlichen Oberschenkel, 10 Sekunden halten. Nach 2 Minuten: Puls sinkt, Blutdruck steigt, die Atmung wird freier.', delta: { sys: 28, dia: 16, hr: -18, spo2: 3 }, set: { gcs: 15 },
      status: 'Liegt mit erhöhten Beinen, wirkt wacher. Die Quaddeln sind noch da, sie atmet freier.',
      penalties: [{ if: not(done('m_nef')), pts: -5, why: '§ 34 StGB: Voraussetzung ist, dass das NEF nachalarmiert ist. Erst NEF, dann Adrenalin.' }] }],
  'anaphylaxie.effects.m_vel': [
    { if: done('m_ivz'), text: 'VEL läuft im Schuss (500–1000 ml).', delta: { sys: 6, hr: -3 } },
    { text: 'Ohne Zugang keine Infusion.', nopts: true }],
  'stroke.answerer': 'Tochter',
  'stroke.diagnosis.guard': { if: not(done('d_bz')), pts: -5, why: 'Fixierungsfehler: Diagnose Schlaganfall ohne BZ-Messung.' },
  'krampf.answerer': [{ if: gcs('<', 13), who: 'Passantin' }],
  'krampf.problems.0.active': flag('postiktal'),
  'krampf.problems.1.active': flag('postiktal'),
  'krampf.tick': [
    { id: 'anfallsende', if: { time: 120 }, set: { hr: 108, spo2: 90, af: 12, sys: 145, dia: 85, gcs: 8 }, flags: { postiktal: true },
      status: 'Der Krampf hat aufgehört. Er liegt schlaff da, atmet schnarchend und reagiert auf Schmerz nur mit Stöhnen. Hose eingenässt.',
      alert: 'Der Krampf hat aufgehört (Dauer ca. 4 Minuten). Jetzt postiktal: schnarchende Atmung!' },
    { id: 'aufwachen', if: all(flag('postiktal'), fixed('atemweg'), fixed('hypox'), { time: 601 }), set: { gcs: 13, hr: 92 }, flags: { wach: true },
      status: 'Er wird langsam wacher, ist noch desorientiert und müde.', info: 'Der Patient wird langsam wacher.' }],
  'krampf.findings.ansprechen': [{ if: flag('postiktal'), text: 'Keine Antwort, nur Stöhnen auf Schmerzreiz.' }, { text: 'Keine Reaktion, er krampft.' }],
  'krampf.findings.a_check': [
    { if: not(flag('postiktal')), text: 'Schaum vor dem Mund, Zähne zusammengebissen. Nichts in den Mund stecken!' },
    { if: fixed('atemweg'), text: 'Atemweg frei, Speichel läuft ab.' },
    { text: 'Schnarchende Atmung: Die Zunge ist zurückgefallen!' }],
  'krampf.findings.b_af': [{ if: not(flag('postiktal')), text: 'Kaum effektive Atmung während des Krampfens.' }, { text: 'Atmung flach.' }],
  'krampf.findings.c_rr': [{ if: not(flag('postiktal')), text: 'Während des Krampfens nicht sinnvoll messbar.' }, { text: '' }],
  'krampf.findings.d_gcs': [
    { if: not(flag('postiktal')), text: 'GCS 3, krampft.' },
    { if: gcs('>=', 13), text: 'GCS 13, desorientiert.' },
    { text: 'GCS 8 (Augen auf Schmerz, Stöhnen, Abwehr).' }],
  'krampf.effects.m_polster': [{ if: flag('postiktal'), text: 'Umgebung ist sicher.' }, { text: 'Bank weggeschoben, Jacke unter den Kopf. Er schlägt sich nicht mehr an.' }],
  'krampf.effects.m_ssl': [
    { if: flag('postiktal'), text: 'Stabile Seitenlage, Speichel läuft ab, das Schnarchen hört auf.', delta: { spo2: 3 } },
    { text: 'Während des Krampfens nicht möglich. Warte, bis der Anfall vorbei ist.', nopts: true, noCount: true }],
  'krampf.effects.m_esmarch': [
    { if: flag('postiktal'), text: 'Esmarch: Das Schnarchen hört auf.', delta: { spo2: 2 } },
    { text: 'Während des Krampfens nicht möglich.', nopts: true, noCount: true }],
  'krampf.effects.m_o2_mask': [{ if: flag('postiktal'), text: 'O₂ über Reservoirmaske.', delta: { spo2: 6 } }, { text: 'O₂ über Reservoirmaske.', delta: { spo2: 1 } }],
  'krampf.effects.m_o2_nb': [{ if: flag('postiktal'), text: 'O₂ über Nasenbrille.', delta: { spo2: 4 } }, { text: 'O₂ über Nasenbrille.', delta: { spo2: 1 } }],
  'krampf.effects.m_guedel': [
    { if: flag('postiktal'), pts: -3, why: 'Bei erhaltenen Schutzreflexen würgt er am Guedel-Tubus. Seitenlage reicht.' },
    { pts: -5, why: 'Nichts in den Mund des Krampfenden!' }],
  'krampf.required.6.check': fixed('atemweg'),
  'krampf.moments.1.cond': flag('wach'),
  'poly.tick': [
    { id: 'eintruebung', if: all({ setting: 'worsen' }, { vital: 'sys', op: '<', value: 70 }), set: { gcs: 10 }, flags: { eingetruebt: true },
      status: 'Er wird ruhiger und blasser, die Augen fallen zu. Er reagiert nur noch auf laute Ansprache.', alert: 'Der Patient trübt ein: Der Blutverlust ist zu groß!' }],
  'poly.findings.x_check': [{ if: fixed('blutung'), text: 'Blutung steht (Tourniquet).' }, { text: 'Spritzende, pulsierende Blutung am rechten Oberschenkel. Lebensbedrohlich!' }],
  'poly.findings.d_gcs': 'GCS {gcs}.',
  'poly.effects.m_tq.after': '__STATUS__Die Blutung steht. Er ist blass und zittert, stöhnt vor Schmerzen im Becken.',
  'poly.effects.m_vel': [{ if: done('m_ivz'), text: 'VEL läuft.', delta: { sys: 5 } }, { text: 'Ohne Zugang keine Infusion.', nopts: true }],
  'rea.answerer': 'Kassiererin',
  'fieberkrampf.answerer': 'Mutter',
  'fieberkrampf.tick': [
    { id: 'aufwachen', if: all(done('m_ssl'), { time: 421 }), set: { gcs: 14, hr: 138 }, flags: { wach: true },
      status: 'Das Kind wird wacher, weint und klammert sich an die Mutter.', info: 'Das Kind wird wacher und weint. Gutes Zeichen!' }],
  'exsikkose.answerer': 'Pflegekraft',
  'hitzschlag.answerer': [{ if: gcs('<', 14), who: 'Laufpartnerin' }],
  'hitzschlag.tick': [
    { id: 'besser', if: all(fixed('hitze'), { vital: 'temp', op: '<', value: 39.5 }), set: { gcs: 14, hr: 112, sys: 104 }, flags: { besser: true },
      status: 'Er liegt im kühlen RTW, wird klarer und fragt, ob er ins Ziel gekommen ist.', info: 'Die Kerntemperatur sinkt, der Patient wird klarer.' },
    { id: 'sonne', if: all({ setting: 'worsen' }, not(done('m_raus')), { time: 301 }), delta: { temp: 0.3 }, flags: { warnRaus: true },
      alert: 'Er liegt immer noch in der Sonne. Die Temperatur steigt weiter!' }],
  'hitzschlag.findings.d_gcs': [{ if: gcs('>=', 14), text: 'GCS 14, wird klarer.' }, { text: 'GCS 12 (Augen auf Ansprache, verwirrt, befolgt Aufforderungen). D-Problem!' }],
  'hitzschlag.effects.m_kuehl': [
    { if: done('m_raus'), text: 'Feuchtkalte Tücher, Kältepacks (mit Kompresse) an Hals, Achseln und Leisten, Lüftung an.' },
    { text: 'Kältepacks und feuchte Tücher, aber er liegt noch in der Sonne. Das wirkt nur schwach.' }],
  'hitzschlag.effects.m_trinken': [
    { if: gcs('>=', 14), text: 'Er trinkt in kleinen Schlucken ein isotonisches Getränk.' },
    { pts: -10, why: 'Bewusstseinsgetrübt (GCS unter 14): Aspirationsgefahr! Trinken nur, wenn er wach ist.' }],
};
// Kontinuierliche Verläufe (vorher in tick als Rechnung)
const TRENDS = {
  hitzschlag: [
    { if: all(fixed('hitze'), done('m_raus')), perMin: { temp: -0.25 }, min: { temp: 38.4 } },
    { if: all(fixed('hitze'), not(done('m_raus'))), perMin: { temp: -0.08 }, min: { temp: 38.4 } },
  ],
};
const MOOD_DROP = { acs: { hr: 2 } };

const used = new Set();
function conv(v, p) {
  if (typeof v === 'function') {
    if (!(p in REPL)) throw new Error('Keine Ersetzung für ' + p);
    used.add(p);
    return REPL[p];
  }
  if (Array.isArray(v)) return v.map((x, i) => conv(x, p + '.' + i));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) {
      const r = conv(v[k], p + '.' + k);
      if (typeof r === 'string' && r.startsWith('__STATUS__')) { o.status = r.slice(10); continue; }
      o[k] = r;
    }
    return o;
  }
  return v;
}
const ORDER = ['id', 'level', 'rea', 'person', 'icon', 'name', 'mood', 'child', 'nonverbal', 'dispatches', 'sssPts', 'start', 'answerer', 'problems', 'rules', 'trends', 'moodDrop',
  'findings', 'answers', 'followups', 'moments', 'react', 'effects', 'required', 'quizzes', 'diagnosis', 'teach'];
const outDir = path.join(__dirname, '..', 'src', 'data', 'cases');
const ids = [];
for (const c of ctx.window.CASES) {
  const o = conv(JSON.parse(JSON.stringify(c, (k, v) => typeof v === 'function' ? '__FN__' : v)) && c, c.id);
  // Umbenennungen ins neue Schema
  if (o.tick) { o.rules = o.tick; delete o.tick; }
  if (TRENDS[c.id]) o.trends = TRENDS[c.id];
  if (MOOD_DROP[c.id]) o.moodDrop = { delta: MOOD_DROP[c.id] };
  for (const pr of o.problems || []) if (pr.active) { pr.activeIf = pr.active; delete pr.active; }
  for (const r of o.required || []) if (r.check) { r.if = r.check; delete r.check; }
  for (const m of o.moments || []) if (m.cond) { m.if = m.cond; delete m.cond; }
  if (typeof o.answerer === 'string') o.answerer = [{ who: o.answerer }];
  delete o.short; delete o.dispatch; // ersetzt durch dispatches
  if (!o.nonverbal) delete o.nonverbal;
  if (!o.child) delete o.child;
  for (const k of ['followups', 'react']) if (o[k] && !Object.keys(o[k]).length) delete o[k];
  if (o.moments && !o.moments.length) delete o.moments;
  const sorted = {};
  for (const k of ORDER) if (k in o) sorted[k] = o[k];
  for (const k of Object.keys(o)) if (!(k in sorted)) throw new Error('Unbekanntes Feld ' + c.id + '.' + k);
  fs.writeFileSync(path.join(outDir, c.id + '.json'), require('./json-format.cjs')(sorted));
  ids.push(c.id);
}
const missing = Object.keys(REPL).filter((k) => !used.has(k));
if (missing.length) throw new Error('Unbenutzt: ' + missing.join(', '));
console.log('ok', ids.join(' '));
