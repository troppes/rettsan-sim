<script lang="ts">
  import PatientFace from '../components/PatientFace.svelte';
  import type { FaceState } from '../lib/engine/state';
  const calm: FaceState = { mood: 6, eyes: 'open', pale: false, sweat: false, flushed: false, cyanotic: false };
  import { app } from '../lib/app.svelte';
  import { account } from '../lib/account/account.svelte';
  import { CASES } from '../lib/data';
  import Toggle from '../components/Toggle.svelte';

  // Meldung pro Fall beim Öffnen der Startseite auslosen
  const picks = CASES.map((c) => Math.floor(Math.random() * c.dispatches.length));
  const start = (i: number) => app.go({ name: 'game', caseId: CASES[i].id, dispatch: picks[i] });
  const random = () => app.go({ name: 'game', caseId: CASES[Math.floor(Math.random() * CASES.length)].id });
</script>

<section id="home" class="screen active">
  <header class="hero">
    <div class="logo">
      <svg viewBox="0 0 100 40" aria-hidden="true"><path d="M2 22h20l6-16 9 30 8-22 5 8h48" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" /></svg>
    </div>
    <h1>RettSan Sim</h1>
    <p class="sub">Patienten untersuchen, befragen, behandeln. Nach NAW-Schulmeinung, in der Rolle als Rettungssanitäter.</p>
  </header>

  <div class="settings card">
    <Toggle bind:checked={app.settings.worsen} title="Verschlechterung" hint="Unbehandelte Probleme werden mit der Zeit schlimmer" />
    <Toggle bind:checked={app.settings.detail} title="Maßnahmen im Detail" hint="Messen und Behandeln Schritt für Schritt (aus = nur rätseln)" />
  </div>

  {#if account.enabled}
    <div class="card account">
      {#if account.user}
        <div class="acc-row"><span>👤 {account.user.email}</span><button class="btn small ghost" onclick={() => account.logout()}>Abmelden</button></div>
        <button class="btn wide blue" onclick={() => app.go({ name: 'progress' })}>📊 Mein Fortschritt</button>
      {:else if account.pending}
        <div class="acc-row"><span>👤 Angemeldet (offline)</span><button class="btn small ghost" onclick={() => account.logout()}>Abmelden</button></div>
      {:else}
        <div class="acc-row"><span class="muted">Fortschritt speichern? Freiwillig.</span><button class="btn small ghost" onclick={() => app.go({ name: 'login' })}>Anmelden</button></div>
      {/if}
    </div>
  {/if}

  <h2 class="sec">Einsätze</h2>
  <div class="case-list">
    {#each CASES as c, i (c.id)}
      {@const st = account.stats?.[c.id]}
      <button class="case-btn" class:played={!!st} onclick={() => start(i)}>
        <PatientFace look={c.look} face={calm} size={40} />
        <span class="t">
          <b>{c.dispatches[picks[i]].short}</b>
          {#if st}<small class="played-info">✓ {st.n}× gespielt · bestes {st.best} % · zuletzt {st.last} %</small>{/if}
        </span>
        <span class="lvl">{'●'.repeat(c.level)}{'○'.repeat(3 - c.level)}</span>
      </button>
    {/each}
  </div>
  <button class="btn wide ghost" onclick={random}>🎲 Zufälliger Einsatz</button>

  <h2 class="sec">Training</h2>
  <button class="btn wide ghost" onclick={() => app.go({ name: 'trainer' })}>📈 EKG-Trainer Basis: Rhythmen erkennen</button>
  <button class="btn wide ghost" onclick={() => app.go({ name: 'trainerPro' })}>🩺 EKG-Trainer Profi: systematisch analysieren</button>

  <details class="card howto">
    <summary>So funktioniert’s</summary>
    <ul>
      <li><b>Untersuchen</b>, <b>Fragen</b> und <b>Maßnahmen</b> wählst du frei. Jede Aktion kostet Einsatzzeit.</li>
      <li>Arbeite nach <b>xABCDE</b>. Wer bei einem offenen x-, A-, B- oder C-Problem schon Späteres macht, bekommt Abzug. Beim stabilen Patienten reicht ein kurzer Ersteindruck, dann darfst du gezielt vorgehen.</li>
      <li>Die Einsatzmeldung kann täuschen: Nicht jeder Bauchschmerz ist der Bauch.</li>
      <li>Der Patient hat eine <b>Stimmung</b>. Wer erklärt, vorstellt und beruhigt, bekommt bessere Antworten. Wer ungefragt piekst, erntet Ärger.</li>
      <li>Wenn du mit Maßnahmen anfängst, kommt ein kurzes <b>Quiz</b> zur richtigen Abfolge.</li>
      <li>Mit <b>Übergabe</b> beendest du den Einsatz, stellst deine Verdachtsdiagnose und bekommst die Auswertung.</li>
      <li>Mit einem <b>Konto</b> (freiwillig) werden Ergebnisse gespeichert und du siehst deine Schwachstellen.</li>
    </ul>
  </details>
  <p class="foot">Lernspiel für die RettSan-Ausbildung. Ersetzt keine Ausbildung, Leitlinie oder SOP. · v{__APP_VERSION__}</p>
</section>
