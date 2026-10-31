<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { account } from '../lib/account/account.svelte';
  import { ApiError } from '../lib/account/supabase';
  import TopBar from '../components/TopBar.svelte';

  let email = $state(account.lastMail);
  let password = $state('');
  let msg = $state('');
  let busy = $state(false);

  function explain(e: unknown, action: 'login' | 'register') {
    if (!(e instanceof ApiError) || !e.status) return 'Server nicht erreichbar.';
    if (action === 'login') {
      if (/confirm/i.test(e.message)) return 'Bitte erst den Link in der Bestätigungs-E-Mail anklicken.';
      if (e.status === 400 || e.status === 401) return 'E-Mail oder Passwort falsch.';
    }
    return action === 'register' ? `Registrierung nicht möglich (${e.message}).` : 'Fehler: ' + e.message;
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true; msg = 'Melde an …';
    try { await account.login(email.trim(), password); password = ''; app.home(); } catch (err) { msg = explain(err, 'login'); }
    busy = false;
  }
  async function register() {
    if (!email.trim() || password.length < 8) { msg = 'Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben.'; return; }
    busy = true; msg = 'Lege Konto an …';
    try {
      if (await account.register(email.trim(), password)) { password = ''; app.home(); }
      else msg = 'Konto angelegt. Bitte bestätige den Link in deiner E-Mail und melde dich dann hier an.';
    } catch (err) { msg = explain(err, 'register'); }
    busy = false;
  }
</script>

<section class="screen active">
  <TopBar title="Anmelden" onBack={() => app.home()} />
  <form class="card acc-form" onsubmit={submit} autocomplete="on">
    <p class="muted">Freiwillig. Mit Konto werden deine Einsätze und EKG-Ergebnisse gespeichert und du siehst deine Schwachstellen.</p>
    <label>E-Mail<input type="email" autocomplete="username" required bind:value={email} /></label>
    <label>Passwort<input type="password" autocomplete="current-password" required minlength="8" bind:value={password} /></label>
    <div class="row">
      <button class="btn accent" type="submit" disabled={busy}>Anmelden</button>
      <button class="btn ghost" type="button" disabled={busy} onclick={register}>Konto anlegen</button>
    </div>
    <div class="acc-msg">{msg}</div>
  </form>
</section>
