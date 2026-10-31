/* EKG-Streifen für den Profi-Trainer: Vorhof- und Kammeraktionen getrennt modelliert,
   damit AV-Blöcke, Flattern, Extrasystolen und Schrittmacher möglich sind. Darstellung auf EKG-Papier. */
(function () {
  'use strict';

  const g = (t, mu, sd, a) => a * Math.exp(-((t - mu) * (t - mu)) / (2 * sd * sd));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* Eigenschaften für die systematische Analyse */
  // rate: 'brady' | 'normal' | 'tachy' | 'none'   reg: 'ja' | 'nein' | 'nb' (nicht beurteilbar)
  // qrs: 'schmal' | 'breit' | 'keine'   p: siehe P_OPTS   todo: siehe TODO
  const P_OPTS = {
    normal: 'Vor jedem QRS eine P-Welle, gleicher Abstand',
    langPQ: 'Vor jedem QRS eine P-Welle, aber PQ-Zeit verlängert (über 0,2 s)',
    zunehmend: 'PQ-Zeit wird länger, bis ein QRS ausfällt',
    ausfall: 'Gleiche PQ-Zeit, aber einzelne P-Wellen ohne QRS',
    dissoziiert: 'P-Wellen und QRS laufen unabhängig voneinander',
    flatter: 'Sägezahnartige Flatterwellen statt P-Wellen',
    keine: 'Keine erkennbaren P-Wellen (Grundlinie unruhig oder P versteckt)',
    spike: 'Keine P-Wellen, schmaler Strich (Spike) vor jedem QRS',
    nichts: 'Keine elektrische Aktivität erkennbar',
  };
  const TODO = {
    schock: 'Reanimation, so schnell wie möglich defibrillieren (schockbar)',
    keinSchock: 'Reanimation ohne Schock, Adrenalin so früh wie möglich (nicht schockbar)',
    instabil: 'Patient gefährdet: Defi-Patches kleben, NEF nachalarmieren, auf Instabilität achten',
    stemi: '12-Kanal-EKG, NEF nachalarmieren, Herzkatheter voranmelden',
    beobachten: 'Monitoring, Symptome und Ursache klären, je nach Zustand NEF',
  };

  const R = {
    sinus: { name: 'Sinusrhythmus', rate: 'normal', reg: 'ja', qrs: 'schmal', p: 'normal', todo: 'beobachten', pulse: true,
      help: 'Regelmäßig, 60–100/min, schmale QRS, vor jedem QRS eine P-Welle.' },
    sinustachy: { name: 'Sinustachykardie', rate: 'tachy', reg: 'ja', qrs: 'schmal', p: 'normal', todo: 'beobachten', pulse: true,
      help: 'Wie Sinus, aber über 100/min. Meist eine Reaktion (Schmerz, Fieber, Volumenmangel): Ursache suchen.' },
    sinusbrady: { name: 'Sinusbradykardie', rate: 'brady', reg: 'ja', qrs: 'schmal', p: 'normal', todo: 'beobachten', pulse: true,
      help: 'Wie Sinus, aber unter 60/min. Bei Sportlern normal, sonst an Medikamente (Betablocker) denken.' },
    vhf: { name: 'Tachyarrhythmia absoluta bei Vorhofflimmern', rate: 'tachy', reg: 'nein', qrs: 'schmal', p: 'keine', todo: 'beobachten', pulse: true,
      help: 'Völlig unregelmäßige Abstände („absolute Arrhythmie“), keine P-Wellen, zittrige Grundlinie.' },
    flattern: { name: 'Vorhofflattern', rate: 'tachy', reg: 'ja', qrs: 'schmal', p: 'flatter', todo: 'beobachten', pulse: true,
      help: 'Sägezahn-Grundlinie (Flatterwellen ca. 300/min), Kammer z. B. 2:1 übergeleitet → ca. 150/min.' },
    svt: { name: 'Supraventrikuläre Tachykardie (SVT)', rate: 'tachy', reg: 'ja', qrs: 'schmal', p: 'keine', todo: 'instabil', pulse: true,
      help: 'Sehr schnell (oft 160–220/min), regelmäßig, schmale QRS, P-Wellen nicht sichtbar (stecken im QRS).' },
    avb1: { name: 'AV-Block I. Grades', rate: 'normal', reg: 'ja', qrs: 'schmal', p: 'langPQ', todo: 'beobachten', pulse: true,
      help: 'Jede P-Welle wird übergeleitet, aber verzögert: PQ-Zeit über 0,2 s (mehr als ein großes Kästchen).' },
    wenckebach: { name: 'AV-Block II. Grades Typ Wenckebach (Mobitz I)', rate: 'normal', reg: 'nein', qrs: 'schmal', p: 'zunehmend', todo: 'beobachten', pulse: true,
      help: 'PQ wird von Schlag zu Schlag länger, dann fällt ein QRS aus. Danach geht es von vorn los.' },
    mobitz2: { name: 'AV-Block II. Grades Typ Mobitz II', rate: 'brady', reg: 'nein', qrs: 'schmal', p: 'ausfall', todo: 'instabil', pulse: true,
      help: 'PQ bleibt gleich, aber plötzlich folgt einer P-Welle kein QRS. Gefährlich: kann in einen AV-Block III übergehen.' },
    avb3: { name: 'AV-Block III. Grades (totaler AV-Block)', rate: 'brady', reg: 'ja', qrs: 'breit', p: 'dissoziiert', todo: 'instabil', pulse: true,
      help: 'Vorhöfe und Kammern schlagen unabhängig: P-Wellen regelmäßig, QRS langsam (oft unter 40/min) und breit, kein fester Bezug.' },
    ves: { name: 'Sinusrhythmus mit ventrikulären Extrasystolen (Bigeminus)', rate: 'normal', reg: 'nein', qrs: 'breit', p: 'normal', todo: 'beobachten', pulse: true,
      help: 'Normale Schläge im Wechsel mit vorzeitigen, breiten, deformierten Schlägen ohne P-Welle. Jeder 2. Schlag = Bigeminus.' },
    pacer: { name: 'Schrittmacher-Rhythmus', rate: 'normal', reg: 'ja', qrs: 'breit', p: 'spike', todo: 'beobachten', pulse: true,
      help: 'Schmaler senkrechter Strich (Spike) direkt vor einem breiten QRS. Patient hat einen Herzschrittmacher.' },
    stemi: { name: 'Sinusrhythmus mit ST-Hebung (STEMI)', rate: 'normal', reg: 'ja', qrs: 'schmal', p: 'normal', todo: 'stemi', pulse: true,
      help: 'Sinusrhythmus, aber die ST-Strecke ist angehoben („Grabstein“). Nur das 12-Kanal-EKG sichert die Diagnose.' },
    vt: { name: 'Ventrikuläre Tachykardie mit Puls', rate: 'tachy', reg: 'ja', qrs: 'breit', p: 'keine', todo: 'instabil', pulse: true,
      help: 'Schnell, regelmäßig, breite gleich aussehende QRS, keine P-Wellen. Puls tastbar → kein Rea, aber hochgefährlich.' },
    pvt: { name: 'Pulslose ventrikuläre Tachykardie (pVT)', rate: 'tachy', reg: 'ja', qrs: 'breit', p: 'keine', todo: 'schock', pulse: false,
      help: 'Wie VT, aber KEIN Puls: Kreislaufstillstand, schockbar.' },
    torsade: { name: 'Torsade de pointes', rate: 'tachy', reg: 'nein', qrs: 'breit', p: 'keine', todo: 'schock', pulse: false,
      help: 'Polymorphe VT: breite Komplexe, deren Höhe an- und abschwillt, als drehten sie sich um die Grundlinie. Ohne Puls schockbar.' },
    vf: { name: 'Kammerflimmern (VF)', rate: 'none', reg: 'nb', qrs: 'keine', p: 'keine', todo: 'schock', pulse: false,
      help: 'Chaotische Zacken ohne erkennbare QRS-Komplexe. Schockbar.' },
    asystolie: { name: 'Asystolie', rate: 'none', reg: 'nb', qrs: 'keine', p: 'nichts', todo: 'keinSchock', pulse: false,
      help: 'Nulllinie. Ableitung, Elektroden und Verstärkung prüfen. Nicht schockbar.' },
    pea: { name: 'PEA (pulslose elektrische Aktivität)', rate: 'brady', reg: 'ja', qrs: 'schmal', p: 'normal', todo: 'keinSchock', pulse: false,
      help: 'Geordneter Rhythmus am Monitor, aber kein Puls. Nur die Pulskontrolle unterscheidet PEA vom Sinusrhythmus. Nicht schockbar.' },
  };

  /* Fallvignetten (Puls/RR passend zum Rhythmus) */
  const VIGNETTES = {
    sinus: ['68 J., Routinekontrolle nach Sturz, beschwerdefrei. RR 135/80.'],
    sinustachy: ['24 J., hohes Fieber, Schüttelfrost. RR 115/70.', '35 J., nach Fahrradsturz, starke Schmerzen am Arm. RR 140/85.'],
    sinusbrady: ['29 J., Marathonläufer, beschwerdefrei. RR 120/70.', '74 J., nimmt Betablocker, etwas müde. RR 110/65.'],
    vhf: ['79 J., Herzrasen seit dem Morgen, leichte Atemnot. RR 125/80.'],
    flattern: ['66 J., Herzklopfen und Schwindel seit 2 Stunden. RR 115/75.'],
    svt: ['31 J., plötzliches Herzrasen beim Bücken, „wie ein Schalter“. RR 105/70.'],
    avb1: ['70 J., Kontroll-EKG, beschwerdefrei. RR 140/85.'],
    wenckebach: ['58 J., nachts gemessen, leichtes Stolpern. RR 130/80.'],
    mobitz2: ['76 J., zweimal kurz schwarz vor Augen. RR 105/60.'],
    avb3: ['82 J., Synkope in der Küche, jetzt blass und schwindelig. RR 85/50.'],
    ves: ['55 J., spürt „Herzstolpern“, sonst gut. RR 130/80.'],
    pacer: ['84 J., Narbe unter dem linken Schlüsselbein, kommt wegen Sturz. RR 130/75.'],
    stemi: ['61 J., drückender Brustschmerz seit 40 Minuten, kaltschweißig. RR 150/90.'],
    vt: ['67 J., bekannter Herzinfarkt vor 2 Jahren, Herzrasen, noch ansprechbar. RR 90/60.'],
    pvt: ['57 J., plötzlich zusammengebrochen, keine Reaktion, keine normale Atmung.'],
    torsade: ['49 J., Alkoholkrankheit, mehrere Medikamente, plötzlich bewusstlos.'],
    vf: ['63 J., im Fitnessstudio zusammengebrochen, Schnappatmung.'],
    asystolie: ['88 J., leblos im Bett aufgefunden, keine Atmung.'],
    pea: ['45 J., Messerstich in die Brust, bewusstlos, keine normale Atmung.'],
  };

  /* Streifen bauen: Ereignislisten über `dur` Sekunden */
  function build(key, dur) {
    dur = dur || 6;
    const P = [], Q = []; // P: Zeitpunkte der P-Wellen, Q: {t, kind}
    let cont = null, flutter = 0, fib = false, spikes = [];
    const sinusRun = (rate, pq) => {
      let t = rnd(0.1, 0.6);
      while (t < dur + 1) { P.push(t); Q.push({ t: t + pq, kind: 'n' }); t += (60 / rate) * rnd(0.98, 1.02); }
    };
    let hr = 0;
    switch (key) {
      case 'sinus': hr = Math.round(rnd(65, 90)); sinusRun(hr, 0.16); break;
      case 'sinustachy': hr = Math.round(rnd(110, 140)); sinusRun(hr, 0.13); break;
      case 'sinusbrady': hr = Math.round(rnd(38, 52)); sinusRun(hr, 0.17); break;
      case 'stemi': hr = Math.round(rnd(70, 95)); sinusRun(hr, 0.16); break;
      case 'pea': hr = Math.round(rnd(35, 50)); sinusRun(hr, 0.16); break;
      case 'avb1': hr = Math.round(rnd(60, 80)); sinusRun(hr, rnd(0.3, 0.38)); break;
      case 'vhf': {
        fib = true; let t = rnd(0.1, 0.4);
        while (t < dur + 1) { Q.push({ t, kind: 'n' }); t += rnd(0.33, 0.85); }
        hr = Math.round(Q.filter((q) => q.t < dur).length * 60 / dur); break;
      }
      case 'flattern': {
        flutter = 0.2; const ratio = pick([2, 2, 4]); let t = 0.15, i = 0;
        while (t < dur + 1) { if (i % ratio === 0) Q.push({ t: t + 0.12, kind: 'n' }); t += 0.2; i++; }
        hr = Math.round(300 / ratio); break;
      }
      case 'svt': { hr = Math.round(rnd(170, 210)); let t = 0.1; while (t < dur + 1) { Q.push({ t, kind: 'n' }); t += 60 / hr; } break; }
      case 'wenckebach': {
        const pp = 60 / rnd(75, 90); const cyc = pick([3, 4]); let t = rnd(0.1, 0.4), i = 0;
        while (t < dur + 1) {
          const k = i % (cyc + 1);
          P.push(t);
          if (k < cyc) Q.push({ t: t + 0.16 + k * 0.08, kind: 'n' });
          t += pp; i++;
        }
        hr = Math.round(Q.filter((q) => q.t < dur).length * 60 / dur); break;
      }
      case 'mobitz2': {
        const pp = 60 / rnd(75, 90); const ratio = pick([2, 3]); let t = rnd(0.1, 0.4), i = 0;
        while (t < dur + 1) { P.push(t); if (i % ratio !== ratio - 1) Q.push({ t: t + 0.18, kind: 'n' }); t += pp; i++; }
        hr = Math.round(Q.filter((q) => q.t < dur).length * 60 / dur); break;
      }
      case 'avb3': {
        const pp = 60 / rnd(72, 90); let t = rnd(0, 0.5); while (t < dur + 1) { P.push(t); t += pp; }
        hr = Math.round(rnd(30, 40)); t = rnd(0.3, 1.0); while (t < dur + 1) { Q.push({ t, kind: 'w' }); t += 60 / hr; }
        break;
      }
      case 'ves': {
        hr = Math.round(rnd(68, 84)); const rr = 60 / hr; let t = rnd(0.1, 0.4), i = 0;
        while (t < dur + 1) {
          P.push(t); Q.push({ t: t + 0.16, kind: 'n' });
          Q.push({ t: t + 0.16 + rr * 0.6, kind: 'v' });
          t += rr * 2; i++;
        }
        break;
      }
      case 'pacer': {
        hr = 70; let t = rnd(0.1, 0.5);
        while (t < dur + 1) { spikes.push(t); Q.push({ t: t + 0.03, kind: 'w' }); t += 60 / hr; }
        break;
      }
      case 'vt': case 'pvt': { hr = Math.round(rnd(160, 200)); let t = 0.1; while (t < dur + 1) { Q.push({ t, kind: 'vt' }); t += 60 / hr; } break; }
      case 'torsade': { hr = 240; cont = 'torsade'; break; }
      case 'vf': cont = 'vf'; break;
      case 'asystolie': cont = 'asy'; break;
    }
    const phase = Math.random() * 10;
    const st = key === 'stemi' ? 0.35 : 0;
    function qrsVal(dt, kind) {
      if (kind === 'n') {
        let v = g(dt, -0.035, 0.009, -0.12) + g(dt, 0, 0.011, 1.2) + g(dt, 0.035, 0.011, -0.3) + g(dt, 0.27, 0.05, 0.3);
        if (st) v += st / (1 + Math.exp(-(dt - 0.05) / 0.008)) / (1 + Math.exp((dt - 0.3) / 0.03));
        return v;
      }
      if (kind === 'w') return g(dt, 0, 0.04, 1.0) + g(dt, 0.07, 0.03, -0.35) + g(dt, 0.32, 0.07, -0.35);
      if (kind === 'v') return g(dt, 0, 0.05, -1.3) + g(dt, 0.09, 0.04, 0.5) + g(dt, 0.32, 0.07, 0.45);
      if (kind === 'vt') return g(dt, 0, 0.05, 1.1) + g(dt, 0.13, 0.05, -0.55);
      return 0;
    }
    function value(t) {
      let v = 0;
      if (cont === 'vf') {
        const p = t + phase;
        const amp = 0.35 + 0.22 * Math.sin(p * 0.9) + 0.1 * Math.sin(p * 2.3);
        v = amp * (Math.sin(p * 2 * Math.PI * 4.6) + 0.6 * Math.sin(p * 2 * Math.PI * 6.3 + 1.1) + 0.4 * Math.sin(p * 2 * Math.PI * 3.1 + 2));
      } else if (cont === 'asy') {
        v = 0.03 * Math.sin(t * 0.7 + phase) + (Math.random() - 0.5) * 0.012;
      } else if (cont === 'torsade') {
        const env = 0.25 + 0.95 * Math.abs(Math.sin((t + phase) * Math.PI / 2.4));
        v = env * Math.sin(t * 2 * Math.PI * 4);
      } else {
        for (const p of P) { const dt = t - p; if (dt > -0.1 && dt < 0.1) v += g(dt, 0, 0.025, 0.15); }
        for (const q of Q) { const dt = t - q.t; if (dt > -0.15 && dt < 0.6) v += qrsVal(dt, q.kind); }
        for (const s of spikes) { const dt = t - s; if (dt > -0.004 && dt < 0.006) v += 1.6; }
        if (fib) v += 0.05 * Math.sin(t * 2 * Math.PI * 6.5 + phase) + 0.03 * Math.sin(t * 2 * Math.PI * 9.1);
        if (flutter) { const x = ((t - 0.15) % flutter + flutter) % flutter / flutter; v += 0.22 * (x < 0.75 ? -x / 0.75 : -(1 - x) / 0.25) + 0.11; }
        v += (Math.random() - 0.5) * 0.012;
      }
      return v;
    }
    return Object.assign({ key, dur, hr, value, vignette: pick(VIGNETTES[key] || ['']) }, R[key]);
  }

  /* Auf EKG-Papier zeichnen: 25 mm/s, kleines Kästchen 0,04 s, großes 0,2 s */
  function draw(canvas, strip) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    const w = Math.max(200, r.width), h = Math.max(120, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pxs = w / strip.dur; // Pixel pro Sekunde
    const mv = h / 3.2; // Pixel pro mV
    ctx.fillStyle = '#fff6f4'; ctx.fillRect(0, 0, w, h);
    const small = pxs * 0.04;
    if (small >= 3.5) {
      ctx.strokeStyle = '#f6cfc9'; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let x = 0; x < w; x += small) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = h; y > 0; y -= mv * 0.1) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = '#eb9a90'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < w; x += pxs * 0.2) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = h; y > 0; y -= mv * 0.5) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    // Sekundenmarken
    ctx.fillStyle = '#b5584c'; ctx.font = '10px -apple-system, sans-serif';
    for (let s = 1; s < strip.dur; s++) { ctx.fillRect(s * pxs - 0.5, h - 8, 1, 8); ctx.fillText(s + ' s', s * pxs + 2, h - 2); }
    // Kurve
    const base = h * 0.55;
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.beginPath();
    const n = Math.round(w * 2);
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * strip.dur;
      const y = base - strip.value(t) * mv;
      if (i === 0) ctx.moveTo(0, y); else ctx.lineTo((i / n) * w, y);
    }
    ctx.stroke();
  }

  window.ECG2 = { R, P_OPTS, TODO, build, draw };
})();
