/* Spiel-Engine und Oberfläche. Kein Speichern, kein Login. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const A = window.ACTIONS;
  const CASES = window.CASES;
  const { Monitor, RHYTHMS, HELP } = window.ECG;
  const LET = A.LETTERS; // S x A B C D E
  const li = (l) => LET.indexOf(l);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const settings = { worsen: true, detail: true };
  const PROCS = window.PROCS;
  const MOOD_FACE = (m) => m >= 8 ? '🙂' : m >= 5 ? '😐' : m >= 3 ? '😟' : '😠';
  let C = null; // aktueller Fall
  let s = null; // Spielzustand
  let mon = null; // Monitor im Einsatz

  /* ---------------------------------------------------------------- Standardtexte */
  const DEFAULT_FIND = {
    sss: 'Einsatzstelle sicher, keine besonderen Gefahren.',
    bak: 'Patient ist wach und atmet normal, Puls tastbar.',
    x_check: 'Keine kritische Blutung.',
    a_check: 'Atemweg frei, der Patient spricht in ganzen Sätzen.',
    b_af: '',
    b_ausk: 'Vesikuläres Atemgeräusch beidseits, keine Nebengeräusche.',
    c_puls: 'Regelmäßig, gut tastbar.',
    c_rekap: 'Rekap unter 2 s, Haut rosig, warm und trocken.',
    c_12: 'Sinusrhythmus, keine ST-Hebungen.',
    c_5b: 'Kein Hinweis auf Blutung in Brustkorb, Bauch, Becken, Oberschenkeln oder am Boden.',
    d_gcs: '',
    d_pup: 'Pupillen gleich groß, mittelweit, prompte Lichtreaktion.',
    d_befast: 'BE-FAST unauffällig.',
    e_body: 'Keine weiteren Verletzungen oder Auffälligkeiten.',
  };
  const DEFAULT_TREAT = {
    m_nef: 'NEF über die Leitstelle nachalarmiert.',
    m_betreuung: 'Du sprichst ruhig mit dem Patienten und erklärst, was ihr macht.',
    m_zeit: 'Uhrzeit notiert.',
    m_abdr: 'Hochgehalten und abgedrückt.',
    m_druckv: 'Druckverband angelegt.',
    m_tq: 'Tourniquet angelegt, Uhrzeit notiert.',
    m_hws: 'HWS manuell fixiert, Stifneck angelegt.',
    m_esmarch: 'Esmarch-Handgriff durchgeführt.',
    m_absaug: 'Absaugbereitschaft hergestellt.',
    m_guedel: 'Guedel-Tubus eingelegt.',
    m_o2_nb: 'O₂ über Nasenbrille, 2–4 l/min.',
    m_o2_mask: 'O₂ über Reservoirmaske, 15 l/min.',
    m_bmv: 'Beutel-Masken-Beatmung.',
    m_lippen: 'Lippenbremse angeleitet.',
    m_spray: 'Hilfe beim Notfallspray.',
    m_allergen: 'Mögliche Allergenquelle entfernt.',
    m_schock: 'Beine hochgelagert.',
    m_becken: 'Beckenschlinge angelegt.',
    m_defi_kleben: 'Defi-Elektroden kleben.',
    m_ivz: 'i.v.-Zugang gelegt.',
    m_ivz_vorb: 'Zugang und Infusion für das NEF vorbereitet.',
    m_vel: 'VEL-Infusion läuft.',
    m_epipen: 'Adrenalin-Autoinjektor gegeben.',
    m_polster: 'Umgebung gesichert, Kopf gepolstert.',
    m_festhalten: 'Du hältst den Patienten fest.',
    m_beisskeil: 'Beißkeil eingelegt.',
    m_gluc_oral: 'Glucose oral gegeben.',
    m_gluc_iv: 'Glucose i.v. gegeben.',
    m_rektiole: 'Rektiole gegeben.',
    m_eltern_rekt: 'Eltern angeleitet.',
    m_essen: 'Der Patient isst etwas.',
    m_raus: 'Patient aus der Gefahrenzone gebracht.',
    m_kuehl: 'Aktiv gekühlt.',
    m_kalt_wasch: 'Kalt abgewaschen.',
    m_waerme: 'Zugedeckt, Wärmeerhalt.',
    m_trinken: 'Der Patient trinkt etwas.',
    m_ok_hoch: 'Oberkörper hochgelagert.',
    m_ok30: 'Oberkörper 30° hoch.',
    m_ssl: 'Stabile Seitenlage.',
    m_flach: 'Flache Rückenlage.',
    m_laufen: 'Der Patient läuft zum RTW.',
    m_voranm: 'Klinik vorangemeldet.',
  };
  // Generische Fehler, wenn der Fall nichts anderes sagt
  const GENERIC_BAD = {
    m_festhalten: { pts: -5, why: 'Patienten festzuhalten ist hier nicht angebracht.' },
    m_beisskeil: { pts: -5, why: 'Kein Beißkeil: Verletzungsgefahr und Aspiration.' },
    m_rektiole: { pts: -5, why: 'Diazepam ist nicht in der RettSan-Freigabe der Schulmeinung.' },
    m_tq: { pts: -5, why: 'Keine kritische Blutung: kein Tourniquet.' },
    m_becken: { pts: -3, why: 'Kein Hinweis auf eine Beckenverletzung.' },
    m_gluc_iv: { pts: -5, why: 'Glucose i.v. durch RettSan nur bei GCS 3 und Hypoglykämie im Rahmen des § 34.' },
    m_epipen: { pts: -5, why: 'Keine Anaphylaxie: kein Adrenalin.' },
    m_ivz: { pts: -3, why: 'Ohne Reanimation oder klaren § 34-Notstand legt der RettSan keinen Zugang.' },
    m_guedel: { pts: -3, why: 'Ein wacher Patient toleriert keinen Guedel-Tubus (Würgereiz, Erbrechen).' },
    m_bmv: { pts: -3, why: 'Der Patient atmet ausreichend selbst.' },
    m_laufen: { pts: -3, why: 'Kranke Patienten nicht laufen lassen: Tragestuhl oder Trage.' },
  };

  /* ---------------------------------------------------------------- Start */
  const pickDispatch = (c) => (c.dispatches && c.dispatches.length) ? c.dispatches[Math.floor(Math.random() * c.dispatches.length)] : { short: c.short, text: c.dispatch };
  function renderList() {
    const list = $('caseList');
    list.innerHTML = '';
    CASES.forEach((c) => {
      const pick = pickDispatch(c);
      const b = document.createElement('button');
      b.className = 'case-btn';
      b.innerHTML = `<span class="ico">${c.person || '🚑'}</span><span class="t"><b>${esc(pick.short)}</b></span><span class="lvl">${'●'.repeat(c.level)}${'○'.repeat(3 - c.level)}</span>`;
      b.onclick = () => startCase(c, pick);
      list.appendChild(b);
    });
  }
  function initHome() {
    renderList();
    $('btnRandom').onclick = () => startCase(CASES[Math.floor(Math.random() * CASES.length)]);
    $('btnTrainer').onclick = startTrainer;
    $('optWorsen').onchange = (e) => { settings.worsen = e.target.checked; };
    $('optDetail').onchange = (e) => { settings.detail = e.target.checked; };
  }

  function show(id) {
    if (id === 'home') renderList();
    document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------------- Einsatz starten */
  function startCase(c, pick) {
    C = c;
    pick = pick || pickDispatch(c);
    s = {
      dispatch: pick, mood: c.mood != null ? c.mood : 6, unlocked: [], momentDone: {}, momentQueue: [], procWarned: {},
      time: 0, v: Object.assign({}, c.start), status: c.start.status,
      count: {}, lastAt: {}, fixed: {}, flags: {}, warned: {}, quizDone: {},
      letters: {}, events: [], attached: { ekg: false, spo2: false }, nibp: null, afShown: null,
      measured: {}, over: false, firstTreat: false, rea: null,
    };
    (c.problems || []).forEach((p) => { s.fixed[p.id] = false; });
    if (c.rea) initRea();

    show('game');
    $('gTitle').textContent = pick.short;
    $('pIcon').textContent = c.person || c.icon;
    $('tabs').classList.toggle('has-rea', !!c.rea);
    $('log').innerHTML = '';
    if (!mon) {
      mon = new Monitor($('ecg'));
      mon.onBeat = () => { const el = document.querySelector('.v.hr'); el.classList.add('beat'); setTimeout(() => el.classList.remove('beat'), 120); };
    }
    mon.resize();
    mon.setRhythm(null);
    mon.showPleth = false;
    mon.cpr = false;
    mon.start();
    log('dispatch', `<span class="who">🚑 Einsatzmeldung</span>${esc(pick.text)}`, true);
    log('info', 'Ihr seid zu zweit mit dem RTW vor Ort. Du bist Rettungssanitäter. Wähle unten, was du tust.');
    render();
  }

  /* ---------------------------------------------------------------- Log & Feedback */
  function log(type, html, raw) {
    const d = document.createElement('div');
    d.className = 'entry ' + type;
    d.innerHTML = raw ? html : esc(html);
    $('log').appendChild(d);
    requestAnimationFrame(() => { $('log').scrollTop = $('log').scrollHeight; });
    return d;
  }
  function toast(text, type) {
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = text;
    const box = $('toasts');
    while (box.children.length >= 2) box.firstChild.remove();
    box.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function addEvent(pts, max, text, why, type) {
    s.events.push({ pts, max, text, why, type: type || (pts < 0 ? 'bad' : 'good'), at: s.time });
  }
  function penalty(pts, text) {
    addEvent(-Math.abs(pts), 0, text, null, 'bad');
    log('bad', `<span class="pts">−${Math.abs(pts)}</span> ${esc(text)}`, true);
    toast(`−${Math.abs(pts)} Punkte`, 'bad');
    renderTop();
  }
  function reward(pts, max, text) {
    addEvent(pts, max, text, null, 'good');
    if (pts > 0) {
      log('good', `<span class="pts">+${pts}</span> ${esc(text)}`, true);
      toast(`+${pts} Punkte`, 'good');
    }
    renderTop();
  }

  /* ---------------------------------------------------------------- Zeit & Verschlechterung */
  function advance(sec) {
    const steps = Math.max(1, Math.round(sec / 10));
    const dt = sec / steps;
    for (let i = 0; i < steps; i++) {
      s.time += dt;
      const dtMin = dt / 60;
      if (settings.worsen) {
        (C.problems || []).forEach((p) => {
          if (s.fixed[p.id] || !p.worsen || !isActive(p)) return;
          Object.keys(p.worsen).forEach((k) => { s.v[k] += p.worsen[k] * dtMin; });
        });
      }
      if (C.tick) C.tick(s, api(dtMin));
      clampVitals();
    }
  }
  function api(dtMin) {
    return {
      worsen: settings.worsen, dtMin: dtMin || 0,
      alert: (t) => { log('alert', '⚠️ ' + t); toast('⚠️ Zustand verändert', 'bad'); },
      info: (t) => log('info', 'ℹ️ ' + t),
    };
  }
  function clampVitals() {
    const v = s.v;
    v.spo2 = Math.max(0, Math.min(100, v.spo2));
    v.gcs = Math.max(3, Math.min(15, Math.round(v.gcs)));
    v.hr = Math.max(0, v.hr);
    v.sys = Math.max(0, v.sys); v.dia = Math.max(0, Math.min(v.dia, v.sys - 10));
    v.af = Math.max(0, v.af);
    v.bz = Math.max(10, v.bz);
  }
  function isActive(p) { return !p.active || p.active(s); }
  function openBlocking(maxLetterIdx, exceptId) {
    return (C.problems || []).filter((p) => p.blocking && !s.fixed[p.id] && isActive(p) && li(p.letter) < maxLetterIdx && !(p.fixedBy || []).includes(exceptId))
      .sort((a, b) => li(a.letter) - li(b.letter));
  }

  /* ---------------------------------------------------------------- Reihenfolge prüfen */
  function orderCheck(a) {
    if (a.kind === 'rea' || C.rea) return;
    const patientAction = (a.kind === 'assess' || a.kind === 'treat') && a.id !== 'sss';
    if (patientAction && !s.count.sss && !s.warned.sss) {
      s.warned.sss = true;
      penalty(C.sssPts || 3, 'Zuerst SSS: Szene, Sicherheit, Situation. Eigenschutz geht vor.');
    }
    if (a.kind === 'ask') {
      if (a.id === 'q_hallo' || a.id === 'q_erkl' || a.id.startsWith('f_')) return;
      const open = openBlocking(li('D'));
      if (open.length) s.quickAsk = (s.quickAsk || 0) + 1;
      if (open.length && s.quickAsk > 2 && !s.warned.ask) {
        s.warned.ask = true;
        penalty(3, `Ein, zwei kurze Fragen sind okay, aber jetzt erst behandeln, dann ausführlich befragen. Offen ist noch: ${open[0].label} (${open[0].letter}).`);
      }
      return;
    }
    const L = a.letter;
    if (!L || L === 'S') return;
    const open = openBlocking(li(L), a.id);
    if (open.length) {
      const p = open[0];
      const key = 'blk_' + a.id + '_' + p.id;
      if (!s.warned[key]) {
        s.warned[key] = true;
        penalty(5, `„${a.label}“ gehört zu ${L}, aber zuerst muss das ${p.letter}-Problem behandelt werden: ${p.label}. Treat first what kills first!`);
      }
      return;
    }
    if (a.kind === 'assess') {
      // Kein Abzug, wenn nichts Bedrohliches übersprungen wird. Nur ein Tipp, falls gar kein Ersteindruck da war.
      const missing = LET.slice(1, li(L)).filter((l) => !s.letters[l]);
      if (missing.length && !s.warned.skiptip) {
        s.warned.skiptip = true;
        log('info', `💡 Tipp: Ein kurzer Ersteindruck (Ansprechen) deckt x bis C grob ab. Beim stabilen Patienten darfst du danach gezielt nach dem Leitsymptom vorgehen.`);
      }
    }
  }

  /* ---------------------------------------------------------------- Aktion ausführen */
  function actionFor(id) {
    if (A.byId[id]) return A.byId[id];
    const f = (C.followups || {})[id];
    return f ? { id, label: f.label, kind: 'ask', letter: null, time: 15, followup: true } : null;
  }
  function act(id) {
    if (s.over || $('modalBg').classList.contains('open')) return;
    closeSheet();
    const a = actionFor(id);
    log('you', a.label);
    orderCheck(a);
    const go = () => {
      const quiz = findQuiz(a);
      const withProc = () => {
        if (useProc(a)) runProc(a, () => perform(a)); else perform(a);
      };
      if (quiz) { s.quizDone[quiz.idx] = true; runQuiz(quiz.q, withProc); } else withProc();
    };
    const mo = findMoment({ before: id });
    if (mo) showMoment(mo, go); else go();
  }
  function useProc(a) {
    if (!settings.detail || !PROCS.P[a.id] || s.count[a.id]) return false;
    if (C.rea && s.rea && !s.rea.rosc) return false;
    if (a.id === 'm_tq' && !(C.problems || []).some((p) => (p.fixedBy || []).includes('m_tq'))) return false;
    return true;
  }

  function findQuiz(a) {
    const qs = C.quizzes || [];
    for (let i = 0; i < qs.length; i++) {
      if (s.quizDone[i]) continue;
      const on = qs[i].on;
      if (on === a.id) return { idx: i, q: qs[i], after: true };
      if (on === 'treat' && a.kind === 'treat' && !['m_nef', 'm_betreuung', 'm_zeit'].includes(a.id)) return { idx: i, q: qs[i] };
    }
    return null;
  }

  function perform(a) {
    if (C.rea && reaAction(a)) { render(); afterAction(a.id); return; }
    if (a.kind === 'assess') doAssess(a);
    else if (a.kind === 'ask') doAsk(a);
    else doTreat(a);
    render();
    afterAction(a.id);
  }

  /* ---------------------------------------------------------------- Stimmung */
  function conscious() { return s.v.gcs >= 13 && !(C.rea && s.rea && !s.rea.rosc); }
  function moodChange(d) {
    if (!d) return;
    s.mood = Math.max(0, Math.min(10, s.mood + d));
    if (C.id === 'acs' && d < 0) s.v.hr += 2;
    renderMood();
  }
  function renderMood() {
    const show = conscious() && !C.child;
    $('pMood').textContent = show ? MOOD_FACE(s.mood) : '';
  }

  /* ---------------------------------------------------------------- Gesprächsmomente */
  function findMoment(trig) {
    const ms = C.moments || [];
    for (const m of ms) {
      if (s.momentDone[m.id]) continue;
      if (trig.before && m.before === trig.before) return m;
      if (trig.after && m.after && m.after.includes(trig.after)) return m;
      if (trig.tick) {
        if (m.at != null && s.time >= m.at && !m.after && !m.before) return m;
        if (m.cond && m.cond(s)) return m;
      }
    }
    return null;
  }
  function afterAction(id) {
    const m = findMoment({ after: id }) || findMoment({ tick: true });
    if (m && !$('modalBg').classList.contains('open')) showMoment(m);
  }
  function showMoment(m, done) {
    s.momentDone[m.id] = true;
    const opts = shuffle(m.options.map((o, i) => i));
    const md = modal(`<div class="kicker">💬 ${esc(m.who)}</div><h3 style="font-weight:600">${esc(m.say)}</h3><p style="color:var(--muted);font-size:14px">Wie reagierst du?</p><div class="options"></div><div class="res"></div>`);
    log('pt moment', `<span class="who">${esc(m.who)}</span>${esc(m.say)}`, true);
    const box = md.querySelector('.options');
    opts.forEach((i) => {
      const o = m.options[i];
      const b = document.createElement('button');
      b.className = 'opt'; b.textContent = o.t;
      b.onclick = () => {
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        const good = (o.pts || 0) > 0;
        b.classList.add(good ? 'right' : (o.pts < 0 ? 'wrong' : ''));
        const best = m.options.reduce((mx, x) => Math.max(mx, x.pts || 0), 0);
        log('you', o.t);
        if (o.pts > 0) reward(o.pts, best, 'Gut reagiert: ' + m.who);
        else { addEvent(0, best, 'Gesprächsmoment: ' + m.who, null, 'none'); if (o.pts < 0) penalty(-o.pts, o.why || 'Ungünstige Reaktion.'); }
        moodChange(o.mood || 0);
        if (o.delta) { Object.keys(o.delta).forEach((k) => { s.v[k] += o.delta[k]; }); clampVitals(); }
        if (o.reply) log('pt', `<span class="who">${esc(m.who)}</span>${esc(o.reply)}`, true);
        md.querySelector('.res').innerHTML = (o.reply ? `<div class="react"><span class="who">${esc(m.who)}</span>${esc(o.reply)}</div>` : '') + (o.why && !(o.pts > 0) ? `<div class="explain">${esc(o.why)}</div>` : '') + '<button class="btn wide accent">Weiter</button>';
        md.querySelector('.res .btn').onclick = () => { closeModal(); render(); if (done) done(); else afterAction('__none'); };
      };
      box.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------- Maßnahmen Schritt für Schritt */
  function runProc(a, done) {
    const P = PROCS.P[a.id];
    const awake = conscious();
    const done_ = {};
    const list = [];
    let explained = false, consent = s.flags.consent || false;
    const md = modal(`<div class="kicker">Schritt für Schritt</div><h3>${esc(P.title)}</h3><p style="color:var(--muted);font-size:14px">Was machst du als Nächstes? Tippe die Schritte in deiner Reihenfolge an.</p><div class="proc-done"></div><div class="react"></div><div class="options"></div>`);
    const doneEl = md.querySelector('.proc-done');
    const reactEl = md.querySelector('.react');
    const box = md.querySelector('.options');
    const who = (C.child ? 'Mutter' : (C.answerer && C.answerer(s)) && !awake ? C.answerer(s) : (C.name || 'Patient'));
    const say = (t, w) => { reactEl.innerHTML = `<span class="who">${esc(w || who)}</span>${esc(t)}`; log('pt', `<span class="who">${esc(w || who)}</span>${esc(t)}`, true); };
    const steps = shuffle(P.steps);
    const draw = () => {
      doneEl.innerHTML = list.map((x, i) => `<div class="op ${x.bad ? 'bad' : ''}">${i + 1}. ${esc(x.label)}</div>`).join('');
      box.innerHTML = '';
      steps.filter((st) => !done_[st.id]).forEach((st) => {
        const b = document.createElement('button');
        b.className = 'opt'; b.textContent = st.label;
        b.onclick = () => pick(st);
        box.appendChild(b);
      });
    };
    const warnOnce = (key, pts, text) => { if (s.procWarned[key]) { log('info', text); return; } s.procWarned[key] = true; penalty(pts, text); };
    const refusal = (st) => {
      say(C.nonverbal ? '(Sie zieht den Arm weg und schüttelt heftig den Kopf.)' : '„Nein! Lassen Sie mich in Ruhe, ich will das nicht!“');
      box.innerHTML = '';
      const opts = [
        { t: 'Ruhig erklären, warum es wichtig ist, und nochmal fragen', ok: true, mood: 3, reply: '„…Na gut. Aber vorsichtig.“' },
        { t: 'Kollegin/Angehörige bitten, gut zuzureden', ok: true, mood: 2, reply: '„Wenn du meinst… okay.“' },
        { t: 'Trotzdem machen, ist ja zu ihrem Besten', ok: false },
      ];
      shuffle(opts).forEach((o) => {
        const b = document.createElement('button'); b.className = 'opt'; b.textContent = o.t;
        b.onclick = () => {
          if (o.ok) { moodChange(o.mood); consent = s.flags.consent = true; say(o.reply); reward(2, 2, 'Ablehnung respektvoll gelöst'); draw(); }
          else {
            penalty(10, 'Gegen den erklärten Willen eines ansprechbaren Patienten: Körperverletzung (§ 223 StGB). Bei Ablehnung erklären, überzeugen, Angehörige einbinden, im Zweifel NA, Ablehnung dokumentieren.');
            moodChange(-3); consent = true; done_[st.id] = true; list.push({ label: st.label + ' (gegen ihren Willen)', bad: true });
            say('„Aua! Sie haben mich einfach gestochen!“');
            if (st.final) return finishProc(); draw();
          }
        };
        box.appendChild(b);
      });
    };
    const pick = (st) => {
      if (st.wrong) {
        done_[st.id] = true; list.push({ label: st.label, bad: true });
        warnOnce(a.id + st.id, 2, st.wrong);
        draw(); return;
      }
      const missing = (st.needs || []).filter((n) => !done_[n]);
      if (missing.length) {
        const names = missing.map((n) => P.steps.find((x) => x.id === n).label).join(', ');
        warnOnce(a.id + st.id + 'need', 1, `Reihenfolge: Vor „${st.label}“ kommt erst: ${names}.`);
        return;
      }
      if (st.id === 'erklaeren') {
        explained = true; done_[st.id] = true; list.push({ label: st.label });
        log('you', st.say || st.label);
        if (C.rea && s.rea && !s.rea.rosc) say('(Keine Reaktion.)');
        else if (!awake && !C.child) say('(Keine verständliche Reaktion. Du handelst nach dem mutmaßlichen Willen.)', 'Patient');
        else if (C.child) say('Die Mutter nickt und hält ihre Tochter auf dem Schoß. Die Kleine weint leise.', 'Mutter');
        else {
          moodChange(1);
          if (C.nonverbal) say(s.mood >= 4 ? '(Sie nickt langsam.)' : '(Sie schüttelt den Kopf und zieht die Hand weg.)');
          else say(s.mood >= 6 ? '„Okay, machen Sie.“' : s.mood >= 4 ? '„Muss das sein…? Na gut.“' : '„Nein… ich will das nicht!“');
          if (s.mood >= 4) consent = s.flags.consent = true;
        }
        draw(); return;
      }
      if (st.invasive && awake && !C.child) {
        if (!explained && !s.flags['expl_' + a.id]) {
          s.flags['expl_' + a.id] = true;
          warnOnce('explain', 2, PROCS.EXPLAIN_WHY);
          moodChange(-2);
          const r = C.react[a.id + '.noexplain'] || (st.hurt ? '„Au! Was machen Sie denn da?! Sagen Sie doch vorher Bescheid!“' : '„Hey, was soll das? Was machen Sie?“');
          say(r);
        } else if (s.mood <= 2 && !consent) { return refusal(st); }
      }
      done_[st.id] = true; list.push({ label: st.label });
      const key = a.id + '.' + st.id;
      if (C.react[key + (explained ? '.explained' : '')]) say(C.react[key + (explained ? '.explained' : '')]);
      else if (C.react[key]) say(C.react[key]);
      else if (st.hurt && awake && explained && !C.child) say(C.nonverbal ? '(Sie zuckt kurz.)' : s.mood >= 5 ? '„Autsch. Geht schon.“' : '„Au!“');
      else if (st.hurt && C.child) say('Die Kleine weint kurz auf, die Mutter tröstet sie.', 'Mutter');
      if (st.final) return finishProc();
      draw();
    };
    const finishProc = () => {
      const skipped = P.steps.filter((x) => !x.wrong && !x.final && !done_[x.id] && !(x.id === 'erklaeren' && (!awake || C.rea)));
      if (skipped.length) warnOnce(a.id + 'skip', Math.min(3, skipped.length), `${P.title}: vergessen: ${skipped.map((x) => x.label).join(', ')}.`);
      else if (!list.some((x) => x.bad)) reward(2, 2, `${P.title}: sauber durchgeführt`);
      else addEvent(0, 2, `${P.title}: mit Fehlern`, null, 'none');
      box.innerHTML = '<button class="btn wide accent">Weiter</button>';
      box.querySelector('.btn').onclick = () => { closeModal(); done(); };
      doneEl.innerHTML = list.map((x, i) => `<div class="op ${x.bad ? 'bad' : ''}">${i + 1}. ${esc(x.label)}</div>`).join('');
    };
    draw();
  }

  function markDone(a) {
    s.count[a.id] = (s.count[a.id] || 0) + 1;
    s.lastAt[a.id] = s.time;
  }

  function val(x) { return typeof x === 'function' ? x(s) : x; }

  function doAssess(a) {
    markDone(a);
    if (a.letter && a.letter !== 'S') s.letters[a.letter] = true;
    const v = s.v;
    const extra = val((C.findings || {})[a.id]);
    let base = '';
    switch (a.id) {
      case 'sss': base = extra || DEFAULT_FIND.sss; break;
      case 'ansprechen': base = extra || 'Der Patient reagiert auf Ansprache.'; break;
      case 'b_af': base = `AF ${Math.round(v.af)}/min. ` + (extra || 'Atmung unauffällig.'); s.afShown = Math.round(v.af); break;
      case 'b_spo2':
        s.attached.spo2 = true; mon.showPleth = true; ensureRhythm();
        base = `SpO₂ ${Math.round(v.spo2)} %. ` + (extra || ''); break;
      case 'c_puls': base = `Puls ${Math.round(v.hr)}/min. ` + (extra || DEFAULT_FIND.c_puls); break;
      case 'c_rr':
        s.nibp = { sys: Math.round(v.sys), dia: Math.round(v.dia), t: s.time };
        base = `RR ${s.nibp.sys}/${s.nibp.dia} mmHg. ` + (extra || ''); break;
      case 'c_ekg':
        s.attached.ekg = true; ensureRhythm();
        base = 'EKG läuft. ' + (extra || '');
        break;
      case 'd_gcs': base = extra || `GCS ${v.gcs}.`; s.measured.gcs = v.gcs; break;
      case 'd_bz': {
        const bz = Math.round(v.bz); s.measured.bz = bz;
        base = `BZ ${bz} mg/dl (${(bz / 18).toFixed(1).replace('.', ',')} mmol/l). ` + (extra || ''); break;
      }
      case 'e_temp': {
        const t = v.temp.toFixed(1).replace('.', ','); s.measured.temp = t;
        base = `Temperatur ${t} °C. ` + (extra || ''); break;
      }
      default: base = extra || DEFAULT_FIND[a.id] || 'Unauffällig.';
    }
    log('find', `<span class="who">Befund</span>${esc(base.trim())}`, true);
    advance(a.time);
    if (a.id === 'c_ekg' && !s.flags.rhythmQuiz) {
      s.flags.rhythmQuiz = true;
      rhythmQuiz(currentRhythm(), { pulseKnown: true }, (ok, help) => {
        const pts = ok ? (help ? 1 : 3) : 0;
        reward(pts, 3, `Rhythmus richtig erkannt: ${RHYTHMS[currentRhythm()].name}`);
        if (!ok) log('info', `Richtig wäre gewesen: ${RHYTHMS[currentRhythm()].name}.`);
        render();
      });
    }
  }

  function doAsk(a) {
    const who = C.answerer ? C.answerer(s) : null;
    const name = who || C.name || 'Patient';
    const ptTalks = !who && conscious();
    if (a.id === 'q_hallo') {
      markDone(a);
      const first = s.count.q_hallo === 1;
      const text = C.rea && !(s.rea && s.rea.rosc) ? '(Keine Reaktion.)' : who ? `„Das ist ${C.name}.“` : (conscious() ? `„${C.name}.“` : '(Keine verständliche Antwort.)');
      log('pt', `<span class="who">${esc(name)}</span>${esc(text)}`, true);
      if (first) moodChange(1);
      advance(10); return;
    }
    if (a.id === 'q_erkl') {
      markDone(a);
      log('pt', `<span class="who">${esc(name)}</span>${esc(ptTalks ? (s.mood >= 4 ? '„Okay, danke, dass Sie mir das sagen.“' : '„Hm. Na gut.“') : who ? '„Danke, dass Sie uns das erklären.“' : '(Keine Reaktion.)')}`, true);
      moodChange(1);
      advance(10); return;
    }
    if (ptTalks && s.mood <= 1 && !C.child) {
      log('pt', `<span class="who">${esc(name)}</span>„Lassen Sie mich doch in Ruhe mit Ihren Fragen!“`, true);
      if (!s.warned.moodtip) { s.warned.moodtip = true; log('info', '💡 Der Patient blockt. Vorstellen, erklären oder beruhigen hilft.'); }
      advance(10); return;
    }
    markDone(a);
    const raw = a.followup ? C.followups[a.id].ans : (C.answers || {})[a.id];
    let ans = val(raw);
    let text;
    if (ans && typeof ans === 'object') text = who ? ans.by : ans.pt;
    else text = ans;
    if (!text) text = who ? '„Weiß ich nicht.“' : (s.v.gcs < 13 ? '(Keine verständliche Antwort.)' : '„Nein, nichts Besonderes.“');
    if (ptTalks && s.mood <= 3 && !a.followup && Math.random() < 0.5) text = '(zögert, genervt) ' + text;
    log('pt', `<span class="who">${esc(name)}</span>${esc(text)}`, true);
    Object.keys(C.followups || {}).forEach((fid) => {
      const f = C.followups[fid];
      if (f.after === a.id && !s.unlocked.includes(fid)) { s.unlocked.push(fid); log('info', `💬 Neue Nachfrage möglich: „${f.label}“`); }
    });
    advance(a.time);
  }

  function getEffect(id) {
    let e = (C.effects || {})[id];
    if (typeof e === 'function') e = e(s);
    if (!e && GENERIC_BAD[id]) e = GENERIC_BAD[id];
    return e || {};
  }

  function doTreat(a) {
    const e = getEffect(a.id);
    if (e.needs && !e.needs.some((id) => s.count[id])) {
      log('info', '🤔 ' + e.needText);
      advance(5);
      return;
    }
    const first = !s.count[a.id];
    if (!first && !['m_betreuung', 'm_zeit', 'm_trinken', 'm_gluc_oral'].includes(a.id) && !e.repeat) {
      log('info', 'Schon erledigt.');
      return;
    }
    if (!e.noCount) markDone(a);
    if (a.letter && a.letter !== 'S' && !e.noCount) s.letters[a.letter] = true;
    const text = e.text || DEFAULT_TREAT[a.id] || 'Erledigt.';
    if (!(e.pts < 0 && !e.text)) log('find', `<span class="who">Ergebnis</span>${esc(text)}`, true);
    if (e.pts < 0 && first) penalty(-e.pts, e.why || 'Falsche Maßnahme.');
    else if (e.pts < 0) log('info', e.why || '');
    if (e.set) Object.assign(s.v, e.set);
    if (e.delta) Object.keys(e.delta).forEach((k) => { s.v[k] += e.delta[k]; });
    const fixes = new Set(e.fix || []);
    if (!e.pts || e.pts >= 0) (C.problems || []).forEach((p) => { if ((p.fixedBy || []).includes(a.id) && isActive(p)) fixes.add(p.id); });
    fixes.forEach((pid) => { if (!s.fixed[pid]) s.fixed[pid] = true; });
    if (e.after) e.after(s);
    if (a.id === 'm_defi_kleben') { s.attached.ekg = true; ensureRhythm(); }
    if (a.id === 'm_nef') s.flags.nefAt = s.time;
    if (a.id === 'm_betreuung') moodChange(2);
    if (e.pts < 0 && first && conscious()) moodChange(-1);
    clampVitals();
    advance(a.time);
  }

  /* ---------------------------------------------------------------- Monitor */
  function currentRhythm() {
    if (C.rea && s.rea) return s.rea.monRhythm || 'asystolie';
    return s.v.rhythm;
  }
  function ensureRhythm() {
    const r = currentRhythm();
    if (!mon.rhythm || mon.rhythm.key !== r) mon.setRhythm(r, s.v.hr || undefined);
    else if (s.v.hr && Math.abs((mon.rhythm.rate || 0) - s.v.hr) > 2) mon.rhythm.rate = s.v.hr;
  }

  function renderTop() {
    const m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
    $('gClock').textContent = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    $('gScore').textContent = Math.round(s.events.reduce((t, e) => t + e.pts, 0));
  }

  function render() {
    renderTop();
    $('pStatus').textContent = s.status;
    renderMood();
    const v = s.v;
    const r = RHYTHMS[currentRhythm()];
    const pulse = r && r.pulse && (!C.rea || (s.rea && s.rea.rosc));
    if (s.attached.ekg || s.attached.spo2) ensureRhythm();
    if (!s.attached.ekg && s.attached.spo2 && mon.rhythm) {
      // nur Pulsoxymeter: keine EKG-Kurve zeigen
      mon.ecgHidden = true;
    }
    $('vHR').textContent = (s.attached.ekg || (s.attached.spo2 && pulse)) ? (pulse || s.attached.ekg ? (r && r.cont ? '---' : Math.round(pulse ? v.hr : (r.rate || 0))) : '--') : '--';
    $('vSpO2').textContent = s.attached.spo2 ? (pulse ? Math.round(v.spo2) : '--') : '--';
    $('vRR').textContent = s.nibp ? `${s.nibp.sys}/${s.nibp.dia}` : '--/--';
    $('vAF').textContent = s.afShown != null ? s.afShown : '--';
    const mini = [];
    if (s.measured.bz != null) mini.push(`BZ <b>${s.measured.bz}</b>`);
    if (s.measured.temp != null) mini.push(`T <b>${s.measured.temp} °C</b>`);
    if (s.measured.gcs != null) mini.push(`GCS <b>${s.measured.gcs}</b>`);
    if (C.rea && s.rea) {
      const R = s.rea;
      mini.push(`HDM <b>${R.hdm && !R.rosc ? 'läuft' : 'aus'}</b>`, `Schocks <b>${R.shocks}</b>`, `Blöcke <b>${R.blocks}</b>`, `Adrenalin <b>${R.adr.length} mg</b>`);
    }
    $('vMini').innerHTML = mini.join(' · ');
    if (mon) {
      mon.showPleth = s.attached.spo2;
      if (!s.attached.ekg && !s.attached.spo2) mon.setRhythm(null);
      mon.cpr = !!(C.rea && s.rea && s.rea.hdm && !s.rea.rosc && !s.rea.paused);
      mon.hideEcg = !s.attached.ekg;
    }
  }

  /* ---------------------------------------------------------------- Bottom Sheet */
  function openSheet(tab) {
    const titles = { assess: 'Untersuchen', ask: 'Fragen', treat: 'Maßnahmen', rea: 'Reanimation' };
    const lists = { assess: A.ASSESS, ask: A.ASK, treat: A.TREAT, rea: A.REA };
    $('sheetTitle').textContent = titles[tab];
    const body = $('sheetBody');
    body.innerHTML = '';
    let groups = lists[tab];
    if (tab === 'ask' && s.unlocked.length) groups = [{ group: 'Nachfragen', items: s.unlocked.map((id) => actionFor(id)) }].concat(groups);
    groups.forEach((grp) => {
      const g = document.createElement('div');
      g.className = 'grp'; g.textContent = grp.group; body.appendChild(g);
      const w = document.createElement('div'); w.className = 'acts';
      grp.items.forEach((it) => {
        const b = document.createElement('button');
        b.className = 'act' + (s.count[it.id] ? ' done' : '');
        b.innerHTML = esc(it.label) + (it.time ? `<small>${it.time >= 60 ? Math.round(it.time / 60) + ' min' : it.time + ' s'}</small>` : '');
        b.onclick = () => act(it.id);
        w.appendChild(b);
      });
      body.appendChild(w);
    });
    body.scrollTop = 0;
    $('sheet').classList.add('open');
    $('sheetBg').classList.add('open');
  }
  function closeSheet() {
    $('sheet').classList.remove('open');
    $('sheetBg').classList.remove('open');
  }

  /* ---------------------------------------------------------------- Modal & Quiz */
  function modal(html) {
    $('modal').innerHTML = html;
    $('modalBg').classList.add('open');
    return $('modal');
  }
  function closeModal() { $('modalBg').classList.remove('open'); $('modal').innerHTML = ''; }

  function runQuiz(q, done) {
    if (q.type === 'order') orderQuiz(q, done); else mcQuiz(q, done);
  }

  function mcQuiz(q, done) {
    const order = shuffle(q.options.map((t, i) => i));
    const m = modal(`<div class="kicker">Quiz</div><h3>${esc(q.q)}</h3><div class="options"></div><div class="res"></div>`);
    const box = m.querySelector('.options');
    order.forEach((i) => {
      const b = document.createElement('button');
      b.className = 'opt'; b.textContent = q.options[i];
      b.onclick = () => {
        const ok = i === q.answer;
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...box.children][order.indexOf(q.answer)].classList.add('right');
        reward(ok ? 5 : 0, 5, `Quiz: ${q.q}`);
        if (!ok) addEvent(0, 0, `Quiz falsch: ${q.q}`, q.options[q.answer], 'miss');
        m.querySelector('.res').innerHTML = (q.explain ? `<div class="explain">${esc(q.explain)}</div>` : '') + '<button class="btn wide accent">Weiter</button>';
        m.querySelector('.res .btn').onclick = () => { closeModal(); done && done(); };
      };
      box.appendChild(b);
    });
  }

  function orderQuiz(q, done) {
    const picked = [];
    const items = shuffle(q.items);
    const m = modal(`<div class="kicker">Quiz · Reihenfolge</div><h3>${esc(q.q)}</h3><p style="color:var(--muted);font-size:14px">Tippe die Schritte in der richtigen Reihenfolge an.</p><div class="order-picked"></div><div class="options"></div><div class="row"><button class="btn ghost" data-r>Zurücksetzen</button><button class="btn accent" data-c disabled>Prüfen</button></div>`);
    const pickedEl = m.querySelector('.order-picked');
    const opts = m.querySelector('.options');
    const draw = () => {
      pickedEl.innerHTML = picked.map((t, i) => `<div class="op"><span class="n">${i + 1}.</span><span>${esc(t)}</span></div>`).join('');
      opts.innerHTML = '';
      items.filter((t) => !picked.includes(t)).forEach((t) => {
        const b = document.createElement('button'); b.className = 'opt'; b.textContent = t;
        b.onclick = () => { picked.push(t); draw(); };
        opts.appendChild(b);
      });
      m.querySelector('[data-c]').disabled = picked.length !== items.length;
    };
    m.querySelector('[data-r]').onclick = () => { picked.length = 0; draw(); };
    m.querySelector('[data-c]').onclick = () => {
      let right = 0;
      pickedEl.innerHTML = picked.map((t, i) => {
        const ok = q.items[i] === t; if (ok) right++;
        return `<div class="op ${ok ? 'right' : 'wrong'}"><span class="n">${i + 1}.</span><span>${esc(t)}${ok ? '' : `<small>Richtig: ${esc(q.items[i])}</small>`}</span></div>`;
      }).join('');
      opts.innerHTML = '';
      const pts = Math.round((5 * right) / q.items.length);
      reward(pts, 5, `Reihenfolge-Quiz: ${right} von ${q.items.length} richtig`);
      if (right < q.items.length) addEvent(0, 0, `Reihenfolge: ${q.q}`, q.items.map((t, i) => `${i + 1}. ${t}`).join(' · '), 'miss');
      const row = m.querySelector('.row');
      row.innerHTML = '<button class="btn accent">Weiter</button>';
      row.querySelector('.btn').onclick = () => { closeModal(); done && done(); };
    };
    draw();
  }

  /* Rhythmus erkennen (mit Hilfeknopf und Puls prüfen) */
  let quizMon = null;
  function rhythmQuiz(key, opt, done) {
    opt = opt || {};
    const r = RHYTHMS[key];
    let choices;
    if (opt.rea) choices = ['vf', 'pvt', 'asystolie', 'pea', 'sinus'];
    else {
      const pool = ['sinus', 'sinustachy', 'sinusbrady', 'vhf', 'stemi', 'vt'].filter((k) => k !== key);
      choices = shuffle([key].concat(shuffle(pool).slice(0, 3)));
    }
    const labels = (k) => (opt.rea && k === 'sinus') ? 'Organisierter Rhythmus mit Puls (ROSC)' : RHYTHMS[k].name;
    const m = modal(`<div class="kicker">${opt.rea ? 'Rhythmusanalyse' : 'EKG'}</div><h3>Welcher Rhythmus ist das?</h3><canvas></canvas>
      <div class="pulsebox">${opt.pulseKnown ? 'Puls: tastbar' : ''}</div>
      <div class="row"><button class="btn small ghost" data-p ${opt.pulseKnown ? 'hidden' : ''}>🫳 Puls prüfen</button><button class="btn small ghost" data-h>💡 Hilfe</button></div>
      <div class="helpbox" hidden></div><div class="options"></div><div class="res"></div>`);
    const cv = m.querySelector('canvas');
    if (quizMon) quizMon.stop();
    quizMon = new Monitor(cv);
    requestAnimationFrame(() => { quizMon.resize(); quizMon.setRhythm(key, opt.rate); quizMon.start(); });
    let help = false, pulseChecked = !!opt.pulseKnown;
    const isOrganized = !r.cont && key !== 'pvt' && key !== 'vt';
    m.querySelector('[data-p]').onclick = () => {
      pulseChecked = true;
      m.querySelector('.pulsebox').textContent = r.pulse ? 'Puls (Carotis): tastbar ✓' : 'Puls (Carotis): NICHT tastbar ✗';
      if (opt.onPulse) opt.onPulse();
    };
    m.querySelector('[data-h]').onclick = () => {
      help = true;
      const hb = m.querySelector('.helpbox');
      hb.hidden = false;
      hb.innerHTML = choices.map((k) => `<div><b>${esc(labels(k))}:</b> ${esc(HELP[k])}</div>`).join('<div style="height:6px"></div>');
    };
    const box = m.querySelector('.options');
    choices.forEach((k) => {
      const b = document.createElement('button');
      b.className = 'opt'; b.textContent = labels(k);
      b.onclick = () => {
        const ok = k === key;
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...box.children][choices.indexOf(key)].classList.add('right');
        let note = '';
        if (opt.rea && isOrganized && !pulseChecked) note = 'Bei einem organisierten Rhythmus immer den Puls prüfen, um PEA und ROSC zu unterscheiden!';
        m.querySelector('.res').innerHTML = `<div class="explain">${esc(HELP[key])}${note ? '<br><b>' + esc(note) + '</b>' : ''}</div><button class="btn wide accent">Weiter</button>`;
        m.querySelector('.res .btn').onclick = () => { quizMon.stop(); closeModal(); done(ok, help, note); };
      };
      box.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------- Reanimation */
  const REA_PATHS = [
    ['vf', 'vf', 'vf', 'rosc'],
    ['pvt', 'vf', 'vf', 'rosc'],
    ['asystolie', 'asystolie', 'pea', 'rosc'],
    ['pea', 'pea', 'rosc'],
  ];
  function initRea() {
    const path = REA_PATHS[Math.floor(Math.random() * REA_PATHS.length)];
    s.rea = { bak: false, hdm: false, defi: false, analyses: 0, shocks: 0, blocks: 0, sinceAnalysis: 0, ivz: false, adr: [], airway: false, lt: false,
      path, pi: 0, rosc: false, nefBlock: null, monRhythm: path[0], hadNonShock: false, absaug: false, hdmBeforeDefi: null, missAirway: false };
  }
  function reaRhythm() {
    const R = s.rea;
    let k = R.path[R.pi];
    if (k === 'rosc') {
      const shockPath = R.path.some((x) => x === 'vf' || x === 'pvt');
      const ok = R.adr.length > 0 && (!shockPath || R.shocks >= 3);
      if (!ok) k = R.path[R.pi - 1];
    }
    return k === 'rosc' ? 'sinus' : k;
  }

  function reaAction(a) {
    const R = s.rea;
    const id = a.id;
    // Untersuchungen während der Rea
    if (a.kind === 'assess' && !R.rosc) {
      if (id === 'sss' || id === 'ansprechen') return false;
      if (id === 'bak') {
        markDone(a); R.bak = true;
        log('find', '<span class="who">Befund</span>Keine Reaktion auf Ansprache und Schmerzreiz. Atmung (10 s): nur vereinzelte Schnappatmung, keine normale Atmung. Puls an der Carotis (5 s): nicht tastbar. → Kreislaufstillstand!', true);
        advance(a.time);
        return true;
      }
      if (id === 'c_ekg') { return reaAction(A.byId.r_defi); }
      markDone(a);
      if (!s.warned['reaassess']) { s.warned.reaassess = true; penalty(2, 'Während der Reanimation hat diese Untersuchung keine Priorität. Drücken, schocken, beatmen!'); }
      else log('info', 'Keine Zeit dafür, der Patient ist im Kreislaufstillstand.');
      advance(5);
      return true;
    }
    if (a.kind === 'treat' && !R.rosc) {
      if (id === 'm_nef') { markDone(a); if (R.nefBlock == null) R.nefBlock = R.blocks; s.flags.nefAt = s.time; log('find', '<span class="who">Ergebnis</span>NEF ist nachalarmiert.', true); advance(a.time); return true; }
      if (id === 'm_defi_kleben') return reaAction(A.byId.r_defi);
      if (id === 'm_absaug') return reaAction(A.byId.r_absaug);
      if (id === 'm_bmv') return reaAction(A.byId.r_bmv);
      if (id === 'm_ivz') return reaAction(A.byId.r_ivz);
      if (['m_betreuung', 'm_zeit'].includes(id)) { markDone(a); log('find', '<span class="who">Ergebnis</span>' + esc(DEFAULT_TREAT[id]), true); advance(a.time); return true; }
      markDone(a);
      if (!s.warned['reatreat_' + id]) { s.warned['reatreat_' + id] = true; penalty(3, `„${a.label}“ passt nicht zur Reanimation.`); }
      return true;
    }
    if (a.kind === 'ask' && !R.rosc) return false;
    if (a.kind !== 'rea') return false; // nach ROSC normale Logik

    markDone(a);
    const note = (t) => log('find', '<span class="who">Ergebnis</span>' + t, true);
    switch (id) {
      case 'r_hdm':
        if (R.rosc) { penalty(10, 'Der Patient hat einen Puls (ROSC)! Keine Herzdruckmassage mehr.'); return true; }
        if (!R.bak && !s.warned.hdmbak) { s.warned.hdmbak = true; penalty(3, 'Vor der Herzdruckmassage BAK prüfen: Bewusstsein, Atmung (10 s), Puls (5 s).'); }
        if (R.hdm) { log('info', 'Die Druckmassage läuft bereits.'); return true; }
        R.hdm = true; R.paused = false;
        if (R.hdmBeforeDefi == null) R.hdmBeforeDefi = !R.defi;
        note('„Reanimation, Druckmassage Start!“ Dein Kollege drückt: Mitte Brustbein, 100–120/min, 5–6 cm, vollständig entlasten.');
        s.status = 'Reanimation läuft. Der Brustkorb wird rhythmisch komprimiert.';
        advance(a.time);
        return true;
      case 'r_defi':
        if (R.defi) { log('info', 'Elektroden kleben bereits.'); return true; }
        R.defi = true; s.attached.ekg = true; R.monRhythm = reaRhythm(); s.v.rhythm = R.monRhythm;
        if (R.hdmBeforeDefi == null) R.hdmBeforeDefi = false;
        if (!R.hdm && !s.warned.defihdm) { s.warned.defihdm = true; penalty(2, 'Erst die Druckmassage starten, dann parallel kleben. Jede Sekunde ohne HDM zählt.'); }
        note('Elektroden unter dem rechten Schlüsselbein und links seitlich an der Herzspitze. Der Monitor zeigt einen Rhythmus (durch die HDM verwackelt).');
        ensureRhythm();
        advance(a.time);
        return true;
      case 'r_analyse':
        if (!R.defi) { log('info', 'Erst die Defi-Elektroden kleben.'); s.count[id]--; return true; }
        if (R.rosc) { log('info', 'ROSC: Jetzt ABCDE, 12-Kanal-EKG.'); return true; }
        if (R.analyses > 0 && R.sinceAnalysis === 0) {
          if (!s.warned.analyse) { s.warned.analyse = true; penalty(2, 'Nächste Analyse erst nach einem 2-Minuten-Block. Unnötige Pausen kosten Durchblutung.'); }
          else log('info', 'Erst den 2-Minuten-Block durchführen.');
          return true;
        }
        doAnalysis();
        return true;
      case 'r_puls': {
        const k = R.monRhythm;
        const p = R.rosc || (R.path[R.pi] === 'rosc' && reaRhythm() === 'sinus');
        note(p ? 'Puls an der Carotis tastbar!' : 'Kein Puls tastbar.');
        if (!R.defi || RHYTHMS[k].cont) { if (!s.warned.puls) { s.warned.puls = true; penalty(1, 'Pulskontrolle nur bei organisiertem Rhythmus in der Analyse. Sonst nicht unterbrechen.'); } }
        advance(a.time);
        return true;
      }
      case 'r_block': {
        if (!R.hdm) { log('info', 'Starte zuerst die Herzdruckmassage.'); s.count[id]--; return true; }
        if (R.rosc) { penalty(10, 'Der Patient hat einen Puls (ROSC)!'); return true; }
        if (R.analyses === 0 && R.defi && !s.warned.frueh) { s.warned.frueh = true; penalty(3, 'Nach dem Kleben direkt die Frühanalyse machen, nicht erst 2 Minuten drücken.'); }
        R.blocks++; R.sinceAnalysis++;
        note(`Block ${R.blocks}: 5 Zyklen 30:2. Der Drücker zählt laut, die letzten 5 laut runter.`);
        advance(a.time);
        if (!R.airway && !R.missAirway && R.blocks >= 1) { R.missAirway = true; penalty(5, 'Keine Beatmung in diesem Block. Durchfallkriterium: keine Beatmung über 2 Zyklen. Beutel-Maske oder Larynxtubus!'); }
        if (R.blocks >= 2 && R.nefBlock == null && !s.warned.nef) { s.warned.nef = true; penalty(10, 'Durchfallkriterium: Das NEF muss spätestens bis Ende des 2. Blocks nachalarmiert sein.'); }
        const cur = R.monRhythm;
        const nonShock = cur === 'asystolie' || cur === 'pea';
        if (nonShock && R.ivz && R.adr.length === 0 && !s.warned.adrfrueh) { s.warned.adrfrueh = true; penalty(3, 'Nicht schockbarer Rhythmus: Adrenalin so früh wie möglich, sobald der Zugang liegt.'); }
        if (R.adr.length > 0 && R.blocks - R.adr[R.adr.length - 1] >= 3 && !s.warned['adrrep' + R.adr.length]) { s.warned['adrrep' + R.adr.length] = true; penalty(2, 'Adrenalin alle 4 Minuten (= alle 2 Blöcke) wiederholen (Schulmeinung).'); }
        log('info', 'Block beendet: Zeit für Rhythmusanalyse und Helferwechsel.');
        return true;
      }
      case 'r_bmv':
        if (R.airway) { log('info', 'Die Beatmung läuft bereits.'); return true; }
        R.airway = true; note('Beutel-Masken-Beatmung mit O₂ (Reservoir, 15 l/min), 2 Hübe nach 30 Kompressionen, je 1 s.');
        advance(a.time); return true;
      case 'r_lt':
        if (R.lt) { log('info', 'Der Larynxtubus liegt bereits.'); return true; }
        R.airway = true; R.lt = true; note('Larynxtubus liegt, Lagekontrolle mit Kapnografie (etCO₂). Weiter 30:2.');
        advance(a.time); return true;
      case 'r_ivz':
        if (R.ivz) { log('info', 'Der Zugang liegt bereits.'); return true; }
        R.ivz = true; note('i.v.-Zugang liegt, VEL läuft zum Nachspülen.');
        advance(a.time); return true;
      case 'r_absaug':
        R.absaug = true; note('„Absaugbereitschaft ist hergestellt.“');
        advance(a.time); return true;
      case 'r_adr': {
        if (!R.ivz) { log('info', 'Kein Zugang! Erst i.v.-Zugang legen.'); s.count[id]--; return true; }
        if (R.rosc) { penalty(5, 'Nach ROSC kein Reanimations-Adrenalin.'); return true; }
        const cur = R.monRhythm;
        const shockable = cur === 'vf' || cur === 'pvt';
        if (shockable && R.shocks < 3) penalty(5, 'Bei VF/pVT Adrenalin erst nach dem 3. erfolglosen Schock (Schulmeinung).');
        else if (R.adr.length && R.blocks - R.adr[R.adr.length - 1] < 2) penalty(3, 'Zu früh wiederholt: Adrenalin alle 4 Minuten (alle 2 Blöcke).');
        R.adr.push(R.blocks);
        note('Double-Check im 4-Augen-Prinzip: 1 mg Adrenalin (1 ml) + 9 ml NaCl. Gegeben, Arm hoch, mit Infusion nachgespült.');
        advance(a.time); return true;
      }
    }
    return false;
  }

  function doAnalysis() {
    const R = s.rea;
    R.paused = true; render();
    const k = reaRhythm();
    R.monRhythm = k; s.v.rhythm = k;
    ensureRhythm();
    advance(8);
    const isRosc = R.path[R.pi] === 'rosc' && k === 'sinus';
    rhythmQuiz(k, { rea: true, rate: k === 'sinus' ? 96 : (k === 'pea' ? 44 : undefined) }, (ok, help) => {
      const pts = ok ? (help ? 1 : 3) : 0;
      reward(pts, 3, `Rhythmus erkannt: ${RHYTHMS[k].name}`);
      if (!ok) addEvent(0, 0, `Rhythmus nicht erkannt (${RHYTHMS[k].name})`, HELP[k], 'miss');
      decision(k, isRosc);
    });
  }

  function decision(k, isRosc) {
    const R = s.rea;
    const shockable = k === 'vf' || k === 'pvt';
    const m = modal(`<div class="kicker">Entscheidung</div><h3>Was machst du jetzt?</h3><div class="options">
      <button class="opt" data-d="shock">⚡ Laden, „Alle weg!“, Schock abgeben</button>
      <button class="opt" data-d="noshock">✋ Kein Schock, sofort weiter HDM</button>
      <button class="opt" data-d="rosc">💚 Puls tastbar: ROSC, HDM stoppen</button></div><div class="res"></div>`);
    m.querySelectorAll('[data-d]').forEach((b) => {
      b.onclick = () => {
        m.querySelectorAll('[data-d]').forEach((x) => { x.disabled = true; });
        const d = b.dataset.d;
        let ok = false, msg = '';
        if (isRosc) {
          ok = d === 'rosc';
          msg = ok ? 'ROSC! Der eigene Kreislauf ist zurück.' : (d === 'shock' ? 'Durchfallkriterium: Ein Patient mit Puls wird nicht geschockt!' : 'Der Patient hat einen Puls: HDM stoppen, ROSC-Versorgung.');
        } else if (shockable) {
          ok = d === 'shock';
          msg = ok ? 'Richtig: VF/pVT ist schockbar. Laden während HDM, „Achtung Defibrillation, alle weg!“, Schock, sofort weiter drücken.' : 'Durchfallkriterium: VF/pVT nicht geschockt!';
        } else {
          ok = d === 'noshock';
          msg = ok ? 'Richtig: Asystolie/PEA ist nicht schockbar. Sofort weiter drücken, Adrenalin so früh wie möglich, reversible Ursachen (4 H / HITS) suchen.' : (d === 'shock' ? 'Durchfallkriterium: Asystolie/PEA geschockt!' : 'Kein Puls: Das ist eine PEA, kein ROSC! Weiter drücken.');
        }
        b.classList.add(ok ? 'right' : 'wrong');
        if (ok) reward(5, 5, 'Richtige Entscheidung nach der Analyse'); else { addEvent(0, 5, 'Falsche Entscheidung nach der Analyse'); penalty(10, msg); }
        // Verlauf
        R.analyses++; R.sinceAnalysis = 0;
        if (d === 'shock') R.shocks++;
        if (!shockable && !isRosc) R.hadNonShock = true;
        if (isRosc && ok) {
          R.rosc = true; R.hdm = false; R.paused = false;
          s.v = Object.assign(s.v, { hr: 96, rhythm: 'stemi', spo2: 91, sys: 102, dia: 64, af: 12, gcs: 3 });
          R.monRhythm = 'stemi';
          s.status = 'ROSC! Der Patient hat einen tastbaren Puls, ist aber bewusstlos und atmet flach. Er liegt auf dem Rücken.';
          s.attached.spo2 = true;
          log('good', '💚 ROSC! Jetzt: Rückenlage, Absaugbereitschaft, ABCDE, 12-Kanal-EKG, SpO₂ 94–98 %.');
        } else if (!isRosc) {
          const correct = (shockable && d === 'shock') || !shockable;
          if (correct && R.pi < R.path.length - 1) {
            const next = R.path[R.pi + 1];
            if (next !== 'rosc') R.pi++;
            else R.pi++; // reaRhythm() hält bei ROSC-Bedingungen ggf. den alten Rhythmus
          }
          R.paused = false;
          R.monRhythm = reaRhythm();
          s.v.rhythm = R.monRhythm;
        }
        m.querySelector('.res').innerHTML = `<div class="explain">${esc(msg)}</div><button class="btn wide accent">Weiter</button>`;
        m.querySelector('.res .btn').onclick = () => { closeModal(); render(); };
        render();
      };
    });
  }

  function reaRequired() {
    const R = s.rea;
    return [
      { ok: R.bak, pts: 5, label: 'BAK geprüft (Atmung 10 s, Puls 5 s)', why: 'Kein Bewusstsein + keine normale Atmung = Reanimation.' },
      { ok: R.hdm || R.rosc, pts: 10, label: 'Herzdruckmassage gestartet', why: 'Ohne HDM keine Durchblutung von Herz und Gehirn.' },
      { ok: R.hdmBeforeDefi === true, pts: 5, label: 'Erst drücken, dann kleben', why: 'Die HDM läuft, während der Kollege die Elektroden klebt.' },
      { ok: R.defi, pts: 5, label: 'Defi-Elektroden geklebt', why: 'Frühanalyse so schnell wie möglich.' },
      { ok: R.nefBlock != null && R.nefBlock < 2, pts: 10, label: 'NEF rechtzeitig nachalarmiert', why: 'Durchfallkriterium: spätestens bis Ende des 2. Blocks.' },
      { ok: R.airway, pts: 5, label: 'Beatmung (Beutel-Maske / Larynxtubus)', why: '30:2, Oxygenierung ist bei der Rea entscheidend.' },
      { ok: R.ivz, pts: 5, label: 'i.v.-Zugang', why: 'Für Adrenalin (RettSan darf das bei der Rea).' },
      { ok: R.adr.length > 0, pts: 10, label: 'Adrenalin 1 mg zum richtigen Zeitpunkt', why: 'Nicht schockbar: sofort; schockbar: nach dem 3. Schock; dann alle 4 min.' },
      { ok: R.rosc, pts: 10, label: 'ROSC erreicht und erkannt', why: 'Puls prüfen bei organisiertem Rhythmus.' },
      { ok: R.rosc && !!s.count.c_12, pts: 5, label: 'Nach ROSC 12-Kanal-EKG', why: 'Herzinfarkt als Ursache? Zielklinik mit Herzkatheter.' },
      { ok: R.absaug || !!s.count.m_absaug, pts: 5, label: 'Absaugbereitschaft', why: 'Erbrechen und Aspiration während und nach der Rea.' },
    ];
  }

  /* ---------------------------------------------------------------- Abschluss */
  function finish() {
    if (s.over) return;
    closeSheet();
    const q = C.quizzes || [];
    const idx = q.findIndex((x, i) => x.on === 'finish' && !s.quizDone[i]);
    if (idx >= 0) { s.quizDone[idx] = true; return runQuiz(q[idx], finish); }
    const d = C.diagnosis;
    const order = shuffle(d.options.map((t, i) => i));
    const m = modal(`<div class="kicker">Übergabe</div><h3>Deine Verdachtsdiagnose?</h3><div class="options"></div><div class="res"></div>`);
    const box = m.querySelector('.options');
    order.forEach((i) => {
      const b = document.createElement('button');
      b.className = 'opt'; b.textContent = d.options[i];
      b.onclick = () => {
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        const ok = i === d.answer;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...box.children][order.indexOf(d.answer)].classList.add('right');
        addEvent(ok ? 10 : 0, 10, ok ? `Diagnose richtig: ${d.options[d.answer]}` : `Diagnose falsch (richtig: ${d.options[d.answer]})`, null, ok ? 'good' : 'miss');
        const g = d.guard && d.guard(s);
        if (g) addEvent(g.pts, 0, g.why, null, 'bad');
        m.querySelector('.res').innerHTML = '<button class="btn wide accent">Zur Auswertung</button>';
        m.querySelector('.res .btn').onclick = () => { closeModal(); debrief(); };
      };
      box.appendChild(b);
    });
  }

  function debrief() {
    s.over = true;
    mon && mon.stop();
    $('toasts').innerHTML = '';
    let req;
    if (C.rea) req = reaRequired();
    else {
      req = (C.required || []).map((r) => {
        let ok = false;
        if (r.any) ok = r.any.some((id) => s.count[id]);
        if (r.all) ok = r.all.every((id) => s.count[id]);
        if (r.check) ok = !!r.check(s);
        return Object.assign({ ok }, r);
      });
    }
    if (!C.rea) req.push({ ok: !!s.count.q_hallo && (s.lastAt.q_hallo || 0) < 300, pts: 3, label: 'Vorgestellt und nach dem Namen gefragt', why: 'Gehört an den Anfang: schafft Vertrauen, und der Name hilft bei jeder weiteren Ansprache.' });
    const reqPts = req.reduce((t, r) => t + (r.ok ? r.pts : 0), 0);
    const reqMax = req.reduce((t, r) => t + r.pts, 0);
    const evPts = s.events.reduce((t, e) => t + e.pts, 0);
    const evMax = s.events.reduce((t, e) => t + (e.max || 0), 0);
    const score = Math.max(0, reqPts + evPts);
    const max = reqMax + evMax;
    const pct = max ? Math.round((100 * score) / max) : 0;
    const grade = pct >= 85 ? ['Sehr gut', 'var(--good)'] : pct >= 70 ? ['Gut', 'var(--good)'] : pct >= 50 ? ['Bestanden, mit Lücken', 'var(--warn)'] : ['Nochmal üben', 'var(--bad)'];
    const mm = Math.floor(s.time / 60);
    const bad = s.events.filter((e) => e.type === 'bad');
    const miss = s.events.filter((e) => e.type === 'miss');
    const good = s.events.filter((e) => e.type === 'good' && e.pts > 0);
    let h = `<div class="score"><div class="big" style="color:${grade[1]}">${pct} %</div><div class="grade">${grade[0]}</div><small>${score} von ${max} Punkten · Einsatzzeit ${mm} min${C.rea || C.child ? '' : ' · Stimmung am Ende ' + MOOD_FACE(s.mood)}</small></div>`;
    h += `<div class="ditem"><b>${esc((C.person || C.icon) + ' ' + s.dispatch.short)}</b><small>Lösung: ${esc(C.diagnosis.options[C.diagnosis.answer])}${C.rea ? ' · Rhythmusverlauf: ' + esc(s.rea.path.map((k) => k === 'rosc' ? 'ROSC' : RHYTHMS[k].name.split(' (')[0]).join(' → ')) : ''}</small></div>`;
    h += '<h4>Erledigt</h4>' + (req.filter((r) => r.ok).map((r) => `<div class="ditem good"><span class="p">+${r.pts}</span>✓ ${esc(r.label)}<small>${esc(r.why)}</small></div>`).join('') || '<div class="ditem">Nichts davon.</div>');
    const missed = req.filter((r) => !r.ok);
    if (missed.length) h += '<h4>Vergessen</h4>' + missed.map((r) => `<div class="ditem miss"><span class="p">${r.pts}</span>✗ ${esc(r.label)}<small>${esc(r.why)}</small></div>`).join('');
    if (bad.length) h += '<h4>Fehler und Reihenfolge</h4>' + bad.map((e) => `<div class="ditem bad"><span class="p">${e.pts}</span>${esc(e.text)}</div>`).join('');
    if (good.length || miss.length) h += '<h4>Quiz und Erkennen</h4>' + good.map((e) => `<div class="ditem good"><span class="p">+${e.pts}</span>${esc(e.text)}</div>`).join('') + miss.map((e) => `<div class="ditem miss">${esc(e.text)}${e.why ? `<small>${esc(e.why)}</small>` : ''}</div>`).join('');
    h += '<h4>Merke</h4><div class="ditem"><ul class="teach">' + C.teach.map((t) => `<li>${esc(t)}</li>`).join('') + '</ul></div>';
    h += '<div class="row" style="margin-top:14px"><button class="btn accent" id="dAgain">Nochmal</button><button class="btn ghost" id="dHome">Andere Einsätze</button></div><p class="foot">Inhalte nach NAW-Schulmeinung. Im Zweifel gilt dein Unterricht.</p>';
    h += '<div id="saveStatus" class="save-status"></div>';
    $('debriefBody').innerHTML = h;
    show('debrief');
    window.dispatchEvent(new CustomEvent('rettsan:case', { detail: {
      fall: C.id, meldung: s.dispatch.short, prozent: pct, punkte: score, max_punkte: max, dauer_s: Math.round(s.time),
      diagnose_richtig: s.events.some((e) => e.text && e.text.startsWith('Diagnose richtig')), detail: settings.detail,
      fehler: bad.map((e) => e.text), vergessen: missed.map((r) => r.label),
    } }));
    $('dAgain').onclick = () => startCase(C);
    $('dHome').onclick = () => show('home');
  }

  /* ---------------------------------------------------------------- EKG-Trainer */
  const TR = { mon: null, key: null, right: 0, total: 0, help: false, last: null };
  function startTrainer() {
    show('trainer');
    if (!TR.mon) TR.mon = new Monitor($('ecgTr'));
    TR.mon.showPleth = true;
    requestAnimationFrame(() => { TR.mon.resize(); nextRhythm(); TR.mon.start(); });
  }
  function nextRhythm() {
    const keys = Object.keys(RHYTHMS);
    // die vier Rea-Rhythmen etwas häufiger
    const pool = keys.concat(['vf', 'pvt', 'asystolie', 'pea']);
    let k; do { k = pool[Math.floor(Math.random() * pool.length)]; } while (k === TR.last);
    TR.key = k; TR.last = k; TR.help = false; TR.pulse = false;
    TR.mon.setRhythm(k);
    $('trPulse').textContent = '';
    $('trHelp').hidden = true;
    $('trFeedback').innerHTML = '';
    $('trNext').hidden = true;
    const others = shuffle(keys.filter((x) => x !== k)).slice(0, 4);
    const opts = shuffle([k].concat(others));
    const box = $('trOptions');
    box.innerHTML = '';
    opts.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'opt'; b.textContent = RHYTHMS[o].name;
      b.onclick = () => {
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        const ok = o === k;
        TR.total++; if (ok) TR.right++;
        window.dispatchEvent(new CustomEvent('rettsan:ekg', { detail: { rhythmus: k, modus: 'basis', richtig: ok, punkte: ok ? 1 : 0, max_punkte: 1 } }));
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...box.children][opts.indexOf(k)].classList.add('right');
        const shock = (k === 'vf' || k === 'pvt') ? 'Schockbar.' : (k === 'asystolie' || k === 'pea') ? 'Nicht schockbar.' : '';
        $('trFeedback').innerHTML = `<div class="explain"><b>${esc(RHYTHMS[k].name)}</b> ${esc(shock)}<br>${esc(HELP[k])}</div>`;
        $('trStats').textContent = `${TR.right} / ${TR.total} richtig`;
        $('trNext').hidden = false;
      };
      box.appendChild(b);
    });
  }
  function initTrainer() {
    $('trNext').onclick = nextRhythm;
    $('btnTrainerBack').onclick = () => { TR.mon && TR.mon.stop(); show('home'); };
    $('trPulseBtn').onclick = () => { $('trPulse').textContent = RHYTHMS[TR.key].pulse ? 'Puls tastbar ✓' : 'Kein Puls ✗'; };
    $('trHelpBtn').onclick = () => {
      $('trHelp').hidden = false;
      $('trHelp').innerHTML = '<b>Worauf achten?</b><br>Regelmäßig oder unregelmäßig? Schmal oder breit? P-Wellen? Frequenz? Überhaupt Komplexe? Und bei geordnetem Rhythmus: Puls?<br><br>' +
        [...$('trOptions').children].map((b) => {
          const k = Object.keys(RHYTHMS).find((x) => RHYTHMS[x].name === b.textContent);
          return `<div style="margin:4px 0"><b>${esc(b.textContent)}:</b> ${esc(HELP[k])}</div>`;
        }).join('');
    };
  }

  /* ---------------------------------------------------------------- Verkabelung */
  function initGameUi() {
    document.querySelectorAll('#tabs button').forEach((b) => { b.onclick = () => openSheet(b.dataset.tab); });
    $('sheetClose').onclick = closeSheet;
    $('sheetBg').onclick = closeSheet;
    $('btnFinish').onclick = () => {
      const m = modal('<div class="kicker">Übergabe</div><h3>Einsatz beenden?</h3><p>Du übergibst den Patienten und bekommst die Auswertung.</p><div class="row"><button class="btn ghost" data-n>Weiter arbeiten</button><button class="btn accent" data-y>Übergeben</button></div>');
      m.querySelector('[data-n]').onclick = closeModal;
      m.querySelector('[data-y]').onclick = () => { closeModal(); finish(); };
    };
    $('btnQuit').onclick = () => {
      const m = modal('<h3>Einsatz abbrechen?</h3><p>Der Fortschritt geht verloren.</p><div class="row"><button class="btn ghost" data-n>Nein</button><button class="btn accent" data-y>Abbrechen</button></div>');
      m.querySelector('[data-n]').onclick = closeModal;
      m.querySelector('[data-y]').onclick = () => { closeModal(); mon && mon.stop(); show('home'); };
    };
  }

  // Monitor: EKG-Kurve ausblenden, wenn nur das Pulsoxymeter hängt
  const origEcg = Monitor.prototype.ecgValue;
  Monitor.prototype.ecgValue = function (t) { return this.hideEcg ? 0 : origEcg.call(this, t); };

  initHome();
  initGameUi();
  initTrainer();
  window.__game = { get state() { return s; }, get caseData() { return C; }, act, finish, startCase: (id) => startCase(CASES.find((c) => c.id === id)), show };
})();
