/* Maßnahmen als Ablauf in kleinen Schritten.
   Der Spieler tippt die Schritte in der Reihenfolge an, in der er sie macht.
   final = Schritt, der die Maßnahme abschließt · invasive = braucht Aufklärung/Einwilligung
   needs = Schritte, die vorher erledigt sein müssen · wrong = Fehler-Schritt (Abzug) */
(function () {
  'use strict';

  const EXPLAIN_WHY = 'Erst erklären, dann anfassen: Jeder Eingriff ist tatbestandlich eine Körperverletzung (§ 223 StGB) und braucht eine Einwilligung. Außerdem erschrickt der Patient.';

  const P = {
    d_bz: {
      title: 'Blutzucker messen',
      steps: [
        { id: 'erklaeren', label: 'Erklären und Einverständnis holen', say: '„Ich möchte kurz Ihren Blutzucker messen. Dafür piekse ich einmal seitlich in den Finger, okay?“' },
        { id: 'handschuhe', label: 'Handschuhe anziehen' },
        { id: 'desinf', label: 'Fingerbeere desinfizieren, trocknen lassen' },
        { id: 'stechen', label: 'Seitlich in die Fingerbeere stechen', invasive: true, needs: ['handschuhe', 'desinf'], hurt: true },
        { id: 'tropfen', label: 'Ersten Tropfen abwischen, nächsten auf den Teststreifen', final: true, needs: ['stechen'] },
        { id: 'quetschen', label: 'Finger kräftig ausquetschen, bis genug Blut kommt', wrong: 'Starkes Quetschen drückt Gewebsflüssigkeit heraus: Das verdünnt das Blut und verfälscht den Wert.' },
      ],
    },
    c_rr: {
      title: 'Blutdruck messen',
      steps: [
        { id: 'erklaeren', label: 'Erklären', say: '„Ich messe jetzt Ihren Blutdruck, das drückt kurz am Arm.“' },
        { id: 'arm', label: 'Oberarm frei machen, Arm locker auf Herzhöhe' },
        { id: 'pulli', label: 'Manschette über den dicken Pulli legen', wrong: 'Über Kleidung misst die Manschette falsch (meist zu hoch). Arm frei machen!' },
        { id: 'manschette', label: 'Passende Manschette 2–3 cm über der Ellenbeuge anlegen', needs: ['arm'] },
        { id: 'messen', label: 'Messung starten, Patient soll still halten und nicht sprechen', final: true, needs: ['manschette'], invasive: true },
      ],
    },
    b_spo2: {
      title: 'Pulsoxymeter anlegen',
      steps: [
        { id: 'erklaeren', label: 'Erklären', say: '„Ich stecke Ihnen einen Clip an den Finger, der misst den Sauerstoff. Tut nicht weh.“' },
        { id: 'lack', label: 'Am nächstbesten Finger messen, auch mit Nagellack', wrong: 'Nagellack (v. a. dunkel) und kalte Finger verfälschen die Messung.' },
        { id: 'finger', label: 'Warmen Finger ohne Nagellack wählen' },
        { id: 'clip', label: 'Clip anstecken, saubere Pulskurve abwarten', final: true, needs: ['finger'] },
      ],
    },
    c_ekg: {
      title: 'EKG-Monitor anschließen',
      steps: [
        { id: 'erklaeren', label: 'Erklären, Oberkörper frei machen lassen, Intimsphäre wahren', say: '„Ich klebe Ihnen ein paar Elektroden auf, damit wir Ihr Herz überwachen können. Machen Sie bitte den Oberkörper frei, die Türe ist zu.“' },
        { id: 'haut', label: 'Haut trocknen, ggf. Stellen rasieren' },
        { id: 'nass', label: 'Elektroden direkt auf die verschwitzte Haut kleben', wrong: 'Auf nasser Haut halten die Elektroden schlecht: Artefakte, Fehlalarme.' },
        { id: 'kleben', label: 'Kleben nach Ampel: rot rechts oben, gelb links oben, grün links unten', needs: ['haut'], invasive: true },
        { id: 'ein', label: 'Monitor an, Ableitung II, Kurve prüfen', final: true, needs: ['kleben'] },
      ],
    },
    c_12: {
      title: '12-Kanal-EKG schreiben',
      steps: [
        { id: 'erklaeren', label: 'Erklären, Oberkörper frei machen, Intimsphäre wahren', say: '„Wir schreiben jetzt ein ausführliches EKG. Bitte ganz ruhig liegen bleiben, nicht sprechen.“' },
        { id: 'haut', label: 'Haut trocknen, ggf. rasieren' },
        { id: 'extr', label: 'Extremitätenelektroden an Armen und Beinen anlegen', needs: ['haut'], invasive: true },
        { id: 'brust', label: 'Brustwandelektroden V1–V6 (V1/V2: 4. ICR neben dem Brustbein)', needs: ['haut'], invasive: true },
        { id: 'sitzen', label: 'Patient soll sich dabei aufsetzen und erzählen', wrong: 'Bewegung und Sprechen erzeugen Muskelartefakte: Ruhig liegen lassen.' },
        { id: 'schreiben', label: 'Patient ruhig liegen lassen, EKG schreiben', final: true, needs: ['extr', 'brust'] },
      ],
    },
    m_ivz: {
      title: 'i.v.-Zugang legen',
      steps: [
        { id: 'erklaeren', label: 'Erklären und Einverständnis holen', say: '„Ich lege Ihnen jetzt einen Zugang in die Vene, das piekst einmal kurz.“' },
        { id: 'handschuhe', label: 'Handschuhe anziehen, Material richten' },
        { id: 'stauen', label: 'Stauen, geeignete Vene suchen' },
        { id: 'desinf', label: 'Desinfizieren, Einwirkzeit abwarten', needs: ['stauen'] },
        { id: 'tasten', label: 'Nach dem Desinfizieren die Vene nochmal mit dem Finger tasten', wrong: 'Nach der Desinfektion nicht mehr tasten: Die Stelle ist sonst wieder kontaminiert.' },
        { id: 'punktieren', label: 'Punktieren, Blutrückfluss abwarten', invasive: true, needs: ['handschuhe', 'stauen', 'desinf'], hurt: true },
        { id: 'fertig', label: 'Stau lösen, fixieren, Infusion anschließen', final: true, needs: ['punktieren'] },
      ],
    },
    m_o2_mask: {
      title: 'O₂ über Reservoirmaske',
      steps: [
        { id: 'erklaeren', label: 'Erklären', say: '„Ich gebe Ihnen jetzt Sauerstoff über eine Maske. Die liegt nur locker auf, Sie können ganz normal atmen.“' },
        { id: 'flow', label: 'Flow auf 15 l/min, Reservoirbeutel füllen lassen' },
        { id: 'leer', label: 'Maske sofort aufsetzen, Reservoir füllt sich schon', wrong: 'Mit leerem Reservoir atmet der Patient gegen einen schlaffen Beutel: kaum O₂, Erstickungsgefühl.' },
        { id: 'aufsetzen', label: 'Maske aufsetzen und Nasenbügel anpassen', final: true, needs: ['flow'], invasive: true },
      ],
    },
    m_tq: {
      title: 'Tourniquet anlegen',
      steps: [
        { id: 'erklaeren', label: 'Ankündigen: „Das tut jetzt sehr weh, aber es rettet Ihnen das Leben.“', say: '„Ich muss Ihr Bein abbinden. Das tut gleich sehr weh, aber es stoppt die Blutung.“' },
        { id: 'anlegen', label: 'Handbreit oberhalb der Wunde anlegen, nicht über einem Gelenk' },
        { id: 'zudrehen', label: 'Festdrehen, bis die Blutung steht', needs: ['anlegen'], invasive: true, hurt: true },
        { id: 'lockern', label: 'Wieder lockern, weil es dem Patienten so wehtut', wrong: 'Ein lockeres Tourniquet staut nur die Venen: Es blutet noch stärker. Fest lassen, Schmerztherapie macht der NA.' },
        { id: 'zeit', label: 'Uhrzeit notieren', final: true, needs: ['zudrehen'] },
      ],
    },
    e_body: {
      title: 'Bodycheck',
      steps: [
        { id: 'erklaeren', label: 'Erklären, warum du die Kleidung öffnest', say: '„Ich muss Sie einmal von Kopf bis Fuß anschauen, damit wir nichts übersehen. Dafür öffne ich die Kleidung.“' },
        { id: 'schutz', label: 'Sichtschutz: Schaulustige weg, Decke oder in den RTW' },
        { id: 'alle', label: 'Gleich vor allen Leuten entkleiden', wrong: 'Intimsphäre wahren: Sichtschutz oder RTW. Das ist auch Teil der Würde des Patienten.' },
        { id: 'untersuchen', label: 'Von Kopf bis Fuß untersuchen, danach zudecken', final: true, invasive: true },
      ],
    },
  };

  window.PROCS = { P, EXPLAIN_WHY };
})();
