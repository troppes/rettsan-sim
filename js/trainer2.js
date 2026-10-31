/* Profi-EKG-Trainer: systematische Rhythmusanalyse auf EKG-Papier. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const { R, P_OPTS, TODO, build, draw } = window.ECG2;

  const SETS = {
    alle: Object.keys(R),
    rea: ['vf', 'pvt', 'asystolie', 'pea', 'torsade', 'vt', 'sinus'],
    brady: ['sinusbrady', 'avb1', 'wenckebach', 'mobitz2', 'avb3', 'pacer', 'pea', 'sinus'],
    tachy: ['sinustachy', 'vhf', 'flattern', 'svt', 'vt', 'pvt', 'torsade', 'sinus'],
  };

  const T = { strip: null, set: 'alle', pts: 0, max: 0, n: 0, streak: 0, best: 0, last: null };

  const RATE_OPTS = { brady: 'Unter 60/min', normal: '60–100/min', tachy: 'Über 100/min', none: 'Keine geordneten Kammerkomplexe' };
  const REG_OPTS = { ja: 'Regelmäßig', nein: 'Unregelmäßig', nb: 'Nicht beurteilbar' };
  const QRS_OPTS = { schmal: 'Schmal (unter 0,12 s = unter 3 kleinen Kästchen)', breit: 'Breit (0,12 s oder mehr)', teils: 'Teils schmal, teils breit', keine: 'Keine QRS-Komplexe erkennbar' };

  const STEP_HELP = {
    rate: '6-Sekunden-Methode: Zähle die QRS-Komplexe im ganzen Streifen (6 s) und nimm sie mal 10. Oder: 300 geteilt durch die Zahl der großen Kästchen zwischen zwei R-Zacken.',
    reg: 'Vergleiche die Abstände zwischen den R-Zacken (RR-Abstände). Sind sie überall gleich lang?',
    qrs: 'Ein kleines Kästchen = 0,04 s, ein großes = 0,2 s. Breiter als 3 kleine Kästchen (0,12 s) = breit = Ursprung meist in der Kammer.',
    p: 'Schau vor jeden QRS: Gibt es eine kleine runde P-Welle? Gleicher Abstand (PQ unter 0,2 s = 1 großes Kästchen)? Gibt es P-Wellen ohne QRS?',
    diag: 'Setze die Befunde zusammen: Frequenz + Regelmäßigkeit + QRS-Breite + Verhältnis von P zu QRS.',
    todo: 'Erst Puls prüfen: Kein Puls = Reanimation. Dann: schockbar oder nicht? Mit Puls: Ist der Rhythmus für den Patienten gefährlich?',
  };

  function rateCat(s) {
    if (s.rate === 'none') return 'none';
    if (s.key === 'pvt' || s.key === 'vt' || s.key === 'torsade') return 'tachy';
    return s.hr < 60 ? 'brady' : s.hr > 100 ? 'tachy' : 'normal';
  }

  function start() {
    document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === 'trainer2'));
    window.scrollTo(0, 0);
    next();
  }

  function next() {
    const pool = SETS[T.set];
    let k; do { k = pool[Math.floor(Math.random() * pool.length)]; } while (k === T.last && pool.length > 1);
    T.last = k;
    T.strip = build(k, 6);
    T.pulseChecked = false;
    $('t2Vig').textContent = T.strip.vignette;
    $('t2Pulse').textContent = '';
    $('t2Steps').innerHTML = '';
    $('t2Next').hidden = true;
    requestAnimationFrame(() => {
      const wrap = $('t2Wrap');
      const cv = $('t2Canvas');
      cv.style.width = Math.max(wrap.clientWidth, 6 * 120) + 'px';
      draw(cv, T.strip);
      wrap.scrollLeft = 0;
    });
    const s = T.strip;
    const qrsAns = s.key === 'ves' ? 'teils' : s.qrs;
    const steps = [
      { id: 'rate', q: '1. Wie hoch ist die Kammerfrequenz?', opts: RATE_OPTS, ans: rateCat(s), pts: 1,
        explain: s.rate === 'none' ? 'Keine zählbaren Kammerkomplexe.' : `Etwa ${s.hr}/min.` },
      { id: 'reg', q: '2. Ist der Rhythmus regelmäßig?', opts: REG_OPTS, ans: s.reg, pts: 1 },
      { id: 'qrs', q: '3. Wie breit sind die QRS-Komplexe?', opts: QRS_OPTS, ans: qrsAns, pts: 1 },
      { id: 'p', q: '4. Was ist mit den P-Wellen?', opts: pickOpts(P_OPTS, s.p, 5), ans: s.p, pts: 1 },
      { id: 'diag', q: '5. Welcher Rhythmus ist das?', opts: pickOpts(Object.fromEntries(Object.keys(R).map((k2) => [k2, R[k2].name])), s.key, 5), ans: s.key, pts: 3, explain: s.help },
      { id: 'todo', q: '6. Was machst du als RettSan?', opts: TODO, ans: s.todo, pts: 2, needPulse: true },
    ];
    T.steps = steps;
    showStep(0);
    stats();
  }

  function pickOpts(all, correct, n) {
    const others = shuffle(Object.keys(all).filter((k) => k !== correct)).slice(0, n - 1);
    const o = {};
    shuffle([correct].concat(others)).forEach((k) => { o[k] = all[k]; });
    return o;
  }

  function showStep(i) {
    const st = T.steps[i];
    if (!st) { T.n++; if (T.cur === T.curMax) { T.streak++; T.best = Math.max(T.best, T.streak); } else T.streak = 0; stats(); $('t2Next').hidden = false; return; }
    if (i === 0) { T.cur = 0; T.curMax = 0; }
    const card = document.createElement('div');
    card.className = 'card t2step';
    card.innerHTML = `<div class="t2q">${esc(st.q)}</div><div class="options"></div><div class="row"><button class="btn small ghost" data-h>💡 Hilfe</button></div><div class="t2res"></div>`;
    $('t2Steps').appendChild(card);
    let help = false;
    card.querySelector('[data-h]').onclick = (e) => {
      help = true; e.target.disabled = true;
      let h = STEP_HELP[st.id];
      if (st.id === 'diag') h += '<br><br>' + Object.keys(st.opts).map((k) => `<b>${esc(R[k].name)}:</b> ${esc(R[k].help)}`).join('<br>');
      card.querySelector('.t2res').innerHTML = `<div class="helpbox">${h}</div>`;
    };
    const box = card.querySelector('.options');
    Object.keys(st.opts).forEach((k) => {
      const b = document.createElement('button');
      b.className = 'opt'; b.textContent = st.opts[k];
      b.onclick = () => {
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        card.querySelector('[data-h]').disabled = true;
        const ok = k === st.ans;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...box.children][Object.keys(st.opts).indexOf(st.ans)].classList.add('right');
        const got = ok ? (help ? Math.floor(st.pts / 2) : st.pts) : 0;
        T.pts += got; T.max += st.pts; T.cur += got; T.curMax += st.pts;
        let ex = st.explain || '';
        if (st.needPulse) {
          ex = (T.strip.pulse ? 'Puls tastbar. ' : 'KEIN Puls: Kreislaufstillstand! ') + ex;
          if (!T.pulseChecked && (T.strip.key === 'pea' || T.strip.key === 'pvt' || T.strip.key === 'vt')) ex += ' Tipp: Bei geordnetem oder schnellem breitem Rhythmus immer zuerst den Puls prüfen.';
        }
        card.querySelector('.t2res').innerHTML = `<div class="explain">${ok ? '✓ ' : '✗ '}${esc(ex || (ok ? 'Richtig.' : 'Richtig wäre: ' + st.opts[st.ans]))}</div>`;
        stats();
        showStep(i + 1);
        requestAnimationFrame(() => card.nextElementSibling && card.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
      };
      box.appendChild(b);
    });
  }

  function stats() {
    const pct = T.max ? Math.round((100 * T.pts) / T.max) : 0;
    $('t2Stats').textContent = `${T.n} Streifen · ${pct} % · Serie ${T.streak} (Rekord ${T.best})`;
  }

  function init() {
    $('btnTrainer2').onclick = start;
    $('t2Back').onclick = () => { document.querySelector('#home').classList.add('active'); document.querySelector('#trainer2').classList.remove('active'); window.scrollTo(0, 0); };
    $('t2Next').onclick = () => { next(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    $('t2Set').onchange = (e) => { T.set = e.target.value; next(); };
    $('t2PulseBtn').onclick = () => {
      T.pulseChecked = true;
      const s = T.strip;
      $('t2Pulse').textContent = s.pulse ? `Puls tastbar, ca. ${s.hr}/min` : 'Kein Puls tastbar!';
    };
    window.addEventListener('resize', () => { if (T.strip && $('trainer2').classList.contains('active')) draw($('t2Canvas'), T.strip); });
  }

  init();
  window.__t2 = T;
})();
