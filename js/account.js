/* Konto und Fortschritt (optional). Einziges Modul, das das Backend kennt.
   Backend: Supabase (Auth + REST, ohne SDK). Ohne Anmeldung bleibt das Spiel voll spielbar. */
(function () {
  'use strict';

  // Supabase-Projekt (URL und anon/publishable key sind öffentlich gedacht; Schutz über Row Level Security)
  const SB_URL = 'https://wvmeekunlpxrwjtxwiao.supabase.co';
  const SB_KEY = 'sb_publishable_6ra7hihbfRoXI2k7zBwj-A_tuLdtgiB';
  const ENABLED = !!(SB_URL && SB_KEY);
  const COL_CASE = 'rettsan_einsaetze';
  const COL_EKG = 'rettsan_ekg';
  const LS_RT = 'rs_refresh';
  const LS_QUEUE = 'rs_queue';
  const LS_MAIL = 'rs_mail';

  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* privat */ } },
  };

  const A = { access: null, expires: 0, user: null, refreshing: null };

  /* ------------------------------------------------------------ Auth */
  async function raw(path, opts, token) {
    const o = Object.assign({}, opts);
    o.headers = Object.assign({ 'Content-Type': 'application/json', apikey: SB_KEY }, token ? { Authorization: 'Bearer ' + token } : {}, o.headers || {});
    const r = await fetch(SB_URL + path, o);
    let body = null;
    try { const t = await r.text(); body = t ? JSON.parse(t) : null; } catch (e) { /* leer */ }
    if (!r.ok) {
      const msg = body && (body.msg || body.message || body.error_description || body.error) || 'HTTP ' + r.status;
      const err = new Error(msg); err.status = r.status; err.code = body && (body.error_code || body.code); throw err;
    }
    return body;
  }

  function takeTokens(d) {
    A.access = d.access_token;
    A.expires = Date.now() + (d.expires_in || 3600) * 1000 - 60000;
    if (d.user) A.user = d.user;
    ls.set(LS_RT, d.refresh_token);
  }

  async function refresh() {
    const rt = ls.get(LS_RT);
    if (!rt) return false;
    if (!A.refreshing) {
      A.refreshing = raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: rt }) })
        .then((b) => { takeTokens(b); return true; })
        .catch((e) => { if (e.status >= 400 && e.status < 500) { ls.set(LS_RT, null); A.user = null; } return false; })
        .finally(() => { A.refreshing = null; });
    }
    return A.refreshing;
  }

  async function api(path, opts, retried) {
    if (!A.access || Date.now() > A.expires) { if (!(await refresh())) { const e = new Error('Nicht angemeldet'); e.status = 401; throw e; } }
    try {
      return await raw(path, opts, A.access);
    } catch (e) {
      if (e.status === 401 && !retried) { A.access = null; return api(path, opts, true); }
      throw e;
    }
  }

  async function login(email, password) {
    const b = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
    takeTokens(b);
    ls.set(LS_MAIL, email);
    renderHome();
    flush();
  }

  // true = direkt angemeldet, false = E-Mail-Bestätigung nötig
  async function register(email, password) {
    const b = await raw('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (b && b.access_token) { takeTokens(b); ls.set(LS_MAIL, email); renderHome(); return true; }
    return false;
  }

  async function logout() {
    if (A.access) raw('/auth/v1/logout', { method: 'POST' }, A.access).catch(() => {});
    ls.set(LS_RT, null); ls.set(LS_QUEUE, null);
    A.access = null; A.user = null;
    renderHome();
  }

  async function loadUser() {
    try {
      A.user = await api('/auth/v1/user');
    } catch (e) { if (e.status === 401) A.user = null; }
    renderHome();
  }

  /* ------------------------------------------------------------ Speichern */
  function queue() { try { return JSON.parse(ls.get(LS_QUEUE) || '[]'); } catch (e) { return []; } }
  function setQueue(q) { ls.set(LS_QUEUE, q.length ? JSON.stringify(q.slice(-200)) : null); }

  function insert(col, data) {
    return api('/rest/v1/' + col, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(data) });
  }

  async function save(col, data) {
    if (!ENABLED || !ls.get(LS_RT)) return 'off';
    try {
      await insert(col, data);
      return 'ok';
    } catch (e) {
      if (e.status === 401 && !ls.get(LS_RT)) return 'off';
      const q = queue(); q.push({ col, data }); setQueue(q);
      return 'queued';
    }
  }

  async function flush() {
    const q = queue();
    if (!q.length || !ls.get(LS_RT)) return;
    const rest = [];
    for (const it of q) {
      try { await insert(it.col, it.data); } catch (e) { rest.push(it); }
    }
    setQueue(rest);
  }

  window.addEventListener('rettsan:case', async (ev) => {
    const el = $('saveStatus');
    const st = await save(COL_CASE, ev.detail);
    if (!el) return;
    if (st === 'ok') el.innerHTML = '✓ Im Fortschritt gespeichert';
    else if (st === 'queued') el.innerHTML = '⏳ Offline: wird später gespeichert';
    else el.innerHTML = '<button class="btn small ghost" data-login>Anmelden, um Ergebnisse zu speichern</button>';
    const b = el.querySelector('[data-login]');
    if (b) b.onclick = () => openLogin();
  });
  window.addEventListener('rettsan:ekg', (ev) => { save(COL_EKG, ev.detail); });
  window.addEventListener('online', flush);

  /* ------------------------------------------------------------ Oberfläche */
  function screen(id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
    window.scrollTo(0, 0);
  }
  function home() { if (window.__game && window.__game.show) window.__game.show('home'); else screen('home'); }

  function buildDom() {
    const card = document.createElement('div');
    card.className = 'card account'; card.id = 'accCard';
    const settings = document.querySelector('#home .settings');
    settings.parentNode.insertBefore(card, settings.nextSibling);

    const loginEl = document.createElement('section');
    loginEl.className = 'screen'; loginEl.id = 'login';
    loginEl.innerHTML = `
      <div class="topbar"><button class="icon-btn" id="loBack" aria-label="Zurück">←</button><div class="tb-mid"><div class="tb-title">Anmelden</div></div></div>
      <form class="card acc-form" id="loForm" autocomplete="on">
        <p class="muted">Freiwillig. Mit Konto werden deine Einsätze und EKG-Ergebnisse gespeichert und du siehst deine Schwachstellen.</p>
        <label>E-Mail<input type="email" id="loMail" autocomplete="username" required></label>
        <label>Passwort<input type="password" id="loPw" autocomplete="current-password" required minlength="8"></label>
        <div class="row"><button class="btn accent" type="submit" id="loGo">Anmelden</button><button class="btn ghost" type="button" id="loReg">Konto anlegen</button></div>
        <div id="loMsg" class="acc-msg"></div>
      </form>`;
    const prog = document.createElement('section');
    prog.className = 'screen'; prog.id = 'progress';
    prog.innerHTML = `
      <div class="topbar"><button class="icon-btn" id="prBack" aria-label="Zurück">←</button><div class="tb-mid"><div class="tb-title">Mein Fortschritt</div><div class="tb-sub" id="prSub"></div></div></div>
      <div id="prBody" class="debrief"></div>`;
    const deb = $('debrief');
    deb.parentNode.insertBefore(loginEl, deb.nextSibling);
    deb.parentNode.insertBefore(prog, loginEl.nextSibling);

    $('loBack').onclick = home;
    $('prBack').onclick = home;
    $('loForm').onsubmit = async (e) => {
      e.preventDefault();
      const msg = $('loMsg');
      msg.textContent = 'Melde an …';
      try {
        await login($('loMail').value.trim(), $('loPw').value);
        $('loPw').value = '';
        msg.textContent = '';
        home();
      } catch (err) {
        msg.textContent = err.status === 400 && /confirm/i.test(err.message) ? 'Bitte erst den Link in der Bestätigungs-E-Mail anklicken.' : err.status === 400 || err.status === 401 ? 'E-Mail oder Passwort falsch.' : err.status ? 'Fehler: ' + err.message : 'Server nicht erreichbar.';
      }
    };
    $('loReg').onclick = async () => {
      const msg = $('loMsg');
      const mail = $('loMail').value.trim(); const pw = $('loPw').value;
      if (!mail || pw.length < 8) { msg.textContent = 'Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben.'; return; }
      msg.textContent = 'Lege Konto an …';
      try {
        if (await register(mail, pw)) { $('loPw').value = ''; msg.textContent = ''; home(); } else msg.textContent = 'Konto angelegt. Bitte bestätige den Link in deiner E-Mail und melde dich dann hier an.';
      } catch (err) {
        msg.textContent = err.status === 422 || err.status === 400 ? 'Fehler: ' + err.message : err.status ? 'Registrierung nicht möglich (' + err.message + ').' : 'Server nicht erreichbar.';
      }
    };
  }

  function renderHome() {
    const c = $('accCard');
    if (!c) return;
    c.hidden = !ENABLED;
    if (A.user) {
      c.innerHTML = `<div class="acc-row"><span>👤 ${esc(A.user.email)}</span><button class="btn small ghost" id="accOut">Abmelden</button></div>
        <button class="btn wide blue" id="accProg">📊 Mein Fortschritt</button>`;
      $('accOut').onclick = logout;
      $('accProg').onclick = openProgress;
    } else if (ls.get(LS_RT)) {
      c.innerHTML = '<div class="acc-row"><span>👤 Angemeldet (offline)</span><button class="btn small ghost" id="accOut">Abmelden</button></div>';
      $('accOut').onclick = logout;
    } else {
      c.innerHTML = '<div class="acc-row"><span class="muted">Fortschritt speichern? Freiwillig.</span><button class="btn small ghost" id="accIn">Anmelden</button></div>';
      $('accIn').onclick = openLogin;
    }
  }

  function openLogin() {
    const m = ls.get(LS_MAIL);
    if (m && !$('loMail').value) $('loMail').value = m;
    $('loMsg').textContent = '';
    screen('login');
  }

  /* ------------------------------------------------------------ Fortschritt */
  function caseName(id) {
    const c = (window.CASES || []).find((x) => x.id === id);
    return c ? (c.person || c.icon || '') + ' ' + c.diagnosis.options[c.diagnosis.answer] : id;
  }
  function rhythmName(k) {
    if (window.ECG2 && window.ECG2.R[k]) return window.ECG2.R[k].name;
    if (window.ECG && window.ECG.RHYTHMS[k]) return window.ECG.RHYTHMS[k].name;
    return k;
  }
  const bar = (p) => `<span class="pbar"><span style="width:${Math.max(0, Math.min(100, p))}%;background:${p >= 80 ? 'var(--good)' : p >= 60 ? 'var(--warn)' : 'var(--bad)'}"></span></span>`;

  async function openProgress() {
    screen('progress');
    const body = $('prBody');
    body.innerHTML = '<div class="ditem">Lade …</div>';
    let cases, ekg;
    try {
      const f = 'order=created_at.desc&limit=1000';
      [cases, ekg] = await Promise.all([
        api(`/rest/v1/${COL_CASE}?select=fall,meldung,prozent,diagnose_richtig,fehler,vergessen,created_at&${f}`),
        api(`/rest/v1/${COL_EKG}?select=rhythmus,modus,richtig,punkte,max_punkte&${f}`),
      ]);
    } catch (e) {
      body.innerHTML = `<div class="ditem bad">Fortschritt konnte nicht geladen werden (${esc(e.message)}).</div>`;
      return;
    }
    renderProgress(cases, ekg);
  }

  function renderProgress(cases, ekg) {
    const body = $('prBody');
    const all = window.CASES || [];
    $('prSub').textContent = `${cases.length} Einsätze · ${ekg.length} EKG-Streifen`;

    // Einsätze je Fall
    const per = {};
    cases.forEach((c) => { (per[c.fall] = per[c.fall] || []).push(c); });
    const rows = Object.keys(per).map((id) => {
      const l = per[id];
      const avg = Math.round(l.reduce((t, x) => t + (x.prozent || 0), 0) / l.length);
      const last = l[0].prozent || 0;
      return { id, n: l.length, avg, last, best: Math.max(...l.map((x) => x.prozent || 0)) };
    }).sort((a, b) => a.avg - b.avg);
    const never = all.filter((c) => !per[c.id]).map((c) => c.id);

    // EKG je Rhythmus
    const rh = {};
    ekg.forEach((e) => { const r = rh[e.rhythmus] = rh[e.rhythmus] || { n: 0, ok: 0 }; r.n++; if (e.richtig) r.ok++; });
    const rrows = Object.keys(rh).map((k) => ({ k, n: rh[k].n, p: Math.round((100 * rh[k].ok) / rh[k].n) })).sort((a, b) => a.p - b.p);
    const weakR = rrows.filter((r) => r.p < 75 && window.ECG2 && window.ECG2.R[r.k]).map((r) => r.k);

    // häufige Fehler (letzte 30 Einsätze)
    const cnt = {};
    cases.slice(0, 30).forEach((c) => { (c.vergessen || []).map((t) => 'Vergessen: ' + t).concat(c.fehler || []).forEach((t) => { cnt[t] = (cnt[t] || 0) + 1; }); });
    const top = Object.keys(cnt).filter((t) => cnt[t] > 1).sort((a, b) => cnt[b] - cnt[a]).slice(0, 6);

    let h = '';
    const weakest = rows.length && rows[0].avg < 80 ? rows[0].id : null;
    const target = never.length ? never[Math.floor(Math.random() * never.length)] : weakest;
    h += '<div class="row">';
    if (target) h += `<button class="btn accent" id="prCase">${never.length ? '🆕 Neuen Fall spielen' : '🎯 Schwächsten Fall üben'}</button>`;
    if (weakR.length) h += `<button class="btn blue" id="prEkg">🩺 Schwache Rhythmen üben</button>`;
    h += '</div>';

    h += '<h4>Einsätze</h4>';
    if (!rows.length) h += '<div class="ditem">Noch keine Einsätze gespeichert.</div>';
    h += rows.map((r) => `<div class="ditem prow"><b>${esc(caseName(r.id))}</b>${bar(r.avg)}<small>${r.n}× gespielt · Schnitt ${r.avg} % · zuletzt ${r.last} % · bestes ${r.best} %</small></div>`).join('');
    if (never.length && rows.length) h += `<div class="ditem"><small>${never.length} von ${all.length} Fällen noch nie gespielt.</small></div>`;

    if (top.length) h += '<h4>Passiert dir öfter</h4>' + top.map((t) => `<div class="ditem miss"><span class="p">${cnt[t]}×</span>${esc(t)}</div>`).join('');

    h += '<h4>EKG-Rhythmen</h4>';
    if (!rrows.length) h += '<div class="ditem">Noch keine EKG-Ergebnisse gespeichert.</div>';
    h += rrows.map((r) => `<div class="ditem prow"><b>${esc(rhythmName(r.k))}</b>${bar(r.p)}<small>${r.p} % richtig erkannt · ${r.n} Streifen</small></div>`).join('');

    if (cases.length) {
      h += '<h4>Verlauf</h4>' + cases.slice(0, 10).map((c) => {
        const d = c.created_at ? new Date(c.created_at) : null;
        const ds = d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        return `<div class="ditem"><span class="p">${c.prozent} %</span>${esc(c.meldung || caseName(c.fall))}<small>${ds}${c.diagnose_richtig ? ' · Diagnose richtig' : ''}</small></div>`;
      }).join('');
    }
    body.innerHTML = h;
    if ($('prCase')) $('prCase').onclick = () => window.__game.startCase(target);
    if ($('prEkg')) $('prEkg').onclick = () => window.Trainer2.start(weakR.length > 1 ? weakR : weakR.concat(['sinus']));
  }

  /* ------------------------------------------------------------ Start */
  buildDom();
  renderHome();
  if (ENABLED && ls.get(LS_RT)) loadUser().then(flush);
  window.__account = { A, renderProgress, api };
})();
