/* Ergänzungen zu den Fällen: wechselnde Einsatzmeldungen (auch irreführende), Name, Stimmung,
   Gesprächsmomente mit Auswahl und Nachfragen, die sich aus Antworten ergeben. */
(function () {
  'use strict';

  const X = {
    acs: {
      person: '👨', name: 'Herr Becker', mood: 4,
      dispatches: [
        { short: 'Oberbauchschmerzen, 62 J.', text: 'RTW, Bauchschmerzen. Männlich, 62 Jahre, Wohnung im 3. OG. Die Ehefrau am Telefon: „Er hat seit dem Rasenmähen Bauchweh und ihm ist schlecht.“' },
        { short: 'Übelkeit und Schwäche, 62 J.', text: 'RTW, Übelkeit, Schwäche. Männlich, 62 Jahre, Wohnung im 3. OG. Die Ehefrau hat angerufen.' },
        { short: 'Brustschmerz, 62 J.', text: 'RTW, Brustschmerz. Männlich, 62 Jahre, Wohnung im 3. OG. Die Ehefrau hat angerufen.' },
      ],
      status: 'Sitzt blass und kaltschweißig auf dem Sofa, hält eine Hand auf den Oberbauch und wirkt sehr ängstlich.',
      answers: {
        q_s: '„Es drückt hier oben im Bauch und in der Brust. Und mir ist so übel.“',
        q_q: '„Drückend, eng. Wie ein Ring.“',
        q_rad: '„In den Rücken, und der linke Arm fühlt sich komisch an.“',
      },
      followups: {
        f_atemnot: { after: 'q_s', label: 'Haben Sie auch Atemnot?', ans: '„Ein bisschen, wenn es so drückt.“' },
        f_viagra: { after: 'q_m', label: 'Wann haben Sie zuletzt Viagra genommen?', ans: '„Vorgestern. Ist das wichtig?“ (Ja: Nitrate sind dann für den NA tabu.)' },
        f_magen: { after: 'q_p', label: 'Hatten Sie schon mal Magenprobleme?', ans: '„Sodbrennen manchmal. Aber so war das noch nie.“' },
      },
      moments: [
        { id: 'angst', after: ['c_12', 'c_ekg'], who: 'Herr Becker', say: '„Ist das… ist das ein Herzinfarkt? Sterbe ich jetzt?“',
          options: [
            { t: '„Wir vermuten, dass es vom Herzen kommt. Deshalb kommt gleich ein Notarzt dazu, und wir fahren in eine Klinik, die genau das behandelt. Wir bleiben die ganze Zeit bei Ihnen.“', mood: 3, delta: { hr: -5 }, pts: 3, reply: 'Er atmet tief durch und nickt: „Okay. Danke.“' },
            { t: '„Ach was, das ist bestimmt nur der Magen.“', mood: -1, pts: -3, why: 'Keine falschen Versprechen. Bestätigt sich der Infarkt, ist das Vertrauen weg, und du hast dich selbst auf eine Diagnose festgelegt.' },
            { t: '„Dazu kann ich nichts sagen, das macht der Arzt.“', mood: -2, delta: { hr: 6 }, pts: -2, why: 'Abwimmeln steigert die Angst. Stress erhöht den Sauerstoffbedarf des Herzens.' },
          ] },
      ],
    },

    hypo: {
      person: '👩', name: 'Frau Yilmaz', mood: 2,
      dispatches: [
        { short: 'Aggressive Person im Büro, 34 J.', text: 'RTW, Person aggressiv. Weiblich, 34 Jahre, Büro. Eine Kollegin: „Sie schreit rum, ist sie betrunken?“' },
        { short: 'Verwirrte Person im Büro, 34 J.', text: 'RTW, hilflose Person. Weiblich, 34 Jahre, Büro. Eine Kollegin ruft an: „Sie redet wirres Zeug.“' },
        { short: 'Schwächeanfall, 34 J.', text: 'RTW, Schwäche. Weiblich, 34 Jahre, Büro.' },
      ],
      followups: {
        f_insulin: { after: 'q_m', label: 'Wie viel Insulin haben Sie heute gegeben?', ans: { pt: '„Den Bolus fürs Frühstück… aber dann hatte ich keine Zeit zu frühstücken.“', by: '„Das weiß ich nicht. Ihre Pumpe zeigt das vielleicht an.“' } },
        f_alkohol: { after: 'q_l', label: 'Haben Sie Alkohol getrunken?', ans: { pt: '„Was? Nein! Ich bin bei der Arbeit!“', by: '„Nein, sicher nicht, sie trinkt gar keinen Alkohol.“' } },
      },
      moments: [
        { id: 'heim', cond: (s) => s.flags.erholt, who: 'Frau Yilmaz', say: '„Danke… Muss ich jetzt mit ins Krankenhaus? Ich hab noch so viel Arbeit.“',
          options: [
            { t: 'Erklären: Ohne Mahlzeit kann der Zucker wieder fallen, Mitfahrt empfehlen. Lehnt sie ab: über die Risiken aufklären, Ablehnung dokumentieren und unterschreiben lassen, Kollegin bleibt bei ihr.', mood: 2, pts: 5, reply: '„Okay. Ich esse was und meine Kollegin passt auf mich auf. Ich unterschreibe.“' },
            { t: '„Na klar, alles wieder gut, dann bleiben Sie hier.“', pts: -3, why: 'Ohne Aufklärung über das Risiko einer erneuten Hypo und ohne Dokumentation der Transportverweigerung.' },
            { t: '„Sie müssen mit, da gibt es keine Diskussion.“', mood: -3, pts: -3, why: 'Eine wache, orientierte Patientin entscheidet selbst (Selbstbestimmungsrecht). Aufklären, nicht zwingen.' },
          ] },
      ],
    },

    asthma: {
      person: '🧑', name: 'Jonas', mood: 3,
      dispatches: [
        { short: 'Panikattacke? 22 J.', text: 'RTW, Hyperventilation. Männlich, 22 Jahre, Studentenwohnheim. Der Mitbewohner: „Er hat eine Panikattacke!“' },
        { short: 'Atemnot, 22 J.', text: 'RTW, Atemnot. Männlich, 22 Jahre, Studentenwohnheim.' },
      ],
      followups: {
        f_spray: { after: 'q_m', label: 'Wann hast du das Spray zuletzt genommen?', ans: '„Gestern… Abend.“' },
        f_anwendung: { after: 'q_m', label: 'Zeig mal, wie du das Spray benutzt.', ans: '„Schütteln… ausatmen… Mund drum… drücken… einatmen… Luft anhalten.“ (Er kennt die Anwendung.)' },
        f_verordnet: { after: 'q_m', label: 'Hat dir das ein Arzt verschrieben?', ans: '„Ja… vom Lungenarzt.“' },
      },
      moments: [
        { id: 'panik', at: 30, who: 'Jonas', say: '„Ich… erstick… gleich…!“ Er reißt die Augen auf und atmet hektisch.',
          options: [
            { t: 'Blickkontakt, ruhige Stimme: „Ich bin bei dir. Atme mit mir: durch die Nase ein, mit gespitzten Lippen ganz langsam aus.“', mood: 3, delta: { af: -2 }, pts: 3, reply: 'Er hält deinen Blick und atmet mit dir aus.' },
            { t: '„Schnell, schnell, wir müssen sofort los!“', mood: -2, delta: { hr: 5, af: 2 }, pts: -3, why: 'Hektik überträgt sich: Mehr Angst bedeutet mehr Atemnot.' },
            { t: '„Jetzt stell dich nicht so an.“', mood: -3, delta: { af: 2 }, pts: -5, why: 'Er hat echte Atemnot (Giemen, SpO₂ 88 %). Nie abwerten.' },
          ] },
      ],
      react: { 'm_o2_mask.noexplain': '„Nimm das weg… ich krieg… keine Luft!“ Er zerrt an der Maske.' },
    },

    anaphylaxie: {
      person: '👩', name: 'Frau Krüger', mood: 3,
      dispatches: [
        { short: 'Kreislaufprobleme im Biergarten, 45 J.', text: 'RTW, Kreislaufprobleme. Weiblich, 45 Jahre, Biergarten. Der Kellner: „Der Frau geht es plötzlich ganz schlecht.“' },
        { short: 'Nach Wespenstich, 45 J.', text: 'RTW, allergische Reaktion. Weiblich, 45 Jahre, Biergarten, nach einem Wespenstich.' },
        { short: 'Atemnot im Biergarten, 45 J.', text: 'RTW, Atemnot. Weiblich, 45 Jahre, Biergarten.' },
      ],
      followups: {
        f_set: { after: 'q_a', label: 'Wo ist Ihr Notfallset?', ans: '„Zu Hause im Bad… ich hab’s heute vergessen.“' },
        f_frueher: { after: 'q_a', label: 'Wie schlimm war es beim letzten Stich?', ans: '„Da hatte ich nur Quaddeln. So wie heute war es noch nie.“' },
      },
      moments: [
        { id: 'spritze', before: 'm_epipen', who: 'Frau Krüger', say: '„Was ist das? Eine Spritze? Ich hab total Angst vor Spritzen!“',
          options: [
            { t: '„Das ist Adrenalin, das wirkt gegen die Allergie. Es piekst kurz in den Oberschenkel, durch die Hose. Danach wird es Ihnen schnell besser gehen. Einverstanden?“', mood: 2, pts: 3, reply: 'Sie nickt mit Tränen in den Augen: „Okay. Machen Sie.“' },
            { t: 'Ohne Erklärung: „Keine Zeit, Augen zu!“', mood: -2, pts: -3, why: 'Auch im Notfall kurz aufklären. Der § 34 setzt eine (zumindest mutmaßliche) Einwilligung voraus, und die Patientin ist wach.' },
          ] },
      ],
    },

    stroke: {
      person: '👵', name: 'Frau Schulz', mood: 4, nonverbal: true,
      dispatches: [
        { short: 'Verwirrte Seniorin, 71 J.', text: 'RTW, Verwirrtheit. Weiblich, 71 Jahre, Seniorenwohnung. Die Tochter: „Meine Mutter redet so komisch.“' },
        { short: 'Hilflose Person, 71 J.', text: 'RTW, hilflose Person. Weiblich, 71 Jahre, Seniorenwohnung. Die Tochter ruft an.' },
        { short: 'Sprachstörung, 71 J.', text: 'RTW, Sprachstörung. Weiblich, 71 Jahre, Seniorenwohnung. Die Tochter ruft an.' },
      ],
      followups: {
        f_kopf: { after: 'q_s', label: 'Hatte sie Kopfschmerzen oder ist sie gestürzt?', ans: '„Nein, kein Sturz. Kopfschmerzen hat sie nicht erwähnt.“' },
        f_apixaban: { after: 'q_m', label: 'Wann hat sie das Apixaban zuletzt genommen?', ans: '„Ich glaube, gestern früh. Die Dose von heute ist noch voll.“' },
      },
      moments: [
        { id: 'hand', after: ['q_s', 'q_e', 'q_o'], who: 'Frau Schulz', say: 'Die Patientin greift mit der linken Hand nach deinem Arm und schaut dich ängstlich an. Sie versucht etwas zu sagen.',
          options: [
            { t: 'Sie direkt ansprechen: „Frau Schulz, wir glauben, dass in Ihrem Kopf ein Gefäß verstopft ist. Wir fahren Sie schnell in eine Spezialklinik. Sie sind nicht allein.“', mood: 3, pts: 3, reply: 'Sie drückt deine Hand und nickt langsam.' },
            { t: 'Weiter nur mit der Tochter sprechen.', mood: -2, pts: -2, why: 'Patienten mit Sprachstörung verstehen oft viel mehr, als sie sagen können. Immer auch den Patienten selbst ansprechen.' },
          ] },
        { id: 'tochter', after: ['m_voranm', 'd_befast'], who: 'Tochter', say: '„Wird sie wieder gesund? Ich hätte früher kommen sollen, das ist alles meine Schuld!“',
          options: [
            { t: '„Sie haben genau richtig gehandelt und schnell angerufen. Bitte packen Sie den Medikamentenplan ein und bleiben Sie telefonisch erreichbar, die Klinik braucht vielleicht Ihre Auskunft.“', pts: 3, reply: 'Sie wischt sich die Tränen ab und holt die Medikamente.' },
            { t: '„Na ja, eine halbe Stunde früher wäre schon besser gewesen.“', pts: -3, why: 'Schuldzuweisung hilft niemandem. Angehörige stärken und einbinden (Zeitpunkt, Medikamente, Erreichbarkeit).' },
          ] },
      ],
    },

    krampf: {
      person: '👨', name: 'Herr Nowak', mood: 5,
      dispatches: [
        { short: 'Person zusammengebrochen am Bahnsteig, 28 J.', text: 'RTW, Person zusammengebrochen. Männlich, ca. 28 Jahre, U-Bahnhof. Passanten rufen an.' },
        { short: 'Bewusstlose Person, U-Bahnhof', text: 'RTW, bewusstlose Person. Männlich, ca. 28 Jahre, U-Bahnhof.' },
        { short: 'Krampfanfall am Bahnsteig, 28 J.', text: 'RTW, Krampfanfall. Männlich, 28 Jahre, U-Bahnhof. Passanten rufen an.' },
      ],
      followups: {
        f_aura: { after: 'q_e', label: 'Hat er vorher etwas gesagt oder gemerkt?', ans: { pt: '„Mir war so komisch… so ein Geruch… dann weiß ich nichts mehr.“', by: '„Er hat sich an den Kopf gefasst und dann ging es los.“' } },
        f_drogen: { after: 'q_e', label: 'Alkohol oder Drogen?', ans: { pt: '„Gestern ein paar Bier… und wenig geschlafen.“', by: '„Keine Ahnung.“' } },
      },
      moments: [
        { id: 'stift', at: 10, who: 'Passantin', say: '„Soll ich ihm was zwischen die Zähne stecken? Ich hab hier einen Kugelschreiber, sonst beißt er sich die Zunge ab!“',
          options: [
            { t: '„Bitte nichts in den Mund! Treten Sie einen Schritt zurück und halten Sie die Leute auf Abstand. Danke!“', pts: 3, reply: 'Sie nickt und schickt die Schaulustigen weg.' },
            { t: '„Ja, gute Idee.“', pts: -10, why: 'Nichts in den Mund eines Krampfenden: Zähne brechen ab, Aspiration, Bissverletzungen beim Helfer.' },
          ] },
        { id: 'wo', cond: (s) => s.flags.wach, who: 'Herr Nowak', say: '„Wo bin ich? Was ist passiert…? Haben die Leute das gefilmt?“',
          options: [
            { t: 'Ruhig orientieren: wer du bist, wo er ist, dass er einen Anfall hatte. Sichtschutz, Schaulustige weg.', mood: 3, pts: 3, reply: '„Oh nein… schon wieder. Danke, dass Sie die Leute weggeschickt haben.“' },
            { t: '„Sie hatten einen Anfall. Jetzt erst mal nicht reden.“', mood: -1, pts: 0, why: 'Postiktal sind Patienten verwirrt und beschämt: Orientieren und Würde wahren hilft mehr.' },
          ] },
      ],
    },

    poly: {
      person: '🏍️', name: 'Marco', mood: 4,
      dispatches: [
        { short: 'Verkehrsunfall Landstraße', text: 'RTW, VU. Landstraße, Pkw gegen Motorrad. Die Polizei ist noch nicht vor Ort.' },
        { short: 'Motorradunfall, ca. 30 J.', text: 'RTW, VU Motorrad gegen Pkw. Männlich, ca. 30 Jahre, Landstraße. Die Polizei ist noch nicht vor Ort.' },
      ],
      moments: [
        { id: 'fahrer', after: ['sss'], who: 'Pkw-Fahrer', say: 'Der Pkw-Fahrer läuft zitternd auf dich zu: „Ich hab ihn nicht gesehen! Ist er tot?!“',
          options: [
            { t: 'Kurz und klar: „Wir kümmern uns. Bitte setzen Sie sich dort an die Leitplanke, wir schauen gleich auch nach Ihnen.“ Leitstelle: weiteres Rettungsmittel.', pts: 3, reply: 'Er setzt sich hin. Ein zweiter RTW ist unterwegs.' },
            { t: 'Ignorieren und zum Patienten.', pts: -2, why: 'Der Unfallgegner ist auch ein möglicher Patient (Schock, Verletzungen). Kurz ansprechen, Platz zuweisen, Nachforderung.' },
            { t: 'Ihn erst mal ausführlich beruhigen.', pts: -3, delta: { sys: -6, hr: 4 }, why: 'Dein Patient verblutet gerade: x zuerst. Kurze Ansage reicht.' },
          ] },
      ],
      react: { 'm_tq.zudrehen': '„AAAH! Hören Sie auf, das tut so weh!“', 'm_tq.zudrehen.explained': '„AAAH!“ Er schreit, aber er hält still. Die Blutung steht.' },
    },

    rea: {
      person: '👨', name: 'unbekannt', mood: 5,
      dispatches: [
        { short: 'Hilflose Person im Supermarkt', text: 'RTW, hilflose Person. Männlich, ca. 58 Jahre, Supermarkt. Die Kassiererin: „Er liegt hier und sagt nichts.“' },
        { short: 'Person zusammengebrochen, 58 J.', text: 'RTW, Person zusammengebrochen. Männlich, ca. 58 Jahre, Supermarkt.' },
        { short: 'Bewusstlose Person im Supermarkt', text: 'RTW, Person bewusstlos. Männlich, 58 Jahre, Supermarkt. Die Kassiererin: „Er ist einfach umgekippt!“' },
      ],
      moments: [
        { id: 'helfen', at: 150, who: 'Kassiererin', say: '„Kann ich irgendwie helfen?“',
          options: [
            { t: '„Ja, bitte: Gehen Sie zum Eingang, halten Sie ihn frei und weisen Sie den Notarzt ein.“', pts: 3, reply: 'Sie läuft los.' },
            { t: '„Nein, gehen Sie bitte weg.“', pts: -1, why: 'Ersthelfer sinnvoll einbinden: Einweisen, Platz schaffen, Angehörige suchen.' },
          ] },
      ],
    },

    fieberkrampf: {
      person: '👶', name: 'Mia', mood: 5, child: true,
      dispatches: [
        { short: 'Kind schlapp, 18 Monate', text: 'RTW, Kindernotfall. Kleinkind, 18 Monate, Wohnung. Die Mutter: „Meine Tochter ist ganz schlapp und reagiert kaum!“' },
        { short: 'Kind hat gekrampft, 18 Monate', text: 'RTW, Kind krampft. Kleinkind, 18 Monate, Wohnung. Die Mutter ruft an.' },
      ],
      followups: {
        f_krank: { after: 'q_s', label: 'Ist sonst jemand in der Familie krank?', ans: '„Ihr Bruder hatte letzte Woche einen Infekt mit Fieber.“' },
        f_familie: { after: 'q_p', label: 'Gab es Fieberkrämpfe in der Familie?', ans: '„Mein Mann hatte als Kind auch welche, glaube ich.“' },
      },
      moments: [
        { id: 'tot', at: 15, who: 'Mutter', say: '„Ist sie tot?! Sie bewegt sich ja kaum! Bitte tun Sie doch was!“',
          options: [
            { t: '„Ihre Tochter atmet und hat einen Puls. Nach so einem Krampf sind Kinder ganz müde. Wir schauen sie uns jetzt genau an, Sie bleiben bei ihr.“', pts: 3, reply: 'Die Mutter atmet durch und streichelt ihre Tochter.' },
            { t: '„Bitte gehen Sie raus, Sie stören.“', pts: -3, why: 'Eltern gehören zum Kind: Das Kind beruhigt sich bei den Eltern, und sie kennen die Vorgeschichte.' },
            { t: '„Keine Ahnung, mal sehen.“', pts: -5, why: 'Panische Eltern brauchen klare, ruhige Infos.' },
          ] },
      ],
    },

    exsikkose: {
      person: '👵', name: 'Frau Hoffmann', mood: 4,
      dispatches: [
        { short: 'Verdacht Schlaganfall, 86 J.', text: 'RTW, V. a. Schlaganfall. Weiblich, 86 Jahre, Wohnung. Der Pflegedienst: „Sie ist so komisch, vielleicht ein Schlaganfall?“' },
        { short: 'Verwirrtheit, 86 J.', text: 'RTW, Verwirrtheit. Weiblich, 86 Jahre, Wohnung. Der Pflegedienst ruft an.' },
        { short: 'AZ-Verschlechterung, 86 J.', text: 'RTW, Verschlechterung des Allgemeinzustands. Weiblich, 86 Jahre, Wohnung. Der Pflegedienst ruft an.' },
      ],
      followups: {
        f_vollmacht: { after: 'q_p', label: 'Gibt es einen Betreuer oder eine Vorsorgevollmacht?', ans: '„Ja, ihr Sohn hat eine Vorsorgevollmacht. Die Nummer hängt am Kühlschrank.“' },
        f_urin: { after: 'q_s', label: 'Wie oft war sie auf Toilette? Brennen?', ans: '„Kaum noch. Brennen hat sie nicht erwähnt.“' },
      },
      moments: [
        { id: 'nichtmit', after: ['d_bz', 'e_temp', 'd_befast'], who: 'Frau Hoffmann', say: '„Ich will nicht ins Krankenhaus! Da stirbt man doch nur!“',
          options: [
            { t: 'Ruhig erklären, Pflegekraft einbinden und klären, ob es einen Betreuer oder eine Vorsorgevollmacht gibt (Sohn anrufen).', mood: 3, pts: 5, reply: 'Der Sohn redet am Telefon mit ihr. Sie seufzt: „Na gut, wenn mein Junge das sagt.“' },
            { t: '„Na gut, dann bleiben Sie eben hier.“', pts: -5, why: 'Bei akuter Verwirrtheit ist die Einwilligungsfähigkeit fraglich. Nicht einfach gehen: Vorsorgevollmacht/Betreuer klären, ggf. NA.' },
            { t: '„Sie kommen jetzt mit, Schluss.“', mood: -3, pts: -3, why: 'Druck eskaliert. Erst erklären und den Bevollmächtigten einbinden.' },
          ] },
      ],
    },

    hitzschlag: {
      person: '🏃', name: 'Tim', mood: 4,
      dispatches: [
        { short: 'Person hilflos beim Stadtlauf, 24 J.', text: 'RTW, hilflose Person. Männlich, 24 Jahre, Ziel eines Stadtlaufs, 34 °C im Schatten.' },
        { short: 'Krampfanfall? Läufer, 24 J.', text: 'RTW, Person krampft. Männlich, 24 Jahre, Ziel eines Stadtlaufs. Ein Ordner: „Er zuckt mit den Beinen!“' },
        { short: 'Kollaps im Ziel eines Stadtlaufs, 24 J.', text: 'RTW, Person kollabiert. Männlich, 24 Jahre, Ziel eines Stadtlaufs, 34 °C im Schatten.' },
      ],
      moments: [
        { id: 'aufstehen', at: 20, who: 'Tim', say: '„Lasst mich… ich muss ins Ziel…“ Er versucht aufzustehen und schwankt.',
          options: [
            { t: 'Ruhig ansprechen, Laufpartnerin einbinden: „Tim, du bist im Ziel, du hast es geschafft. Bleib liegen, wir kümmern uns.“', mood: 3, pts: 3, reply: 'Er lässt sich zurücksinken: „Geschafft…?“' },
            { t: 'Festhalten und auf die Trage drücken.', mood: -3, delta: { hr: 6 }, pts: -3, why: 'Gewalt eskaliert bei verwirrten Patienten. Erst ruhig ansprechen und Bezugspersonen einbinden.' },
            { t: 'Ihn aufstehen lassen, er will ja.', pts: -5, delta: { sys: -8 }, why: 'Bewusstseinsgetrübt und hypoton: Sturz- und Kollapsgefahr.' },
          ] },
      ],
    },
  };

  window.CASES.forEach((c) => {
    const x = X[c.id];
    if (!x) return;
    c.person = x.person; c.name = x.name; c.nonverbal = !!x.nonverbal; c.mood = x.mood; c.child = !!x.child;
    c.dispatches = x.dispatches; c.followups = x.followups || {}; c.moments = x.moments || []; c.react = x.react || {};
    if (x.status) c.start.status = x.status;
    if (x.answers) Object.assign(c.answers, x.answers);
  });
})();
