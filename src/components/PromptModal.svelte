<script lang="ts">
  import type { Game } from '../lib/engine/game';
  import type { Prompt } from '../lib/engine/state';
  import MonitorView from './MonitorView.svelte';
  import Options from './Options.svelte';
  import PlaceBoard from './PlaceBoard.svelte';

  let { game, prompt }: { game: Game; prompt: Prompt } = $props();
</script>

<div class="modal-bg open">
  <div class="modal" role="dialog" aria-modal="true">
    {#if prompt.kind === 'mc'}
      <div class="kicker">{prompt.kicker}</div>
      <h3>{prompt.title}</h3>
      <Options choices={prompt.choices} disabled={prompt.answered} onpick={(i) => game.choose(i)} />
      {#if prompt.answered}
        {#if prompt.explain}<div class="explain">{prompt.explain}</div>{/if}
        <button class="btn wide accent" onclick={() => game.next()}>{prompt.cont}</button>
      {/if}

    {:else if prompt.kind === 'order'}
      <div class="kicker">Quiz · Reihenfolge</div>
      <h3>{prompt.title}</h3>
      {#if !prompt.result}
        <p class="hint">Tippe die Schritte in der richtigen Reihenfolge an.</p>
        <div class="order-picked">
          {#each prompt.picked as t, i (t)}<div class="op"><span class="n">{i + 1}.</span><span>{t}</span></div>{/each}
        </div>
        <div class="options">
          {#each prompt.items.filter((t) => !prompt.picked.includes(t)) as t (t)}
            <button class="opt" onclick={() => game.orderPick(t)}>{t}</button>
          {/each}
        </div>
        <div class="row">
          <button class="btn ghost" onclick={() => game.orderReset()}>Zurücksetzen</button>
          <button class="btn accent" disabled={prompt.picked.length !== prompt.items.length} onclick={() => game.orderCheck()}>Prüfen</button>
        </div>
      {:else}
        <div class="order-picked">
          {#each prompt.result as r, i (i)}
            <div class="op {r.ok ? 'right' : 'wrong'}"><span class="n">{i + 1}.</span><span>{r.item}{#if !r.ok}<small>Richtig: {r.right}</small>{/if}</span></div>
          {/each}
        </div>
        <div class="row"><button class="btn accent" onclick={() => game.next()}>Weiter</button></div>
      {/if}

    {:else if prompt.kind === 'moment'}
      <div class="kicker">💬 {prompt.who}</div>
      <h3 class="say">{prompt.say}</h3>
      <p class="hint">Wie reagierst du?</p>
      <Options choices={prompt.choices} disabled={prompt.answered} onpick={(i) => game.choose(i)} />
      {#if prompt.answered}
        {#if prompt.reply}<div class="react"><span class="who">{prompt.who}</span>{prompt.reply}</div>{/if}
        {#if prompt.why}<div class="explain">{prompt.why}</div>{/if}
        <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
      {/if}

    {:else if prompt.kind === 'proc'}
      <div class="kicker">Schritt für Schritt</div>
      <h3>{prompt.title}</h3>
      <p class="hint">Was machst du als Nächstes? Tippe die Schritte in deiner Reihenfolge an.</p>
      <div class="proc-done">
        {#each prompt.done as d, i (i)}<div class="op {d.bad ? 'bad' : ''}">{i + 1}. {d.label}</div>{/each}
      </div>
      {#if prompt.react}<div class="react"><span class="who">{prompt.react.who}</span>{prompt.react.text}</div>{/if}
      {#if prompt.refusal}
        <Options choices={prompt.refusal} onpick={(i) => game.choose(i)} />
      {:else if prompt.finished}
        <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
      {:else}
        <div class="options">
          {#each prompt.steps as st (st.id)}<button class="opt" onclick={() => game.procPick(st.id)}>{st.label}</button>{/each}
        </div>
      {/if}

    {:else if prompt.kind === 'place'}
      <div class="kicker">Selbst kleben · {prompt.variant}</div>
      <h3>{prompt.title}</h3>
      <PlaceBoard {game} {prompt} />

    {:else if prompt.kind === 'rhythm'}
      <div class="kicker">{prompt.kicker}</div>
      <h3>{prompt.title}</h3>
      <div class="quiz-monitor"><MonitorView rhythm={prompt.rhythm} rate={prompt.rate} /></div>
      <div class="pulsebox">{prompt.pulseText ?? ''}</div>
      {#if !prompt.answered}
        <div class="row">
          {#if !prompt.pulseKnown}<button class="btn small ghost" onclick={() => game.rhythmPulse()} disabled={!!prompt.pulseText}>🫳 Puls prüfen</button>{/if}
          <button class="btn small ghost" onclick={() => game.rhythmHelp()} disabled={!!prompt.help}>💡 Hilfe</button>
        </div>
      {/if}
      {#if prompt.help}
        <div class="helpbox">{#each prompt.help as h (h.label)}<div><b>{h.label}:</b> {h.text}</div>{/each}</div>
      {/if}
      <Options choices={prompt.choices} disabled={prompt.answered} onpick={(i) => game.choose(i)} />
      {#if prompt.answered}
        <div class="explain pre">{prompt.explain}</div>
        <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
      {/if}
    {/if}
  </div>
</div>
