/* Katalog aller Untersuchungen, Fragen und Maßnahmen.
   letter = Buchstabe im xABCDE (S = Szene/Ersteindruck, null = jederzeit erlaubt).
   time = Spielzeit in Sekunden, die die Aktion kostet. */
(function () {
  'use strict';

  const ASSESS = [
    { group: 'Ersteindruck', items: [
      { id: 'sss', label: 'SSS: Szene, Sicherheit, Situation', letter: 'S', time: 15 },
      { id: 'ansprechen', label: 'Ansprechen und Ersteindruck', letter: 'S', time: 10 },
      { id: 'bak', label: 'BAK: Bewusstsein, Atmung, Kreislauf', letter: 'S', time: 15 },
    ] },
    { group: 'x – Blutung', items: [
      { id: 'x_check', label: 'Nach kritischer Blutung suchen', letter: 'x', time: 10 },
    ] },
    { group: 'A – Atemweg', items: [
      { id: 'a_check', label: 'Atemweg prüfen (Mund, Geräusche)', letter: 'A', time: 10 },
    ] },
    { group: 'B – Atmung', items: [
      { id: 'b_af', label: 'Atmung ansehen, AF zählen', letter: 'B', time: 30 },
      { id: 'b_ausk', label: 'Lunge abhören', letter: 'B', time: 20 },
      { id: 'b_spo2', label: 'Pulsoxymeter anlegen (SpO₂)', letter: 'B', time: 10 },
    ] },
    { group: 'C – Kreislauf', items: [
      { id: 'c_puls', label: 'Puls tasten', letter: 'C', time: 15 },
      { id: 'c_rekap', label: 'Rekap-Zeit und Haut prüfen', letter: 'C', time: 10 },
      { id: 'c_rr', label: 'Blutdruck messen', letter: 'C', time: 40 },
      { id: 'c_ekg', label: 'EKG-Monitor anschließen', letter: 'C', time: 30 },
      { id: 'c_12', label: '12-Kanal-EKG schreiben', letter: 'C', time: 90 },
      { id: 'c_5b', label: 'Blutungsräume prüfen (5 B)', letter: 'C', time: 30 },
    ] },
    { group: 'D – Neurologie', items: [
      { id: 'd_gcs', label: 'Bewusstsein / GCS bestimmen', letter: 'D', time: 20 },
      { id: 'd_pup', label: 'Pupillen prüfen', letter: 'D', time: 10 },
      { id: 'd_bz', label: 'Blutzucker messen', letter: 'D', time: 40 },
      { id: 'd_befast', label: 'BE-FAST prüfen', letter: 'D', time: 40 },
    ] },
    { group: 'E – Exposure', items: [
      { id: 'e_body', label: 'Bodycheck (entkleiden)', letter: 'E', time: 60 },
      { id: 'e_temp', label: 'Temperatur messen', letter: 'E', time: 20 },
    ] },
  ];

  const ASK = [
    { group: 'SAMPLER', items: [
      { id: 'q_s', label: 'S – Was für Beschwerden haben Sie?' },
      { id: 'q_a', label: 'A – Haben Sie Allergien?' },
      { id: 'q_m', label: 'M – Nehmen Sie Medikamente?' },
      { id: 'q_p', label: 'P – Vorerkrankungen?' },
      { id: 'q_l', label: 'L – Letzte Mahlzeit / Getränk?' },
      { id: 'q_e', label: 'E – Was ist genau passiert?' },
      { id: 'q_r', label: 'R – Risikofaktoren?' },
    ] },
    { group: 'OPQRST', items: [
      { id: 'q_o', label: 'O – Wann und wie fing es an?' },
      { id: 'q_pr', label: 'P – Was macht es besser oder schlimmer?' },
      { id: 'q_q', label: 'Q – Wie fühlt es sich an?' },
      { id: 'q_rad', label: 'R – Strahlt es irgendwohin aus?' },
      { id: 'q_sev', label: 'S – Wie stark, von 0 bis 10?' },
      { id: 'q_t', label: 'T – Seit wann genau? Schon mal gehabt?' },
    ] },
  ];

  const TREAT = [
    { group: 'Organisation & Betreuung', items: [
      { id: 'm_nef', label: 'NEF nachalarmieren', letter: null, time: 15 },
      { id: 'm_betreuung', label: 'Beruhigen und betreuen', letter: null, time: 20 },
      { id: 'm_zeit', label: 'Uhrzeit / Zeitfenster notieren', letter: null, time: 5 },
    ] },
    { group: 'x – Blutung', items: [
      { id: 'm_abdr', label: 'Hochhalten und abdrücken', letter: 'x', time: 15 },
      { id: 'm_druckv', label: 'Druckverband', letter: 'x', time: 45 },
      { id: 'm_tq', label: 'Tourniquet anlegen', letter: 'x', time: 30 },
    ] },
    { group: 'A – Atemweg', items: [
      { id: 'm_hws', label: 'HWS manuell fixieren / Stifneck', letter: 'A', time: 30 },
      { id: 'm_esmarch', label: 'Esmarch-Handgriff', letter: 'A', time: 10 },
      { id: 'm_absaug', label: 'Absaugen / Absaugbereitschaft', letter: 'A', time: 20 },
      { id: 'm_guedel', label: 'Guedel-Tubus einlegen', letter: 'A', time: 20 },
    ] },
    { group: 'B – Atmung', items: [
      { id: 'm_o2_nb', label: 'O₂ über Nasenbrille (2–4 l/min)', letter: 'B', time: 20 },
      { id: 'm_o2_mask', label: 'O₂ über Reservoirmaske (15 l/min)', letter: 'B', time: 20 },
      { id: 'm_bmv', label: 'Beutel-Masken-Beatmung', letter: 'B', time: 30 },
      { id: 'm_lippen', label: 'Lippenbremse anleiten', letter: 'B', time: 20 },
      { id: 'm_spray', label: 'Hilfe beim eigenen Notfallspray', letter: 'B', time: 30 },
    ] },
    { group: 'C – Kreislauf', items: [
      { id: 'm_allergen', label: 'Allergenzufuhr stoppen', letter: null, time: 10 },
      { id: 'm_schock', label: 'Schocklage (Beine hoch)', letter: 'C', time: 15 },
      { id: 'm_becken', label: 'Beckenschlinge anlegen', letter: 'C', time: 60 },
      { id: 'm_defi_kleben', label: 'Defi-Elektroden kleben', letter: 'C', time: 20 },
      { id: 'm_ivz', label: 'i.v.-Zugang legen (§ 34)', letter: 'C', time: 60 },
      { id: 'm_ivz_vorb', label: 'i.v.-Zugang vorbereiten (für NEF)', letter: null, time: 30 },
      { id: 'm_vel', label: 'VEL-Infusion anhängen', letter: 'C', time: 30 },
      { id: 'm_epipen', label: 'Adrenalin 0,3 mg i.m. Autoinjektor (§ 34)', letter: 'C', time: 20 },
    ] },
    { group: 'D – Neuro & Stoffwechsel', items: [
      { id: 'm_polster', label: 'Umgebung sichern, Kopf polstern', letter: null, time: 10 },
      { id: 'm_festhalten', label: 'Patient festhalten', letter: null, time: 10 },
      { id: 'm_beisskeil', label: 'Beißkeil zwischen die Zähne', letter: null, time: 10 },
      { id: 'm_gluc_oral', label: 'Glucose oral / gesüßtes Getränk', letter: 'D', time: 60 },
      { id: 'm_gluc_iv', label: 'Glucose 20 % i.v. (§ 34)', letter: 'D', time: 60 },
      { id: 'm_rektiole', label: 'Diazepam-Rektiole aus dem RTW geben', letter: 'D', time: 20 },
      { id: 'm_eltern_rekt', label: 'Eltern bei eigener Rektiole anleiten', letter: 'D', time: 20 },
      { id: 'm_essen', label: 'Etwas Langwirksames essen lassen (Brot)', letter: null, time: 60 },
    ] },
    { group: 'E – Temperatur & Umgebung', items: [
      { id: 'm_raus', label: 'Aus der Gefahr / Hitze bringen', letter: null, time: 40 },
      { id: 'm_kuehl', label: 'Aktiv kühlen (Hals, Achseln, Leisten)', letter: 'E', time: 30 },
      { id: 'm_kalt_wasch', label: 'Kalt abwaschen', letter: 'E', time: 30 },
      { id: 'm_waerme', label: 'Wärmeerhalt (Decke)', letter: 'E', time: 15 },
      { id: 'm_trinken', label: 'Trinken lassen', letter: null, time: 30 },
    ] },
    { group: 'Lagerung', items: [
      { id: 'm_ok_hoch', label: 'Oberkörper hoch / sitzend', letter: null, time: 15 },
      { id: 'm_ok30', label: 'Oberkörper 30° hoch', letter: null, time: 15 },
      { id: 'm_ssl', label: 'Stabile Seitenlage', letter: null, time: 20 },
      { id: 'm_flach', label: 'Flache Rückenlage', letter: null, time: 15 },
      { id: 'm_laufen', label: 'Zum RTW laufen lassen', letter: null, time: 30 },
    ] },
    { group: 'Transport', items: [
      { id: 'm_voranm', label: 'Klinik voranmelden', letter: null, time: 30 },
    ] },
  ];

  // Reanimation hat einen eigenen Bereich, der nur in Fällen mit Kreislaufstillstand erscheint.
  const REA = [
    { group: 'Reanimation', items: [
      { id: 'r_hdm', label: 'Herzdruckmassage starten (30:2)', letter: null, time: 10 },
      { id: 'r_defi', label: 'Defi-Elektroden kleben', letter: null, time: 15 },
      { id: 'r_analyse', label: 'Rhythmusanalyse', letter: null, time: 10 },
      { id: 'r_puls', label: 'Puls prüfen (Carotis)', letter: null, time: 10 },
      { id: 'r_block', label: '2-Minuten-Block (5 × 30:2)', letter: null, time: 120 },
      { id: 'r_bmv', label: 'Beutel-Masken-Beatmung + O₂', letter: null, time: 10 },
      { id: 'r_lt', label: 'Larynxtubus einlegen', letter: null, time: 30 },
      { id: 'r_ivz', label: 'i.v.-Zugang legen', letter: null, time: 40 },
      { id: 'r_adr', label: 'Adrenalin 1 mg i.v. (1 ml + 9 ml NaCl)', letter: null, time: 20 },
      { id: 'r_absaug', label: 'Absaugbereitschaft herstellen', letter: null, time: 10 },
    ] },
  ];

  const LETTERS = ['S', 'x', 'A', 'B', 'C', 'D', 'E'];

  const all = {};
  [ASSESS, ASK, TREAT, REA].forEach((list, i) => {
    const kind = ['assess', 'ask', 'treat', 'rea'][i];
    list.forEach((grp) => grp.items.forEach((it) => {
      it.kind = kind;
      it.group = grp.group;
      if (kind === 'ask') { it.letter = null; it.time = 15; }
      all[it.id] = it;
    }));
  });

  window.ACTIONS = { ASSESS, ASK, TREAT, REA, LETTERS, byId: all };
})();
