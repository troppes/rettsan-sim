<script lang="ts">
  import { app } from '../lib/app.svelte';
  import type { Debrief } from '../lib/engine/scoring';
  import PatientFace from '../components/PatientFace.svelte';

  let { result: r, saveState, onAgain }: { result: Debrief; saveState: 'ok' | 'queued' | 'off' | null; onAgain: () => void } = $props();
  const color = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)' } as Record<string, string>;
</script>

<section class="screen active">
  <div class="topbar"><div class="tb-mid"><div class="tb-title">Auswertung</div></div></div>
  <div class="debrief">
    <div class="score">
      <div class="big" style:color={color[r.grade.tone]}>{r.pct} %</div>
      <div class="grade">{r.grade.label}</div>
      <small>{r.score} von {r.max} Punkten · Einsatzzeit {r.minutes} min</small>
    </div>
    {#if r.face}
      <div class="end-face"><PatientFace look={r.face.look} face={r.face.state} size={64} /><span>So ging es dem Patienten am Ende mit dir.</span></div>
    {/if}
    <div class="ditem"><b>{r.person} {r.title}</b><small>Lösung: {r.solution}{#if r.reaPath} · Rhythmusverlauf: {r.reaPath}{/if}</small></div>

    <h4>Erledigt</h4>
    {#each r.done as x (x.label)}<div class="ditem good"><span class="p">+{x.pts}</span>✓ {x.label}<small>{x.why}</small></div>{:else}<div class="ditem">Nichts davon.</div>{/each}
    {#if r.missed.length}
      <h4>Vergessen</h4>
      {#each r.missed as x (x.label)}<div class="ditem miss"><span class="p">{x.pts}</span>✗ {x.label}<small>{x.why}</small></div>{/each}
    {/if}
    {#if r.bad.length}
      <h4>Fehler und Reihenfolge</h4>
      {#each r.bad as e, i (i)}<div class="ditem bad"><span class="p">{e.pts}</span>{e.text}</div>{/each}
    {/if}
    {#if r.good.length || r.miss.length}
      <h4>Quiz und Erkennen</h4>
      {#each r.good as e, i (i)}<div class="ditem good"><span class="p">+{e.pts}</span>{e.text}</div>{/each}
      {#each r.miss as e, i (i)}<div class="ditem miss">{e.text}{#if e.why}<small>{e.why}</small>{/if}</div>{/each}
    {/if}
    <h4>Merke</h4>
    <div class="ditem"><ul class="teach">{#each r.teach as t (t)}<li>{t}</li>{/each}</ul></div>

    <div class="row" style="margin-top:14px">
      <button class="btn accent" onclick={onAgain}>Nochmal</button>
      <button class="btn ghost" onclick={() => app.home()}>Andere Einsätze</button>
    </div>
    <div class="save-status">
      {#if saveState === 'ok'}✓ Im Fortschritt gespeichert
      {:else if saveState === 'queued'}⏳ Offline: wird später gespeichert
      {:else if saveState === 'off'}<button class="btn small ghost" onclick={() => app.go({ name: 'login' })}>Anmelden, um Ergebnisse zu speichern</button>{/if}
    </div>
    <p class="foot">Inhalte nach NAW-Schulmeinung. Im Zweifel gilt dein Unterricht.</p>
  </div>
</section>
