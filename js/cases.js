/* Fälle. Inhalte nach NAW-Schulmeinung (RettSan-Rolle).
   start: Vitalwerte · problems: was behandelt werden muss (letter = xABCDE, blocking = muss vor späteren Buchstaben behandelt sein)
   findings/answers/effects: Text oder Funktion(s) · required: was am Ende Punkte bringt · quizzes: Reihenfolge- oder MC-Fragen */
(function () {
  'use strict';

  const C = [];

  /* ------------------------------------------------------------ 1 ACS */
  C.push({
    id: 'acs', icon: '🏠', short: 'Brustschmerz, 62 J.', level: 1,
    dispatch: 'RTW, Brustschmerz. Männlich, 62 Jahre, Wohnung im 3. OG. Die Ehefrau hat angerufen.',
    start: { hr: 92, rhythm: 'stemi', spo2: 95, sys: 145, dia: 90, af: 20, bz: 132, temp: 36.7, gcs: 15,
      status: 'Sitzt blass und kaltschweißig auf dem Sofa, drückt eine Hand auf die Brust und wirkt sehr ängstlich.' },
    problems: [
      { id: 'acs', letter: 'C', label: 'Verdacht auf akutes Koronarsyndrom', fixedBy: [], worsen: { hr: 0.6, sys: -1 } },
    ],
    findings: {
      ansprechen: 'Er antwortet klar, aber kurzatmig: „Es drückt so furchtbar.“',
      c_puls: 'Regelmäßig, kräftig.',
      c_rekap: 'Rekap 2 s. Haut blass, kalt und schweißig.',
      c_rr: 'Rechts und links gleich.',
      c_12: '12-Kanal-EKG: ST-Hebungen in II, III und aVF, spiegelbildliche Senkungen in I und aVL. → Hinterwand-STEMI!',
      e_body: 'Keine Ödeme, keine Verletzungen.',
    },
    answers: {
      q_s: '„Es drückt auf der Brust, als ob ein Elefant draufsitzt. Und mir ist übel.“',
      q_a: '„Nicht dass ich wüsste.“',
      q_m: '„Ramipril für den Blutdruck und Simvastatin. Ach ja, und manchmal Viagra, aber nicht heute.“',
      q_p: '„Bluthochdruck und zu hohes Cholesterin.“',
      q_l: '„Frühstück vor drei Stunden.“',
      q_e: '„Ich hab Rasen gemäht, dann fing das an. Hingesetzt, aber es geht nicht weg.“',
      q_r: '„Ich rauche seit 40 Jahren. Mein Vater hatte mit 60 einen Herzinfarkt.“',
      q_o: '„Vor etwa 40 Minuten, ganz plötzlich bei der Gartenarbeit.“',
      q_pr: '„Ausruhen hilft nicht. Beim Atmen ändert es sich nicht.“',
      q_q: '„Drückend, eng, wie ein Ring um die Brust.“',
      q_rad: '„In den linken Arm und in den Unterkiefer.“',
      q_sev: '„8 von 10.“',
      q_t: '„So schlimm noch nie. Beim Treppensteigen zieht es manchmal ein bisschen.“',
    },
    effects: {
      m_ok_hoch: { text: 'Er sitzt bequem mit erhöhtem Oberkörper und atmet etwas ruhiger.', delta: { hr: -3 } },
      m_ok30: { text: 'Oberkörper 30° hoch. Er liegt ruhiger.', delta: { hr: -2 } },
      m_betreuung: { text: 'Du erklärst, was ihr tut. Er wird etwas ruhiger.', delta: { hr: -4 } },
      m_defi_kleben: { text: 'Defi-Elektroden kleben. Reanimationsbereitschaft hergestellt.' },
      m_voranm: { text: 'Herzkatheterlabor ist informiert, das EKG wird vom NEF per Telemetrie geschickt.' },
      m_o2_mask: (s) => s.v.spo2 > 90 ? { pts: -5, why: 'Schulmeinung: Sauerstoff ist beim STEMI mit SpO₂ über 90 % kontraindiziert. Zu viel O₂ verengt die Herzkranzgefäße. O₂ nur bei Atemnot oder SpO₂ unter 90 %.' } : { text: 'O₂ läuft, die Sättigung steigt.', delta: { spo2: 4 } },
      m_o2_nb: (s) => s.v.spo2 > 90 ? { pts: -5, why: 'Schulmeinung: Sauerstoff ist beim STEMI mit SpO₂ über 90 % kontraindiziert, auch über die Nasenbrille.' } : { text: 'O₂ über Nasenbrille.', delta: { spo2: 2 } },
      m_laufen: { pts: -10, why: 'Patienten mit ACS nie laufen lassen: Jede Anstrengung erhöht den O₂-Bedarf des Herzens. Tragestuhl!', delta: { hr: 12 } },
      m_schock: { pts: -5, why: 'Keine Schocklage beim ACS: Das zusätzliche Blut belastet das kranke Herz.', delta: { hr: 4 } },
      m_ivz: { pts: -5, why: 'Beim stabilen ACS legt der RettSan keinen Zugang: Das NEF kommt, § 34 greift nicht. Zugang nur vorbereiten.' },
      m_trinken: { pts: -2, why: 'Nüchtern lassen: Mögliche Herzkatheter-Untersuchung, außerdem ist ihm übel.' },
      m_flach: { pts: -3, why: 'Flach liegen belastet das Herz und erschwert die Atmung. Oberkörper hoch.' },
    },
    required: [
      { any: ['m_ok_hoch', 'm_ok30'], pts: 5, label: 'Oberkörperhochlagerung', why: 'Entlastet das Herz und erleichtert die Atmung.' },
      { any: ['c_12'], pts: 10, label: '12-Kanal-EKG geschrieben', why: 'Nur das 12-Kanal-EKG zeigt den STEMI sicher.' },
      { any: ['m_nef'], pts: 10, label: 'NEF nachalarmiert', why: 'ACS/STEMI: NA für Medikamente (ASS, Heparin, Schmerzmittel) und Transport mit Rea-Risiko.' },
      { any: ['m_defi_kleben', 'c_ekg'], pts: 5, label: 'Monitoring und Reanimationsbereitschaft', why: 'Beim STEMI drohen Kammerflimmern und Stillstand: Patches früh kleben.' },
      { any: ['c_rr'], pts: 5, label: 'Blutdruck gemessen (beidseits)', why: 'RR beidseits gehört zum ACS-Monitoring (Seitendifferenz → Aortendissektion?).' },
      { any: ['m_betreuung'], pts: 5, label: 'Patient beruhigt', why: 'Stress erhöht den O₂-Bedarf des Herzens.' },
      { any: ['m_voranm'], pts: 5, label: 'Klinik mit Herzkatheter vorangemeldet', why: 'Time is muscle: STEMI → direkt ins Herzkatheterlabor.' },
    ],
    quizzes: [
      { on: 'treat', type: 'order', q: 'Verdacht auf ACS. Bring die ersten Maßnahmen in eine sinnvolle Reihenfolge.',
        items: ['Oberkörper hoch lagern, nicht laufen lassen', 'Monitoring und 12-Kanal-EKG', 'Bei STEMI: NEF nachalarmieren', 'Defi-Elektroden kleben (Rea-Bereitschaft)', 'Klinik mit Herzkatheter voranmelden'] },
      { on: 'c_12', type: 'mc', q: 'Das EKG zeigt einen STEMI, die SpO₂ liegt bei 95 %, keine Atemnot. Gibst du Sauerstoff?',
        options: ['Ja, 15 l/min über Reservoirmaske, ein Herzinfarkt braucht immer O₂', 'Nein, bei STEMI mit SpO₂ über 90 % ist O₂ laut Schulmeinung kontraindiziert', 'Ja, 2 l über Nasenbrille, das schadet nie', 'Nur wenn der Patient es möchte'],
        answer: 1, explain: 'Schulmeinung: KI für O₂ beim STEMI mit SpO₂ über 90 %. Zu viel O₂ verengt die Herzkranzgefäße und bildet Sauerstoffradikale.' },
    ],
    diagnosis: { options: ['Akutes Koronarsyndrom: Hinterwand-STEMI', 'Lungenarterienembolie', 'Hypertensive Krise', 'Panikattacke'], answer: 0 },
    teach: [
      'Beim ACS: Oberkörper hoch, nicht laufen lassen, beruhigen, Monitoring, 12-Kanal-EKG, NEF, Defi-Patches.',
      'Sauerstoff nur bei Atemnot oder SpO₂ unter 90 % (Schulmeinung: KI bei STEMI mit SpO₂ über 90 %).',
      'Medikamente (ASS, Heparin, Opioide) gibt NotSan/NA, der RettSan bereitet den Zugang vor.',
    ],
  });

  /* ------------------------------------------------------------ 2 Hypoglykämie */
  C.push({
    id: 'hypo', icon: '🏢', short: 'Verwirrte Person im Büro, 34 J.', level: 1,
    dispatch: 'RTW, hilflose Person. Weiblich, 34 Jahre, Büro. Eine Kollegin ruft an: „Sie redet wirres Zeug.“',
    start: { hr: 108, rhythm: 'sinustachy', spo2: 98, sys: 135, dia: 85, af: 18, bz: 38, temp: 36.4, gcs: 14,
      status: 'Sitzt am Schreibtisch, schwitzt stark, zittert und ist gereizt. Sie antwortet langsam und durcheinander.' },
    answerer: (s) => s.v.gcs < 14 ? 'Kollegin' : null,
    problems: [
      { id: 'hypo', letter: 'D', label: 'Unterzuckerung', fixedBy: ['m_gluc_oral', 'm_gluc_iv'], worsen: { bz: -1.5 } },
    ],
    tick(s, api) {
      // Ohne Glucose trübt die Patientin nach ca. 6 Minuten ein (nur wenn Verschlechterung an).
      if (api.worsen && !s.fixed.hypo && s.time > 360 && !s.flags.eingetruebt) {
        s.flags.eingetruebt = true;
        s.v.gcs = 9; s.v.bz = Math.min(s.v.bz, 30); s.v.hr = 116;
        s.status = 'Sie ist zusammengesackt, reagiert nur noch auf Schmerzreiz und schwitzt stark.';
        api.alert('Die Patientin trübt ein! Sie reagiert nur noch auf Schmerzreiz (GCS 9).');
      }
      if (s.fixed.hypo && s.flags.glucAt != null && s.time - s.flags.glucAt > 300 && !s.flags.erholt) {
        s.flags.erholt = true;
        s.v.bz = 96; s.v.gcs = 15; s.v.hr = 88;
        s.status = 'Sie ist wieder klar, etwas verlegen und fragt, was passiert ist.';
        api.info('Die Patientin wird wieder klar.');
      }
    },
    findings: {
      ansprechen: (s) => s.v.gcs >= 14 ? 'Sie schaut dich an, wirkt aber abwesend: „Lassen Sie mich… ich muss noch arbeiten.“' : 'Sie reagiert nicht auf Ansprache, nur auf Schmerzreiz mit Stöhnen.',
      a_check: (s) => s.v.gcs >= 14 ? 'Atemweg frei, sie spricht.' : 'Atemweg frei, aber Schutzreflexe vermindert. Aspirationsgefahr!',
      c_rekap: 'Rekap unter 2 s. Haut blass, feucht, kaltschweißig.',
      d_gcs: (s) => s.v.gcs >= 14 ? 'GCS 14 (Augen spontan, verwirrt, befolgt Aufforderungen). Sie schluckt sicher.' : 'GCS 9 (Augen auf Schmerz, unverständliche Laute, gezielte Abwehr).',
      d_befast: 'Keine Lähmung, kein hängender Mundwinkel. Sprache langsam, aber nicht verwaschen.',
      e_body: 'Insulinpumpe am Bauch. Kein Notfallausweis-Hinweis auf weitere Krankheiten.',
    },
    answers: {
      q_s: { pt: '„Mir ist so komisch… alles zittert.“', by: '„Sie war schon den ganzen Vormittag fahrig.“' },
      q_a: { pt: '„Nein…“', by: '„Weiß ich nicht.“' },
      q_m: { pt: '„Insulin… die Pumpe. Ich hab heute früh mehr gegeben, glaub ich…“', by: '„Sie hat so eine Insulinpumpe, sie ist Diabetikerin.“' },
      q_p: { pt: '„Diabetes Typ 1. Seit ich 12 bin.“', by: '„Diabetes, Typ 1 glaube ich.“' },
      q_l: { pt: '„Heute… noch nichts. Hatte keine Zeit.“', by: '„Sie hat die Mittagspause ausfallen lassen, Deadline.“' },
      q_e: { pt: '„Weiß nicht… mir ging es plötzlich so schlecht.“', by: '„Sie war seit einer halben Stunde komisch, dann hat sie mich angeschrien.“' },
      q_r: { pt: '„Ich war heute früh joggen.“', by: '„Sie war heute früh joggen, hat sie erzählt.“' },
      q_o: { pt: '„Vielleicht… vor einer halben Stunde?“', by: '„So vor 30 Minuten wurde sie komisch.“' },
    },
    effects: {
      m_gluc_oral: (s) => s.v.gcs >= 14
        ? Object.assign({ text: 'Sie trinkt in kleinen Schlucken ein Glas Saft (ca. 20 g Glucose) unter deiner Aufsicht.', fix: ['hypo'], after(st) { st.flags.glucAt = st.time; st.v.bz = 70; } },
          s.count.d_bz ? {} : { pts: -3, why: 'Erst BZ messen, dann Glucose: Ohne Messwert weißt du nicht, ob es wirklich eine Hypo ist (Indikation BZ unter 60 mg/dl).' })
        : { pts: -10, why: 'Bewusstseinsgetrübte Patienten bekommen nichts oral: Aspirationsgefahr! Hier: Seitenlage, NEF, Zugang vorbereiten.', delta: { spo2: -4 } },
      m_trinken: (s) => s.v.gcs >= 14 ? { text: 'Sie trinkt etwas Wasser. Das enthält aber keinen Zucker.' } : { pts: -10, why: 'Bewusstseinsgetrübte Patienten bekommen nichts zu trinken: Aspirationsgefahr!' },
      m_gluc_iv: (s) => s.v.gcs >= 14
        ? { pts: -5, why: 'Schulmeinung: Wache Patientin (GCS 14–15) bekommt Glucose oral. i.v. durch RettSan nur bei GCS 3 mit gefährdetem Atemweg (§ 34).', fix: ['hypo'], after(st) { st.flags.glucAt = st.time; st.v.bz = 80; } }
        : { pts: -3, why: 'Schulmeinung: Glucose i.v. durch RettSan nur bei GCS 3 mit gefährdetem Atemweg im Rahmen § 34. Bei GCS 9: Seitenlage, NEF, Zugang vorbereiten. Die Patientin reagiert trotzdem.', fix: ['hypo'], after(st) { st.flags.glucAt = st.time - 200; st.v.bz = 80; } },
      m_essen: (s) => s.flags.erholt ? { text: 'Sie isst ein Brot. Das hält den Zucker länger oben.' } : { text: 'Erst wenn sie wieder ganz wach ist und der BZ gestiegen ist.' },
      m_ssl: (s) => s.v.gcs < 14 ? { text: 'Stabile Seitenlage, Absaugbereitschaft. Atemweg geschützt.' } : { text: 'Sie wehrt sich: „Ich will sitzen bleiben!“' },
      m_ivz: (s) => s.v.gcs >= 14 ? { pts: -3, why: 'Bei wacher Patientin kein i.v.-Zugang durch RettSan: Glucose oral reicht.' } : { text: 'Zugang liegt.' },
    },
    required: [
      { any: ['d_bz'], pts: 10, label: 'Blutzucker gemessen', why: 'Jede Bewusstseinsstörung: BZ messen.' },
      { any: ['m_gluc_oral', 'm_gluc_iv'], pts: 10, label: 'Glucose gegeben', why: 'Schulmeinung: BZ unter 60 mg/dl → Glucose (wach: oral).' },
      { check: (s) => s.flags.glucAt != null && s.lastAt.d_bz > s.flags.glucAt, pts: 5, label: 'BZ nach der Gabe kontrolliert', why: 'Nach 5–10 Minuten BZ kontrollieren, ob die Gabe gereicht hat.' },
      { any: ['q_m', 'q_l', 'q_p'], pts: 5, label: 'Ursache erfragt (Insulin, Essen, Diabetes)', why: 'Insulin ohne Essen plus Sport: typische Hypo-Ursache.' },
      { any: ['m_essen'], pts: 5, label: 'Etwas Langwirksames essen lassen', why: 'Sonst rutscht der BZ wieder ab.' },
    ],
    quizzes: [
      { on: 'treat', type: 'order', q: 'Wache Diabetikerin mit Verdacht auf Hypo. Bring die Maßnahmen in die richtige Reihenfolge.',
        items: ['Blutzucker messen', 'Glucose oral (sie ist wach und schluckt sicher)', 'BZ nach 5–10 Minuten kontrollieren', 'Etwas Langwirksames essen lassen (z. B. Brot)'] },
    ],
    diagnosis: { options: ['Hypoglykämie', 'Schlaganfall', 'Alkoholintoxikation', 'Akute Psychose'], answer: 0 },
    teach: [
      'BZ unter 60 mg/dl (3,3 mmol/l) = Hypoglykämie (Schulmeinung, Erwachsene).',
      'Wach (GCS 14–15): Glucose oral oder gesüßtes Getränk. Bewusstseinsgetrübt: nichts oral (Aspiration), NEF.',
      'Glucose i.v. durch RettSan nur bei GCS 3 und gefährdetem Atemweg im Rahmen des § 34.',
      'Hypos können aussehen wie Schlaganfall, Rausch oder Psychose: Immer BZ messen!',
    ],
  });

  /* ------------------------------------------------------------ 3 Asthma */
  C.push({
    id: 'asthma', icon: '🌬️', short: 'Atemnot, 22 J.', level: 1,
    dispatch: 'RTW, Atemnot. Männlich, 22 Jahre, Studentenwohnheim.',
    start: { hr: 118, rhythm: 'sinustachy', spo2: 88, sys: 140, dia: 85, af: 28, bz: 110, temp: 36.9, gcs: 15,
      status: 'Sitzt vornübergebeugt auf der Bettkante, stützt die Arme auf die Knie und spricht nur in Satzfetzen. Beim Ausatmen hört man ein Pfeifen.' },
    problems: [
      { id: 'hypox', letter: 'B', blocking: true, label: 'Atemnot mit SpO₂ 88 %', fixedBy: ['m_o2_mask', 'm_o2_nb'], worsen: { spo2: -0.8, hr: 1.5, af: 0.5 } },
    ],
    findings: {
      ansprechen: '„Krieg… keine… Luft.“',
      a_check: 'Atemweg frei, er spricht aber nur 2–3 Wörter am Stück.',
      b_af: 'Atemhilfsmuskulatur arbeitet, Ausatmung deutlich verlängert.',
      b_ausk: 'Giemen und Brummen über beiden Lungen, verlängertes Ausatmen.',
      c_rekap: 'Rekap unter 2 s, Haut rosig, leicht schweißig.',
    },
    answers: {
      q_s: '„Luft… geht nicht raus.“',
      q_a: '„Katzen… und Pollen.“',
      q_m: '„Salbutamol-Spray… vom Arzt… hab’s erst nicht gefunden. Und Kortisonspray.“',
      q_p: '„Asthma… seit Kindheit.“',
      q_l: '„Mittag.“',
      q_e: '„War bei Freunden… die haben ’ne Katze.“',
      q_r: '„Rauch nicht.“',
      q_o: '„Vor einer… halben Stunde.“',
      q_t: '„Kenn ich… aber so schlimm… lange nicht.“',
    },
    effects: {
      m_ok_hoch: { text: 'Er bleibt aufrecht sitzen und stützt die Arme ab (Kutschersitz).', delta: { af: -1 } },
      m_lippen: { text: 'Du atmest mit ihm: Durch die Nase ein, langsam gegen die locker geschlossenen Lippen aus. Er wird etwas ruhiger.', delta: { af: -3, spo2: 1 } },
      m_betreuung: { text: 'Fenster auf, enge Kleidung geöffnet, ruhig zureden.', delta: { hr: -3 } },
      m_o2_mask: { text: 'Reservoirmaske mit 15 l/min. Hoch anfangen, später nach SpO₂ reduzieren.', delta: { spo2: 6 } },
      m_o2_nb: { text: 'Nasenbrille. Das reicht bei dieser Atemnot nur knapp.', delta: { spo2: 3 } },
      m_spray: (s) => {
        if (s.v.hr > 140) return { pts: -5, why: 'KI für das β₂-Spray: HF über 140/min.' };
        const asked = s.count.q_m || s.count.q_p;
        const out = { text: 'Er nimmt 2 Hübe seines eigenen Salbutamol-Sprays. Nach ein paar Minuten wird das Pfeifen leiser.', delta: { spo2: 4, af: -6, hr: 8 }, after(st) { st.status = 'Sitzt aufrecht, atmet deutlich ruhiger und kann wieder ganze Sätze sprechen.'; } };
        if (!asked) { out.pts = -3; out.why = 'Vor der Hilfe beim Spray abfragen: bekanntes Asthma, ärztlich verordnet, kennt die Anwendung.'; }
        return out;
      },
      m_flach: { pts: -10, why: 'Patienten mit Atemnot nie hinlegen: Die Atemhilfsmuskulatur kann dann nicht mithelfen.', delta: { spo2: -3 } },
      m_laufen: { pts: -10, why: 'Bei Atemnot nicht laufen lassen: Jede Anstrengung verbraucht Sauerstoff.', delta: { spo2: -3 } },
    },
    required: [
      { any: ['m_ok_hoch'], pts: 5, label: 'Atemerleichternde Sitzhaltung', why: 'Kutschersitz: Die Atemhilfsmuskulatur kann mitarbeiten.' },
      { any: ['m_o2_mask', 'm_o2_nb'], pts: 10, label: 'Sauerstoff gegeben', why: 'Atemnot mit SpO₂ unter 92 % → O₂ (Schulmeinung). Hoch anfangen, dann reduzieren.' },
      { any: ['m_lippen'], pts: 5, label: 'Lippenbremse angeleitet', why: 'Gegendruck hält die Bronchien beim Ausatmen offen.' },
      { any: ['m_spray'], pts: 10, label: 'Hilfe beim eigenen Notfallspray', why: 'Erlaubt bei bekanntem Asthma, verordnetem Spray, Patient kennt Anwendung; max. 2 Hübe.' },
      { any: ['m_nef'], pts: 5, label: 'NEF nachalarmiert', why: 'Schwerer Anfall (SpO₂ 88 %, Satzfetzen): NA für vernebelte Medikamente und Kortison.' },
    ],
    quizzes: [
      { on: 'treat', type: 'mc', q: 'Wann darfst du als RettSan beim eigenen Notfallspray des Patienten helfen?',
        options: ['Erwachsener mit bekanntem Asthma/COPD, Spray ärztlich verordnet, Patient kennt die Anwendung; max. 2 Hübe', 'Immer bei Atemnot, so viele Hübe wie nötig', 'Nur nach Rücksprache mit der Leitstelle, max. 4 Hübe', 'Bei HF über 140/min, weil das Spray den Puls senkt'],
        answer: 0, explain: 'Schulmeinung: alle drei Bedingungen, max. 2 Hübe. KI: HF über 140/min und pectanginöse Beschwerden.' },
    ],
    diagnosis: { options: ['Asthmaanfall', 'Anaphylaxie', 'Hyperventilation', 'Lungenödem'], answer: 0 },
    teach: [
      'Asthma: sitzen lassen (Kutschersitz), Lippenbremse, O₂ bei SpO₂ unter 92 %, Hilfe beim eigenen Spray (max. 2 Hübe).',
      'Giemen und verlängertes Ausatmen = Enge in den unteren Atemwegen.',
      'Persistierende oder schwere Atemnot → NEF.',
    ],
  });

  /* ------------------------------------------------------------ 4 Anaphylaxie */
  C.push({
    id: 'anaphylaxie', icon: '🐝', short: 'Nach Wespenstich, 45 J.', level: 2,
    dispatch: 'RTW, allergische Reaktion. Weiblich, 45 Jahre, Biergarten, nach einem Wespenstich.',
    start: { hr: 132, rhythm: 'sinustachy', spo2: 91, sys: 78, dia: 45, af: 26, bz: 120, temp: 37.0, gcs: 14,
      status: 'Liegt auf einer Bank, Gesicht und Hals sind rot und geschwollen, überall Quaddeln. Sie ist unruhig: „Ich krieg so schlecht Luft.“' },
    problems: [
      { id: 'hypox', letter: 'B', blocking: true, label: 'Atemnot mit SpO₂ 91 %', fixedBy: ['m_o2_mask'], worsen: { spo2: -0.8 } },
      { id: 'schock', letter: 'C', blocking: true, label: 'Anaphylaktischer Schock (RR 78/45)', fixedBy: ['m_epipen'], worsen: { sys: -2.5, dia: -1.5, hr: 2 } },
    ],
    findings: {
      sss: 'Es fliegen noch Wespen um den Tisch. Patientin vom Tisch wegbringen, Getränke abdecken.',
      a_check: 'Atemweg frei, Stimme leicht heiser, Zunge nicht geschwollen.',
      b_af: 'Atemhilfsmuskulatur arbeitet.',
      b_ausk: 'Leises Giemen über beiden Lungen.',
      c_puls: 'Schnell, flach, schwer tastbar.',
      c_rekap: 'Rekap 3 s. Haut gerötet, warm, Quaddeln.',
      e_body: 'Einstichstelle am rechten Unterarm, der Stachel steckt noch! Quaddeln am ganzen Körper.',
    },
    answers: {
      q_s: '„Alles juckt, mir ist schwindelig und die Luft wird knapp.“',
      q_a: '„Ich weiß, dass ich auf Wespen allergisch bin. Ich hab so einen Pen, aber der liegt zu Hause.“',
      q_m: '„Nur die Pille.“',
      q_p: '„Wespengiftallergie, sonst nichts.“',
      q_e: '„Die Wespe saß am Glas, hat mich am Arm gestochen, und nach fünf Minuten fing das an.“',
      q_o: '„Vor zehn Minuten.“',
    },
    effects: {
      m_allergen: { needs: ['e_body', 'q_e'], needText: 'Du weißt noch nicht, wo oder was das Allergen ist. Erst untersuchen (Bodycheck) oder fragen, was passiert ist.', text: 'Stachel mit dem Fingernagel weggewischt (nicht drücken), Stichstelle gekühlt.' },
      m_o2_mask: { text: 'O₂ 15 l/min über Reservoirmaske.', delta: { spo2: 5 } },
      m_o2_nb: { pts: -2, why: 'Bei Anaphylaxie hochdosiert: 15 l/min über Reservoirmaske (Schulmeinung).', delta: { spo2: 2 } },
      m_schock: { text: 'Beine hoch. Sie wird etwas klarer, die Atemnot bleibt aber.', delta: { sys: 8, dia: 4, hr: -4 } },
      m_ok_hoch: { pts: -5, why: 'Schulmeinung: Bei instabilem Kreislauf hat der Schock Vorrang vor der Atemnot → Schocklage, wenn sie toleriert wird.', delta: { sys: -8, hr: 6 } },
      m_epipen: (s) => {
        const o = { text: 'Autoinjektor in den seitlichen Oberschenkel, 10 Sekunden halten. Nach 2 Minuten: Puls sinkt, Blutdruck steigt, die Atmung wird freier.', delta: { sys: 28, dia: 16, hr: -18, spo2: 3 }, after(st) { st.status = 'Liegt mit erhöhten Beinen, wirkt wacher. Die Quaddeln sind noch da, sie atmet freier.'; st.v.gcs = 15; } };
        if (!s.count.m_nef) { o.pts = -5; o.why = '§ 34 StGB: Voraussetzung ist, dass das NEF nachalarmiert ist. Erst NEF, dann Adrenalin.'; }
        return o;
      },
      m_ivz: { text: 'PVK liegt (§ 34: Stadium III, NEF ist alarmiert).' },
      m_vel: (s) => s.count.m_ivz ? { text: 'VEL läuft im Schuss (500–1000 ml).', delta: { sys: 6, hr: -3 } } : { text: 'Ohne Zugang keine Infusion.', nopts: true },
      m_laufen: { pts: -10, why: 'Schockpatienten nie aufstehen lassen: Gefahr des plötzlichen Kreislaufstillstands („empty heart“).', delta: { sys: -15 } },
      m_trinken: { pts: -3, why: 'Bei drohender Schwellung im Hals nichts zu trinken geben.' },
    },
    required: [
      { any: ['m_allergen'], pts: 5, label: 'Allergenzufuhr gestoppt', why: 'Stachel weg, sonst wird weiter Gift abgegeben.' },
      { any: ['m_nef'], pts: 10, label: 'NEF nachalarmiert', why: 'Anaphylaktischer Schock: lebensbedrohlich, NA nötig.' },
      { any: ['m_o2_mask'], pts: 5, label: 'O₂ 15 l/min', why: 'Schulmeinung: hochdosiert über Reservoirmaske.' },
      { any: ['m_schock'], pts: 5, label: 'Schocklage', why: 'Instabiler Kreislauf: Schock hat Vorrang vor Atemnot.' },
      { any: ['m_epipen'], pts: 10, label: 'Adrenalin 0,3 mg i.m. (Autoinjektor)', why: 'Stadium III: Adrenalin i.m. ist das wichtigste Medikament, RettSan im Rahmen § 34.' },
      { all: ['m_ivz', 'm_vel'], pts: 5, label: 'Zugang und VEL-Infusion', why: 'Schulmeinung Stadium III: PVK + VEL 500–1000 ml.' },
    ],
    quizzes: [
      { on: 'treat', type: 'order', q: 'Anaphylaktischer Schock nach Wespenstich. Bring die Maßnahmen in die Reihenfolge der Schulmeinung.',
        items: ['Allergenzufuhr stoppen (Stachel wegwischen)', 'NEF nachalarmieren', 'Sauerstoff 15 l/min', 'Schocklage', 'Adrenalin 0,3 mg i.m. per Autoinjektor (§ 34)'] },
    ],
    diagnosis: { options: ['Anaphylaxie Stadium III (anaphylaktischer Schock)', 'Asthmaanfall', 'Lokale Stichreaktion', 'Septischer Schock'], answer: 0 },
    teach: [
      'Anaphylaxie Stadium III: Allergen stoppen, NEF, O₂ 15 l, Schocklage (Schock vor Atemnot), Adrenalin 0,3 mg i.m. (§ 34), PVK + VEL.',
      'Adrenalin i.m. ist sicher. Zögern tötet, Antihistaminika ersetzen kein Adrenalin.',
      'Patienten im Schock nie aufstehen lassen („empty heart“).',
    ],
  });

  /* ------------------------------------------------------------ 5 Schlaganfall */
  C.push({
    id: 'stroke', icon: '🛋️', short: 'Sprachstörung, 71 J.', level: 1,
    dispatch: 'RTW, Sprachstörung. Weiblich, 71 Jahre, Seniorenwohnung. Die Tochter ruft an.',
    start: { hr: 88, rhythm: 'vhf', spo2: 96, sys: 175, dia: 95, af: 16, bz: 124, temp: 36.8, gcs: 14,
      status: 'Sitzt im Sessel. Der rechte Mundwinkel hängt, sie spricht verwaschen und findet die Wörter nicht. Der rechte Arm liegt schlaff auf der Lehne.' },
    answerer: () => 'Tochter',
    problems: [
      { id: 'stroke', letter: 'D', label: 'Verdacht auf Schlaganfall', fixedBy: [] },
    ],
    findings: {
      ansprechen: 'Sie versucht zu antworten, aber es kommt nur: „Ja… das… Dings…“',
      c_puls: 'Unregelmäßig!',
      c_12: 'Absolute Arrhythmie bei Vorhofflimmern, keine ST-Hebungen.',
      d_gcs: 'GCS 14 (Augen spontan, verwirrte Sprache, befolgt Aufforderungen links).',
      d_pup: 'Pupillen gleich groß, prompte Lichtreaktion.',
      d_befast: 'B: Stehen nicht möglich. E: Sehen unauffällig. F: rechter Mundwinkel hängt. A: rechter Arm sinkt sofort ab. S: verwaschen, Wortfindungsstörung. T: zuletzt gesund um 9:15 Uhr (vor 45 Minuten).',
      e_body: 'Keine Sturzverletzungen.',
    },
    answers: {
      q_s: '„Sie kann nicht mehr richtig sprechen und der rechte Arm hängt.“',
      q_a: '„Keine.“',
      q_m: '„Ramipril und eigentlich Apixaban, ein Blutverdünner. Den vergisst sie aber oft.“',
      q_p: '„Bluthochdruck und Vorhofflimmern.“',
      q_l: '„Frühstück um acht.“',
      q_e: '„Um 9:15 haben wir telefoniert, da war alles normal. Um halb zehn kam ich her, da war es so.“',
      q_o: '„Zuletzt normal war sie um 9:15 Uhr am Telefon.“',
      q_t: '„So was hatte sie noch nie.“',
    },
    effects: {
      m_ok30: { text: 'Oberkörper 30° hoch gelagert.' },
      m_ok_hoch: { text: 'Oberkörper hoch gelagert.' },
      m_zeit: { needs: ['q_o', 'q_e', 'q_t'], needText: 'Welche Uhrzeit willst du notieren? Frag erst, wann sie zuletzt gesund gesehen wurde.', text: 'Notiert: zuletzt gesund gesehen 9:15 Uhr. Das Zeitfenster für Lyse (bis 4,5 h) und Thrombektomie ist offen.' },
      m_voranm: { text: 'Stroke Unit ist vorangemeldet: Symptome, Zeitfenster, Antikoagulation, Telefonnummer der Tochter.' },
      m_betreuung: { text: 'Du erklärst ihr ruhig, was ihr tut. Die Tochter packt Medikamentenplan und Arztbriefe ein.' },
      m_ivz: { pts: -5, why: 'Schulmeinung: Kein i.v.-Zugang durch RettSan beim kreislaufstabilen Schlaganfall. Invasive Maßnahme ohne Rechtsgrundlage.' },
      m_trinken: { pts: -5, why: 'Schluckstörung möglich → Aspiration. Nichts zu essen oder zu trinken.' },
      m_gluc_oral: { pts: -5, why: 'BZ ist normal, und mit Schluckstörung nichts oral.' },
      m_laufen: { pts: -5, why: 'Mit Halbseitenlähmung nicht laufen lassen: Sturzgefahr.' },
    },
    required: [
      { any: ['d_bz'], pts: 10, label: 'Blutzucker gemessen', why: 'Fixierungsfehler vermeiden: Eine Hypo kann wie ein Schlaganfall aussehen.' },
      { any: ['d_befast'], pts: 10, label: 'BE-FAST geprüft', why: 'Strukturierter Schlaganfall-Test.' },
      { any: ['m_zeit', 'q_o', 'q_e'], pts: 10, label: 'Zeitfenster erfragt', why: 'Lyse bis 4,5 h, Thrombektomie bis ca. 6 h: Ohne Uhrzeit keine Therapieentscheidung.' },
      { any: ['m_ok30', 'm_ok_hoch'], pts: 5, label: 'Oberkörper 30° hoch', why: 'Bei ansprechbaren Patienten Oberkörper ca. 30° hoch.' },
      { any: ['m_voranm'], pts: 10, label: 'Stroke Unit vorangemeldet', why: 'Time is brain: Die Klinik bereitet das CT vor.' },
    ],
    quizzes: [
      { on: 'treat', type: 'mc', q: 'Bevor du „Schlaganfall“ sagst: Was musst du unbedingt gemessen haben?',
        options: ['Blutzucker', 'Temperatur', 'Blutdruck an beiden Armen', 'Sauerstoffsättigung'], answer: 0,
        explain: 'Eine Hypoglykämie kann genau wie ein Schlaganfall aussehen (Fixierungsfehler).' },
    ],
    diagnosis: { options: ['Schlaganfall (Zeitfenster offen)', 'Hypoglykämie', 'Krampfanfall mit Lähmung danach', 'Hypertensive Krise'], answer: 0,
      guard: (s) => !s.count.d_bz ? { pts: -5, why: 'Fixierungsfehler: Diagnose Schlaganfall ohne BZ-Messung.' } : null },
    teach: [
      'BE-FAST: Balance, Eyes, Face, Arms, Speech, Time.',
      'Immer BZ messen, Zeitfenster („zuletzt gesund gesehen“) erfragen, Stroke Unit voranmelden, zügig transportieren.',
      'Kein i.v.-Zugang durch RettSan beim stabilen Schlaganfall, nichts oral, Blutdruck nicht selbst senken.',
      'Vorhofflimmern ist eine häufige Ursache (Gerinnsel aus dem Vorhof).',
    ],
  });

  /* ------------------------------------------------------------ 6 Krampfanfall */
  C.push({
    id: 'krampf', icon: '⚡', short: 'Krampfanfall am Bahnsteig, 28 J.', level: 2,
    dispatch: 'RTW, Krampfanfall. Männlich, 28 Jahre, U-Bahnhof. Passanten rufen an.',
    start: { hr: 134, rhythm: 'sinustachy', spo2: 86, sys: 160, dia: 95, af: 8, bz: 98, temp: 37.2, gcs: 3,
      status: 'Liegt auf dem Bahnsteig und zuckt rhythmisch an Armen und Beinen, Schaum vor dem Mund, die Augen sind verdreht. Neben ihm eine Bank mit scharfer Kante.' },
    answerer: (s) => s.v.gcs >= 13 ? null : 'Passantin',
    problems: [
      { id: 'atemweg', letter: 'A', blocking: true, label: 'Schnarchende Atmung nach dem Anfall (Zunge)', fixedBy: ['m_ssl', 'm_esmarch'], active: (s) => s.flags.postiktal },
      { id: 'hypox', letter: 'B', label: 'SpO₂ niedrig', fixedBy: ['m_o2_mask', 'm_o2_nb'], active: (s) => s.flags.postiktal },
    ],
    tick(s, api) {
      if (!s.flags.postiktal && s.time >= 120) {
        s.flags.postiktal = true;
        s.v.hr = 108; s.v.spo2 = 90; s.v.af = 12; s.v.sys = 145; s.v.dia = 85; s.v.gcs = 8;
        s.status = 'Der Krampf hat aufgehört. Er liegt schlaff da, atmet schnarchend und reagiert auf Schmerz nur mit Stöhnen. Hose eingenässt.';
        api.alert('Der Krampf hat aufgehört (Dauer ca. 4 Minuten). Jetzt postiktal: schnarchende Atmung!');
      }
      if (s.flags.postiktal && s.fixed.atemweg && s.fixed.hypox && !s.flags.wach && s.time > 600) {
        s.flags.wach = true; s.v.gcs = 13; s.v.hr = 92;
        s.status = 'Er wird langsam wacher, ist noch desorientiert und müde.';
        api.info('Der Patient wird langsam wacher.');
      }
    },
    findings: {
      sss: 'Bahnsteig: Abstand zur Bahnsteigkante! Passanten zurückhalten, der Passant mit Handy filmt.',
      ansprechen: (s) => s.flags.postiktal ? 'Keine Antwort, nur Stöhnen auf Schmerzreiz.' : 'Keine Reaktion, er krampft.',
      x_check: 'Keine kritische Blutung. Platzwunde am Kinn, blutet leicht.',
      a_check: (s) => !s.flags.postiktal ? 'Schaum vor dem Mund, Zähne zusammengebissen. Nichts in den Mund stecken!' : s.fixed.atemweg ? 'Atemweg frei, Speichel läuft ab.' : 'Schnarchende Atmung: Die Zunge ist zurückgefallen!',
      b_af: (s) => !s.flags.postiktal ? 'Kaum effektive Atmung während des Krampfens.' : 'Atmung flach.',
      c_rr: (s) => !s.flags.postiktal ? 'Während des Krampfens nicht sinnvoll messbar.' : '',
      d_gcs: (s) => s.flags.postiktal ? (s.v.gcs >= 13 ? 'GCS 13, desorientiert.' : 'GCS 8 (Augen auf Schmerz, Stöhnen, Abwehr).') : 'GCS 3, krampft.',
      d_pup: 'Pupillen weit, gleich groß, träge Reaktion.',
      e_body: 'Zungenbiss seitlich, Platzwunde am Kinn, eingenässt. Keine weiteren Verletzungen. Im Portemonnaie ein Epilepsie-Ausweis.',
    },
    answers: {
      q_s: { pt: '„Kopf tut weh… so müde.“', by: '„Er ist einfach umgefallen und hat angefangen zu zucken.“' },
      q_m: { pt: '„Levetiracetam… hab ich die letzten Tage vergessen.“', by: '„Keine Ahnung, ich kenn ihn nicht.“' },
      q_p: { pt: '„Epilepsie, seit Jahren.“', by: '„Weiß ich nicht.“' },
      q_e: { pt: '„Weiß nichts mehr… war gestern lange feiern.“', by: '„Er stand an der Bahnsteigkante, ist umgekippt und hat gezuckt. Vor vielleicht zwei Minuten.“' },
      q_o: { pt: '„Weiß nicht…“', by: '„Kurz bevor ich angerufen habe.“' },
    },
    effects: {
      m_polster: (s) => s.flags.postiktal ? { text: 'Umgebung ist sicher.' } : { text: 'Bank weggeschoben, Jacke unter den Kopf. Er schlägt sich nicht mehr an.' },
      m_zeit: { text: 'Uhrzeit notiert: Beginn laut Passantin vor ca. 2 Minuten.' },
      m_absaug: { text: 'Absaug- und Beatmungsbereitschaft hergestellt.' },
      m_festhalten: { pts: -10, why: 'Krampfende Patienten nie festhalten: Verletzungsgefahr (Brüche, Luxationen) für Patient und Helfer.' },
      m_beisskeil: { pts: -10, why: 'Kein Beißkeil, nichts in den Mund: Zähne brechen, Verletzungsgefahr für Helfer, Aspiration.' },
      m_ssl: (s) => s.flags.postiktal ? { text: 'Stabile Seitenlage, Speichel läuft ab, das Schnarchen hört auf.', delta: { spo2: 3 } } : { text: 'Während des Krampfens nicht möglich. Warte, bis der Anfall vorbei ist.', nopts: true, noCount: true },
      m_esmarch: (s) => s.flags.postiktal ? { text: 'Esmarch: Das Schnarchen hört auf.', delta: { spo2: 2 } } : { text: 'Während des Krampfens nicht möglich.', nopts: true, noCount: true },
      m_o2_mask: (s) => ({ text: 'O₂ über Reservoirmaske.', delta: { spo2: s.flags.postiktal ? 6 : 1 } }),
      m_o2_nb: (s) => ({ text: 'O₂ über Nasenbrille.', delta: { spo2: s.flags.postiktal ? 4 : 1 } }),
      m_guedel: (s) => s.flags.postiktal ? { pts: -3, why: 'Bei erhaltenen Schutzreflexen würgt er am Guedel-Tubus. Seitenlage reicht.' } : { pts: -5, why: 'Nichts in den Mund des Krampfenden!' },
      m_trinken: { pts: -5, why: 'Nichts oral bei Bewusstseinstrübung.' },
    },
    required: [
      { any: ['sss'], pts: 5, label: 'Gefahr Bahnsteigkante erkannt', why: 'Eigenschutz und Patientenschutz zuerst.' },
      { any: ['m_polster'], pts: 5, label: 'Vor Verletzungen geschützt', why: 'Umgebung sichern, Kopf polstern.' },
      { any: ['m_zeit'], pts: 5, label: 'Zeit gestoppt', why: 'Dauer über 5 Minuten = Status epilepticus, Medikamente durch NA/NotSan.' },
      { any: ['m_absaug'], pts: 5, label: 'Absaugbereitschaft', why: 'Speichel, Erbrochenes nach dem Anfall.' },
      { any: ['m_nef'], pts: 5, label: 'NEF alarmiert', why: 'Folie Tag 8: NEF alarmieren.' },
      { any: ['d_bz'], pts: 10, label: 'Blutzucker gemessen', why: 'Hypoglykämie kann Krampfanfälle auslösen.' },
      { check: (s) => s.fixed.atemweg, pts: 10, label: 'Nach dem Anfall Atemweg gesichert (Seitenlage)', why: 'Postiktal: Zunge fällt zurück, Aspirationsgefahr.' },
      { any: ['m_o2_mask', 'm_o2_nb'], pts: 5, label: 'Sauerstoff nach dem Anfall', why: 'Folie: nach dem Anfall O₂.' },
      { any: ['e_body'], pts: 5, label: 'Nach Verletzungen gesucht', why: 'Zungenbiss, Sturzverletzungen.' },
    ],
    quizzes: [
      { on: 'treat', type: 'mc', q: 'Er krampft noch. Was tust du jetzt NICHT?',
        options: ['Kopf polstern, Umgebung sichern', 'Uhrzeit merken', 'Festhalten und einen Beißkeil einlegen', 'Absaugbereitschaft herstellen'], answer: 2,
        explain: 'Nie festhalten, kein Beißkeil: Verletzungsgefahr und Aspiration.' },
    ],
    diagnosis: { options: ['Generalisierter Krampfanfall bei bekannter Epilepsie', 'Hypoglykämie', 'Synkope', 'Alkoholintoxikation'], answer: 0 },
    teach: [
      'Im Anfall: nicht festhalten, kein Beißkeil, Kopf polstern, Uhrzeit, Absaugbereitschaft, NEF, BZ.',
      'Nach dem Anfall: Seitenlage, O₂, nach Verletzungen suchen (Zungenbiss).',
      'Über 5 Minuten = Status epilepticus → Benzodiazepine durch NotSan/NA.',
    ],
  });

  /* ------------------------------------------------------------ 7 Polytrauma */
  C.push({
    id: 'poly', icon: '🏍️', short: 'Motorradunfall, ca. 30 J.', level: 3,
    dispatch: 'RTW, VU Motorrad gegen Pkw. Männlich, ca. 30 Jahre, Landstraße. Die Polizei ist noch nicht vor Ort.',
    start: { hr: 128, rhythm: 'sinustachy', spo2: 91, sys: 88, dia: 55, af: 26, bz: 118, temp: 35.9, gcs: 14,
      status: 'Liegt neben dem Motorrad auf der Fahrbahn, Helm noch auf. Er stöhnt, aus dem rechten Oberschenkel spritzt hellrotes Blut. Autos fahren langsam vorbei.' },
    sssPts: 5,
    problems: [
      { id: 'blutung', letter: 'x', blocking: true, label: 'Spritzende Blutung am Oberschenkel', fixedBy: ['m_tq'], worsen: { hr: 4, sys: -6, dia: -4 } },
      { id: 'hws', letter: 'A', blocking: true, label: 'HWS nicht fixiert (Hochrasanztrauma)', fixedBy: ['m_hws'] },
      { id: 'hypox', letter: 'B', blocking: true, label: 'SpO₂ 91 % beim Polytrauma', fixedBy: ['m_o2_mask'], worsen: { spo2: -0.5 } },
      { id: 'becken', letter: 'C', blocking: true, label: 'Instabiles Becken', fixedBy: ['m_becken'], worsen: { sys: -1.5, hr: 1 } },
      { id: 'kaelte', letter: 'E', label: 'Auskühlung', fixedBy: ['m_waerme'], worsen: { temp: -0.08 } },
    ],
    tick(s, api) {
      if (api.worsen && s.v.sys < 70 && !s.flags.eingetruebt) {
        s.flags.eingetruebt = true; s.v.gcs = 10;
        s.status = 'Er wird ruhiger und blasser, die Augen fallen zu. Er reagiert nur noch auf laute Ansprache.';
        api.alert('Der Patient trübt ein: Der Blutverlust ist zu groß!');
      }
    },
    findings: {
      sss: 'Fließender Verkehr! RTW schräg als Schutz stellen, Warnweste, Warnblinker. Polizei über die Leitstelle nachfordern. Jetzt ist es sicher.',
      ansprechen: 'Er stöhnt: „Mein Bein… mein Bein!“',
      x_check: (s) => s.fixed.blutung ? 'Blutung steht (Tourniquet).' : 'Spritzende, pulsierende Blutung am rechten Oberschenkel. Lebensbedrohlich!',
      a_check: 'Atemweg frei, er spricht. Der Helm muss zu zweit abgenommen werden, dabei HWS fixieren.',
      b_af: 'Atmung flach, rechts Schonatmung.',
      b_ausk: 'Atemgeräusch beidseits vorhanden, rechts etwas leiser.',
      c_puls: 'Schnell, flach, an der Speichenarterie kaum tastbar.',
      c_rekap: 'Rekap 4 s. Blass, kaltschweißig.',
      c_5b: 'Brustkorb: Prellmarke rechts. Bauch: weich. Becken: starke Schmerzen, nach KISS instabil (nicht durchdrücken!). Beine: rechter Oberschenkel fehlgestellt. Boden: große Blutlache.',
      d_gcs: (s) => `GCS ${s.v.gcs}.`,
      e_body: 'Schürfwunden, Fehlstellung rechter Oberschenkel, Prellmarke rechter Thorax. Er zittert.',
    },
    answers: {
      q_s: '„Das Bein! Und das Becken tut so weh.“',
      q_a: '„Nein.“',
      q_m: '„Nein.“',
      q_p: '„Nein, gesund.“',
      q_e: '„Der ist einfach rausgezogen… ich bin voll drauf.“',
      q_l: '„Mittag.“',
    },
    effects: {
      m_abdr: { text: 'Abdrücken in der Leiste: Die Blutung wird schwächer, aber du kannst nicht dauerhaft drücken.', delta: { hr: -2 } },
      m_druckv: { text: 'Der Druckverband ist sofort durchgeblutet. Das reicht hier nicht!' },
      m_tq: { text: 'Tourniquet oberhalb der Wunde, festgezogen bis die Blutung steht. Uhrzeit notiert.', delta: { hr: -4 }, after(st) { st.status = 'Die Blutung steht. Er ist blass und zittert, stöhnt vor Schmerzen im Becken.'; } },
      m_hws: { text: 'Kollege fixiert die HWS manuell, Helm zu zweit abgenommen, Stifneck angelegt.' },
      m_o2_mask: { text: 'O₂ 15 l/min über Reservoirmaske.', delta: { spo2: 6 } },
      m_o2_nb: { pts: -2, why: 'Polytrauma: hochdosiert O₂, 15 l/min über Reservoirmaske (Schulmeinung).', delta: { spo2: 2 } },
      m_becken: { needs: ['c_5b', 'e_body', 'q_s'], needText: 'Woher weißt du, dass das Becken verletzt ist? Erst die Blutungsräume (5 B) prüfen oder fragen, wo es wehtut.', text: 'Beckenschlinge in Höhe der Trochanter angelegt. Der Schmerz lässt etwas nach.', delta: { sys: 6, hr: -3 } },
      m_schock: { pts: -5, why: 'Bei Verdacht auf Becken- oder Wirbelsäulenverletzung keine Schocklage (Schulmeinung).' },
      m_waerme: { text: 'Rettungsdecke und Wolldecke, RTW-Heizung hoch.' },
      m_voranm: { text: 'Überregionales Traumazentrum (Schockraum) ist vorangemeldet.' },
      m_ivz: { text: 'Zugang liegt.' },
      m_vel: (s) => s.count.m_ivz ? { text: 'VEL läuft.', delta: { sys: 5 } } : { text: 'Ohne Zugang keine Infusion.', nopts: true },
      m_laufen: { pts: -10, why: 'Polytrauma: Nichts aktiv bewegen, Vakuummatratze.' },
      m_trinken: { pts: -3, why: 'Traumapatienten nüchtern lassen (OP).' },
      m_ssl: { pts: -5, why: 'Wach, Wirbelsäule nicht abgeklärt: keine Seitenlage.' },
    },
    required: [
      { any: ['sss'], pts: 5, label: 'Einsatzstelle abgesichert', why: 'Fließender Verkehr: Eigenschutz geht vor.' },
      { any: ['m_tq'], pts: 10, label: 'Kritische Blutung mit Tourniquet gestoppt', why: 'x vor A: Ein Druckverband reicht bei spritzender Oberschenkelblutung oft nicht.' },
      { any: ['m_hws'], pts: 5, label: 'HWS fixiert', why: 'Hochrasanztrauma: HWS bis zum Ausschluss fixieren.' },
      { any: ['m_o2_mask'], pts: 5, label: 'O₂ 15 l/min', why: 'Schulmeinung: Polytrauma ist eine O₂-Indikation (hochdosiert).' },
      { any: ['m_becken'], pts: 10, label: 'Beckenschlinge', why: 'Instabiles Becken: Hier kann man innerlich verbluten.' },
      { any: ['m_nef'], pts: 10, label: 'NEF nachalarmiert', why: 'Polytrauma im Schock.' },
      { any: ['m_waerme'], pts: 5, label: 'Wärmeerhalt', why: 'Kälte verschlechtert die Blutgerinnung (letale Trias).' },
      { any: ['m_voranm'], pts: 5, label: 'Traumazentrum vorangemeldet', why: 'Schockraum vorbereiten.' },
    ],
    quizzes: [
      { on: 'treat', type: 'order', q: 'Polytrauma auf der Landstraße. Bring die Maßnahmen in die xABCDE-Reihenfolge.',
        items: ['Einsatzstelle absichern (Verkehr!)', 'Kritische Blutung stoppen (Tourniquet)', 'HWS manuell fixieren', 'O₂ 15 l/min über Reservoirmaske', 'Beckenschlinge anlegen', 'Wärmeerhalt'] },
    ],
    diagnosis: { options: ['Polytrauma mit arterieller Blutung und Beckenverletzung (hämorrhagischer Schock)', 'Isolierte Oberschenkelfraktur', 'Spannungspneumothorax', 'Schweres Schädel-Hirn-Trauma'], answer: 0 },
    teach: [
      'Erst Eigenschutz (SSS), dann x: spritzende Blutung sofort stoppen. Reicht Abdrücken/Druckverband nicht → Tourniquet.',
      'Dann A (HWS), B (O₂ 15 l), C (5 B prüfen, Beckenschlinge), D, E (Wärmeerhalt).',
      'Keine Schocklage bei Verdacht auf Becken- oder Wirbelsäulenverletzung.',
      'BZ messen, während er verblutet, ist ein typischer Reihenfolge-Fehler.',
    ],
  });

  /* ------------------------------------------------------------ 8 Reanimation */
  C.push({
    id: 'rea', icon: '🛒', short: 'Bewusstlose Person im Supermarkt, 58 J.', level: 3, rea: true,
    dispatch: 'RTW, Person bewusstlos. Männlich, 58 Jahre, Supermarkt. Die Kassiererin ruft an: „Er ist einfach umgekippt!“',
    start: { hr: 0, rhythm: 'vf', spo2: 0, sys: 0, dia: 0, af: 0, bz: 105, temp: 36.5, gcs: 3,
      status: 'Liegt zwischen den Regalen auf dem Rücken, das Gesicht grau-bläulich. Er reagiert nicht. Ab und zu ein schnappender Atemzug.' },
    answerer: () => 'Kassiererin',
    problems: [],
    findings: {
      sss: 'Supermarkt, keine Gefahr. Schaulustige zurückschicken, eine Person soll den AED vom Eingang holen.',
      ansprechen: 'Keine Reaktion auf laute Ansprache.',
    },
    answers: {
      q_e: '„Er hat sich an die Brust gefasst und ist umgekippt. Vor vielleicht 4 Minuten.“',
      q_s: '„Er hat vorher gesagt, ihm ist nicht gut.“',
      q_m: '„Weiß ich nicht.“',
      q_p: '„Keine Ahnung, er ist Stammkunde.“',
    },
    effects: {},
    required: [], // wird in game.js aus dem Rea-Verlauf berechnet
    quizzes: [
      { on: 'r_hdm', type: 'order', q: 'Kreislaufstillstand. Bring die ersten Schritte in die richtige Reihenfolge.',
        items: ['SSS, Bewusstsein prüfen', 'Atmung (10 s) und Puls (5 s) prüfen', 'Druckmassage starten: 100–120/min, 5–6 cm', 'Defi-Elektroden kleben', 'Frühanalyse und ggf. Schock'] },
    ],
    diagnosis: { options: ['Kreislaufstillstand, vermutlich kardial (Herzinfarkt)', 'Synkope', 'Hypoglykämie', 'Krampfanfall'], answer: 0 },
    teach: [
      'Keine Reaktion + keine normale Atmung = Reanimation. Schnappatmung ist keine normale Atmung!',
      'Schockbar: VF und pVT. Nicht schockbar: Asystolie und PEA.',
      'Adrenalin 1 mg: nicht schockbar sofort, wenn der Zugang liegt; schockbar nach dem 3. Schock; dann alle 4 Minuten (Schulmeinung).',
      'NEF spätestens bis Ende des 2. Blocks nachalarmieren. Hands-off unter 5 s (Beatmung) bzw. 10 s (Analyse).',
      'Nach ROSC: Rückenlage, Absaugbereitschaft, ABCDE, 12-Kanal-EKG, SpO₂ 94–98 %.',
    ],
  });

  /* ------------------------------------------------------------ 9 Fieberkrampf */
  C.push({
    id: 'fieberkrampf', icon: '🧸', short: 'Kind hat gekrampft, 18 Monate', level: 2,
    dispatch: 'RTW, Kind krampft. Kleinkind, 18 Monate, Wohnung. Die Mutter ruft an.',
    start: { hr: 150, rhythm: 'sinustachy', spo2: 95, sys: 90, dia: 55, af: 32, bz: 92, temp: 39.6, gcs: 11,
      status: 'Das Kind liegt schlaff und schläfrig im Arm der Mutter, ist heiß und gerötet. Der Krampf hat laut Mutter vor 3 Minuten aufgehört. Die Mutter weint.' },
    answerer: () => 'Mutter',
    problems: [],
    tick(s, api) {
      if (s.count.m_ssl && !s.flags.wach && s.time > 420) {
        s.flags.wach = true; s.v.gcs = 14; s.v.hr = 138;
        s.status = 'Das Kind wird wacher, weint und klammert sich an die Mutter.';
        api.info('Das Kind wird wacher und weint. Gutes Zeichen!');
      }
    },
    findings: {
      ansprechen: 'Das Kind öffnet kurz die Augen, schläft dann wieder ein.',
      a_check: 'Atemweg frei.',
      b_af: 'AF 32/min: für ein Kleinkind normal bis leicht erhöht (Fieber).',
      b_ausk: 'Beidseits frei.',
      c_rekap: 'Rekap unter 2 s, Haut heiß und gerötet.',
      d_gcs: 'Schläfrig, öffnet die Augen auf Ansprache, weint dann kurz (postiktal).',
      d_pup: 'Isokor, prompt.',
      e_body: 'Keine Verletzungen. Kein Ausschlag, keine Petechien (Glastest). Nacken weich, Fontanelle nicht vorgewölbt.',
    },
    answers: {
      q_s: '„Sie hatte seit gestern Fieber. Und dann hat sie so gezuckt!“',
      q_a: '„Keine.“',
      q_m: '„Gestern Abend ein Fieberzäpfchen.“',
      q_p: '„Nein, sie ist sonst gesund, alle Impfungen. Das war das erste Mal!“',
      q_l: '„Heute Morgen etwas Brei, getrunken hat sie wenig.“',
      q_e: '„Sie hat plötzlich die Augen verdreht und am ganzen Körper gezuckt, vielleicht 2 Minuten. Dann war sie ganz schlapp.“',
      q_o: '„Vor 5 Minuten fing es an, 2 Minuten lang.“',
    },
    effects: {
      m_betreuung: { text: 'Du erklärst der Mutter ruhig, dass Fieberkrämpfe meist harmlos sind und ihr jetzt gut aufpasst. Sie beruhigt sich etwas.' },
      m_ssl: { text: 'Kind in Seitenlage auf dem Schoß der Mutter. Atemweg frei.' },
      m_kalt_wasch: { pts: -5, why: 'Nicht aktiv kalt abwaschen (Lehrbuch), aber auch nicht zu warm einpacken.' },
      m_kuehl: { pts: -3, why: 'Beim Fieberkrampf nicht aktiv kühlen: Leicht bekleiden, nicht warm einpacken reicht.' },
      m_rektiole: { pts: -10, why: 'Diazepam ist nicht in der RettSan-Freigabe der Schulmeinung, und der Krampf ist vorbei. Krampfdurchbrechung erst ab 5 Minuten, durch Eltern (eigene Rektiole) oder NA/NotSan.' },
      m_eltern_rekt: { pts: -5, why: 'Der Krampf ist vorbei: Keine Rektiole nötig.' },
      m_o2_mask: { pts: -2, why: 'SpO₂ 95 %: kein Sauerstoff nötig. O₂ nur bei fortbestehender Hypoxie.' },
      m_trinken: { pts: -5, why: 'Schläfriges Kind: Aspirationsgefahr.' },
      m_waerme: { pts: -3, why: 'Nicht zu warm einpacken: Das Fieber steigt weiter.' },
    },
    required: [
      { any: ['m_betreuung'], pts: 5, label: 'Mutter beruhigt', why: 'Folie Tag 14: Eltern beruhigen.' },
      { any: ['b_af', 'c_puls', 'b_spo2'], pts: 5, label: 'Vitalfunktionen geprüft', why: 'Nach dem Anfall: Vitalfunktionen.' },
      { any: ['m_ssl'], pts: 5, label: 'Seitenlage', why: 'Postiktal schläfrig: Seitenlage.' },
      { any: ['d_bz'], pts: 10, label: 'BZ gemessen (erster Krampf)', why: 'Beim ersten Krampfanfall BZ bestimmen.' },
      { any: ['e_temp'], pts: 5, label: 'Temperatur gemessen', why: 'Fieber bestätigt die Verdachtsdiagnose.' },
      { any: ['e_body'], pts: 5, label: 'Bodycheck (Verletzungen, Meningitis-Zeichen)', why: 'Petechien oder steifer Nacken → Meningitis!' },
    ],
    quizzes: [
      { on: 'treat', type: 'mc', q: 'Ab wann wird ein Fieberkrampf medikamentös durchbrochen (Folie Tag 14)?',
        options: ['Sofort, sobald er beginnt', 'Wenn er länger als 5 Minuten dauert: Diazepam-Rektiole durch Eltern oder NA/NotSan', 'Nie, Fieberkrämpfe hören immer von selbst auf', 'Erst ab 30 Minuten'],
        answer: 1, explain: 'Über 5 Minuten → Diazepam rektal (unter 15 kg: 5 mg, über 15 kg: 10 mg). RettSan leitet höchstens die Eltern bei der eigenen Rektiole an.' },
      { on: 'finish', type: 'mc', q: 'Die Mutter fragt, ob sie zu Hause bleiben können. Was sagst du?',
        options: ['Ja, Fieberkrämpfe sind harmlos', 'Transport in die Kinderklinik: Beim ersten Fieberkrampf immer', 'Nur wenn das Fieber über 40 °C steigt', 'Sie soll morgen zum Kinderarzt'], answer: 1,
        explain: 'Folie Tag 14: Kliniktransport immer beim ersten oder sehr langen Anfall.' },
    ],
    diagnosis: { options: ['Fieberkrampf (einfach)', 'Meningitis', 'Epilepsie', 'Hypoglykämie'], answer: 0 },
    teach: [
      'Nach dem Fieberkrampf: Eltern beruhigen, Vitalfunktionen, Seitenlage, beim ersten Krampf BZ, Temperatur, nach Verletzungen und Meningitis-Zeichen suchen.',
      'Beim ersten Fieberkrampf immer in die Klinik.',
      'Kind nicht zu warm einpacken, aber auch nicht aktiv kalt abwaschen.',
    ],
  });

  /* ------------------------------------------------------------ 10 Exsikkose */
  C.push({
    id: 'exsikkose', icon: '👵', short: 'AZ-Verschlechterung, 86 J.', level: 2,
    dispatch: 'RTW, Verschlechterung des Allgemeinzustands. Weiblich, 86 Jahre, Wohnung. Der Pflegedienst ruft an.',
    start: { hr: 112, rhythm: 'sinustachy', spo2: 95, sys: 104, dia: 62, af: 18, bz: 168, temp: 37.6, gcs: 13,
      status: 'Liegt im Bett, wirkt verwirrt und schläfrig. Die Lippen sind trocken und rissig. In der Wohnung ist es sehr warm, auf dem Nachttisch steht ein volles Glas Wasser.' },
    answerer: () => 'Pflegekraft',
    problems: [
      { id: 'volumen', letter: 'C', label: 'Flüssigkeitsmangel', fixedBy: [], worsen: { hr: 0.4, sys: -0.6 } },
    ],
    findings: {
      ansprechen: 'Sie schaut dich an: „Wer sind Sie denn? Ist schon Abend?“',
      a_check: 'Atemweg frei, Zunge trocken und borkig.',
      c_puls: 'Schnell, flach, regelmäßig.',
      c_rekap: 'Rekap 3 s. Hautfalte am Handrücken bleibt stehen. Schleimhäute trocken.',
      d_gcs: 'GCS 13 (Augen spontan, desorientiert, befolgt Aufforderungen). Zeitlich und örtlich nicht orientiert.',
      d_befast: 'Keine Lähmung, Mundwinkel symmetrisch, Arme halten. Sprache langsam, aber nicht verwaschen.',
      d_pup: 'Isokor, prompt.',
      e_body: 'Stehende Hautfalten, keine Verletzungen, kein Druckgeschwür, keine Beinödeme. Inkontinenzeinlage trocken.',
    },
    answers: {
      q_s: '„Seit drei Tagen trinkt sie kaum noch und isst fast nichts. Heute hat sie mich nicht erkannt.“',
      q_a: '„Penicillin.“',
      q_m: '„Torasemid, also eine Wassertablette, dazu Ramipril und Metformin.“',
      q_p: '„Herzschwäche, Diabetes Typ 2, eine leichte Demenz. Normalerweise ist sie aber viel klarer.“',
      q_l: '„Seit gestern fast nichts, und getrunken vielleicht ein halbes Glas.“',
      q_e: '„Bei der Hitze in der Wohnung hat sie kaum getrunken. Sie sagt immer, sie hat keinen Durst.“',
      q_o: '„Langsam über drei Tage, heute deutlich schlechter.“',
      q_r: '„Sie lebt allein, wir kommen zweimal am Tag.“',
    },
    effects: {
      m_trinken: { text: 'Sie nimmt zwei kleine Schlucke und schluckt sicher. Den Flüssigkeitsmangel ausgleichen kann aber erst die Klinik mit Infusionen.', nopts: true },
      m_gluc_oral: { pts: -5, why: 'BZ 168 mg/dl: keine Glucose (KI: Hyperglykämie).' },
      m_schock: { text: 'Beine leicht hoch. Der Puls wird etwas langsamer.', delta: { hr: -3, sys: 4 } },
      m_flach: { text: 'Flache Lagerung.' },
      m_betreuung: { text: 'Du stellst dich langsam und deutlich vor und erklärst, dass ihr ins Krankenhaus fahrt. Sie nickt.' },
      m_laufen: { pts: -5, why: 'Exsikkiert und verwirrt: hohe Sturzgefahr, Tragestuhl.' },
      m_waerme: { pts: -2, why: 'Die Wohnung ist schon sehr warm: nicht zusätzlich einpacken.' },
      m_ivz: { pts: -3, why: 'Kein Kreislaufstillstand und kein Notstand nach § 34: Infusionen gibt hier die Klinik.' },
    },
    required: [
      { any: ['d_bz'], pts: 10, label: 'Blutzucker gemessen', why: 'Verwirrung: immer BZ (Hypo? Hyper?).' },
      { any: ['e_temp'], pts: 5, label: 'Temperatur gemessen', why: 'Fieber, Hitze, Infektion?' },
      { any: ['d_befast'], pts: 5, label: 'Schlaganfall ausgeschlossen (BE-FAST)', why: 'Neue Verwirrtheit bei Älteren: auch an Schlaganfall denken.' },
      { any: ['q_m'], pts: 5, label: 'Medikamente erfragt (Diuretikum!)', why: 'Wassertabletten verstärken den Flüssigkeitsverlust.' },
      { any: ['c_rekap', 'e_body'], pts: 5, label: 'Hautfalten und Schleimhäute geprüft', why: 'Typische Zeichen der Exsikkose.' },
      { any: ['q_l', 'q_s', 'q_e'], pts: 5, label: 'Trinkmenge erfragt', why: 'Die Anamnese bringt die Diagnose.' },
    ],
    quizzes: [
      { on: 'treat', type: 'mc', q: 'Warum sind alte Menschen besonders gefährdet für eine Exsikkose?',
        options: ['Sie schwitzen mehr als junge Menschen', 'Weniger Durstgefühl, Diuretika, Demenz und eingeschränkte Mobilität', 'Ihre Nieren halten das Wasser zu stark zurück', 'Sie trinken grundsätzlich zu viel Kaffee'], answer: 1,
        explain: 'Durstgefühl und Nierenfunktion lassen im Alter nach. Diuretika und Demenz verschärfen das.' },
    ],
    diagnosis: { options: ['Exsikkose mit Verwirrtheit (Delir)', 'Schlaganfall', 'Hypoglykämie', 'Demenz, sonst nichts Akutes'], answer: 0 },
    teach: [
      'Exsikkose: Tachykardie, niedriger RR, trockene Schleimhäute, stehende Hautfalten, Verwirrtheit.',
      'Akute Verwirrtheit ist kein Normalbefund bei Demenz → Delir, Ursache suchen (BZ, Temperatur, BE-FAST, Medikamente).',
      'Diuretika und Hitze verstärken den Flüssigkeitsverlust.',
    ],
  });

  /* ------------------------------------------------------------ 11 Hitzschlag */
  C.push({
    id: 'hitzschlag', icon: '☀️', short: 'Kollaps im Ziel eines Stadtlaufs, 24 J.', level: 2,
    dispatch: 'RTW, Person kollabiert. Männlich, 24 Jahre, Ziel eines Stadtlaufs, 34 °C im Schatten.',
    start: { hr: 138, rhythm: 'sinustachy', spo2: 96, sys: 92, dia: 55, af: 28, bz: 92, temp: 41.2, gcs: 12,
      status: 'Liegt in der prallen Sonne hinter der Ziellinie. Die Haut ist heiß und hochrot, noch etwas verschwitzt. Er ist verwirrt, murmelt und will aufstehen, kippt aber wieder um.' },
    answerer: (s) => s.v.gcs >= 14 ? null : 'Laufpartnerin',
    problems: [
      { id: 'hitze', letter: 'E', label: 'Hyperthermie über 40 °C', fixedBy: ['m_kuehl'], worsen: { temp: 0.06, hr: 0.5 } },
    ],
    tick(s, api) {
      // Kühlen wirkt im Schatten deutlich besser
      if (s.fixed.hitze) {
        const rate = s.count.m_raus ? 0.25 : 0.08;
        s.v.temp = Math.max(38.4, s.v.temp - rate * api.dtMin);
        if (s.v.temp < 39.5 && !s.flags.besser) {
          s.flags.besser = true; s.v.gcs = 14; s.v.hr = 112; s.v.sys = 104;
          s.status = 'Er liegt im kühlen RTW, wird klarer und fragt, ob er ins Ziel gekommen ist.';
          api.info('Die Kerntemperatur sinkt, der Patient wird klarer.');
        }
      }
      if (api.worsen && !s.count.m_raus && s.time > 300 && !s.flags.warnRaus) {
        s.flags.warnRaus = true; s.v.temp += 0.3;
        api.alert('Er liegt immer noch in der Sonne. Die Temperatur steigt weiter!');
      }
    },
    findings: {
      sss: 'Pralle Sonne, viele Zuschauer. Patient so schnell wie möglich aus der Hitze bringen (Schatten, kühler RTW).',
      ansprechen: 'Er murmelt: „Muss… weiter… ins Ziel…“',
      b_af: 'Schnelle, tiefe Atmung.',
      c_puls: 'Schnell, flach.',
      c_rekap: 'Rekap 3 s. Haut heiß, hochrot, leicht verschwitzt.',
      d_gcs: (s) => s.v.gcs >= 14 ? 'GCS 14, wird klarer.' : 'GCS 12 (Augen auf Ansprache, verwirrt, befolgt Aufforderungen). D-Problem!',
      d_pup: 'Isokor, prompt.',
      e_body: 'Haut heiß und gerötet, Wadenkrämpfe. Keine Verletzungen.',
    },
    answers: {
      q_s: { pt: '„Mir ist so heiß… Kopfweh.“', by: '„Er hat ab Kilometer 9 über Schwindel geklagt.“' },
      q_a: { pt: '„Nein.“', by: '„Nicht dass ich wüsste.“' },
      q_m: { pt: '„Keine.“', by: '„Keine.“' },
      q_p: { pt: '„Gesund.“', by: '„Er ist gesund und trainiert viel.“' },
      q_l: { pt: '„Kaum getrunken…“', by: '„Er hat unterwegs kaum getrunken, wollte keine Zeit verlieren.“' },
      q_e: { pt: '„Weiß nicht mehr…“', by: '„Im Ziel ist er einfach umgekippt.“' },
    },
    effects: {
      m_raus: { text: 'Ihr tragt ihn in den klimatisierten RTW.', delta: { hr: -4 } },
      m_kuehl: (s) => ({ text: s.count.m_raus ? 'Feuchtkalte Tücher, Kältepacks (mit Kompresse) an Hals, Achseln und Leisten, Lüftung an.' : 'Kältepacks und feuchte Tücher, aber er liegt noch in der Sonne. Das wirkt nur schwach.' }),
      m_kalt_wasch: { text: 'Feucht abwaschen und Luftstrom: Das hilft beim Kühlen.', fix: ['hitze'] },
      m_flach: { text: 'Flache Lagerung.' },
      m_schock: { text: 'Beine hoch. Der Puls wird etwas langsamer.', delta: { sys: 6, hr: -3 } },
      m_trinken: (s) => s.v.gcs >= 14 ? { text: 'Er trinkt in kleinen Schlucken ein isotonisches Getränk.' } : { pts: -10, why: 'Bewusstseinsgetrübt (GCS unter 14): Aspirationsgefahr! Trinken nur, wenn er wach ist.' },
      m_waerme: { pts: -5, why: 'Beim Hitzschlag nicht zudecken, sondern kühlen!', delta: { temp: 0.3 } },
      m_laufen: { pts: -10, why: 'Kollabierter Patient mit Bewusstseinsstörung: nicht laufen lassen.' },
      m_o2_mask: { pts: -2, why: 'SpO₂ 96 % ohne Atemnot: Sauerstoff ist nicht nötig.' },
    },
    required: [
      { any: ['m_raus'], pts: 10, label: 'Aus der Hitze gebracht', why: 'Wichtigster erster Schritt: Raus aus der Hitze.' },
      { any: ['e_temp'], pts: 10, label: 'Körperkerntemperatur gemessen', why: 'Über 40 °C plus Bewusstseinsstörung = Hitzschlag.' },
      { any: ['m_kuehl', 'm_kalt_wasch'], pts: 10, label: 'Aktiv gekühlt', why: 'Hals, Achseln, Leisten; feuchte Tücher und Luftstrom.' },
      { any: ['m_nef'], pts: 10, label: 'NEF nachalarmiert', why: 'Bewusstseinsstörung (D-Problem) → NEF.' },
      { any: ['d_bz'], pts: 5, label: 'BZ gemessen', why: 'Bewusstseinsstörung: BZ immer messen.' },
      { any: ['m_flach', 'm_schock'], pts: 5, label: 'Flach gelagert', why: 'Niedriger RR: flach bzw. Beine hoch.' },
    ],
    quizzes: [
      { on: 'treat', type: 'order', q: 'Hitzschlag im Ziel. Bring die Schritte in eine sinnvolle Reihenfolge.',
        items: ['SSS, xABCDE, Kerntemperatur messen', 'Raus aus der Hitze (Schatten, kühler RTW)', 'Aktiv kühlen: Hals, Achseln, Leisten', 'Bei Bewusstseinsstörung NEF', 'Trinken lassen, sobald er wach ist'] },
    ],
    diagnosis: { options: ['Hitzschlag (Hyperthermie)', 'Sonnenstich', 'Hypoglykämie', 'Synkope'], answer: 0 },
    teach: [
      'Hitzschlag: Kerntemperatur über 40 °C, heiße Haut (bei Anstrengung oft noch schweißig), Bewusstseinsstörung.',
      'Raus aus der Hitze, aktiv kühlen (Hals, Achseln, Leisten), NEF bei Bewusstseinsstörung.',
      'Trinken nur, wenn der Patient wach ist und sicher schluckt.',
      'Sonnenstich = Hirnhautreizung durch Sonne auf den Kopf, Körpertemperatur normal.',
    ],
  });

  window.CASES = C;
})();
