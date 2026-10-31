<script lang="ts">
  import PatientFace from '../components/PatientFace.svelte';
  import { tick, untrack } from 'svelte';
  import { app } from '../lib/app.svelte';
  import { account } from '../lib/account/account.svelte';
  import { caseById } from '../lib/data';
  import { Game } from '../lib/engine/game';
  import type { ActionKind } from '../lib/types';
  import { clock } from '../lib/util';
  import ActionSheet from '../components/ActionSheet.svelte';
  import MonitorView from '../components/MonitorView.svelte';
  import PromptModal from '../components/PromptModal.svelte';
  import Debrief from './Debrief.svelte';

  let { caseId, dispatch }: { caseId: string; dispatch?: number } = $props();

  // Ein Einsatz pro Komponente: App baut sie bei jedem Start neu auf
  const game = untrack(() => {
    const c = caseById(caseId)!;
    return new Game(c, { ...app.settings }, dispatch != null ? c.dispatches[dispatch] : undefined);
  });
  const c = game.c;
  let version = $state(0);
  game.onChange = () => version++;
  game.onToast = (t) => app.toast(t.text, t.tone);

  // Snapshot je Änderung: die Engine verändert ihre Objekte direkt
  const view = $derived.by(() => {
    version;
    return {
      log: game.log.slice(),
      prompt: game.prompt ? structuredClone($state.snapshot(game.prompt)) : null,
      mon: game.monitor(),
      status: game.s.status,
      face: game.face(),
      time: clock(game.s.time),
      score: game.score,
      result: game.result,
    };
  });

  let sheet = $state<ActionKind | null>(null);
  let confirm = $state<'finish' | 'quit' | null>(null);
  let beat = $state(false);
  let logEl = $state<HTMLDivElement>();
  let saveState = $state<'ok' | 'queued' | 'off' | null>(null);

  $effect(() => {
    view.log.length;
    tick().then(() => logEl?.scrollTo({ top: logEl.scrollHeight }));
  });
  $effect(() => {
    const r = view.result;
    if (!r) return;
    saveState = null;
    account.save('cases', r.record).then((s) => (saveState = s));
  });

  const titles: Record<ActionKind, string> = { assess: 'Untersuchen', ask: 'Fragen', treat: 'Maßnahmen', rea: 'Reanimation' };
  const pick = (id: string) => { sheet = null; game.act(id); };
  const onbeat = () => { beat = true; setTimeout(() => (beat = false), 120); };
</script>

{#if view.result}
  <Debrief result={view.result} {saveState} onAgain={() => app.go({ name: 'game', caseId, dispatch: undefined })} />
{:else}
  <section id="game" class="screen active">
    <div class="topbar">
      <button class="icon-btn" aria-label="Einsatz abbrechen" onclick={() => (confirm = 'quit')}>✕</button>
      <div class="tb-mid">
        <div class="tb-title">{game.s.dispatch.short}</div>
        <div class="tb-sub">{view.time} · {view.score} Punkte</div>
      </div>
      <button class="btn small accent" onclick={() => (confirm = 'finish')}>Übergabe</button>
    </div>

    <div class="monitor">
      <MonitorView rhythm={view.mon.rhythm} rate={view.mon.rate} showEcg={view.mon.showEcg} showPleth={view.mon.showPleth} cpr={view.mon.cpr} {onbeat} />
      <div class="vitals">
        <div class="v hr" class:beat><span class="vl">HF</span><span class="vv">{view.mon.hr}</span></div>
        <div class="v spo2"><span class="vl">SpO₂</span><span class="vv">{view.mon.spo2}</span></div>
        <div class="v nibp"><span class="vl">RR</span><span class="vv">{view.mon.nibp}</span></div>
        <div class="v af"><span class="vl">AF</span><span class="vv">{view.mon.af}</span></div>
      </div>
      <div class="mini">{#each view.mon.mini as [k, v], i (k)}{i ? ' · ' : ''}<span class="nowrap">{k}&nbsp;<b>{v}</b></span>{/each}</div>
    </div>

    <div class="patient card">
      <PatientFace look={c.look} face={view.face} />
      <div class="pt-txt">{view.status}</div>
    </div>

    <div class="log" aria-live="polite" bind:this={logEl}>
      {#each view.log as e, i (i)}
        <div class="entry {e.type === 'moment' ? 'pt moment' : e.type}">
          {#if e.who}<span class="who">{e.who}</span>{/if}
          {#if e.pts}<span class="pts">{e.pts > 0 ? '+' : '−'}{Math.abs(e.pts)}</span>{' '}{/if}{e.text}
        </div>
      {/each}
    </div>

    <nav class="tabs" class:has-rea={!!c.rea}>
      <button onclick={() => (sheet = 'assess')}>🩺<span>Untersuchen</span></button>
      <button onclick={() => (sheet = 'ask')}>💬<span>Fragen</span></button>
      <button onclick={() => (sheet = 'treat')}>🩹<span>Maßnahmen</span></button>
      {#if c.rea}<button class="rea-tab" onclick={() => (sheet = 'rea')}>❤️‍🔥<span>Rea</span></button>{/if}
    </nav>

    {#if sheet}
      {#key version}
        <ActionSheet title={titles[sheet]} groups={game.sheet(sheet)} onpick={pick} onclose={() => (sheet = null)} />
      {/key}
    {/if}
  </section>

  {#if view.prompt}
    <PromptModal {game} prompt={view.prompt} />
  {:else if confirm}
    <div class="modal-bg open">
      <div class="modal" role="dialog" aria-modal="true">
        {#if confirm === 'finish'}
          <div class="kicker">Übergabe</div>
          <h3>Einsatz beenden?</h3>
          <p>Du übergibst den Patienten und bekommst die Auswertung.</p>
          <div class="row">
            <button class="btn ghost" onclick={() => (confirm = null)}>Weiter arbeiten</button>
            <button class="btn accent" onclick={() => { confirm = null; game.finish(); }}>Übergeben</button>
          </div>
        {:else}
          <h3>Einsatz abbrechen?</h3>
          <p>Der Fortschritt geht verloren.</p>
          <div class="row">
            <button class="btn ghost" onclick={() => (confirm = null)}>Nein</button>
            <button class="btn accent" onclick={() => app.home()}>Abbrechen</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
