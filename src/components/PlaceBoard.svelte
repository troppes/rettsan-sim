<script lang="ts">
  /* Elektroden selbst kleben: Elektrode antippen, dann die Stelle auf dem Oberkörper. */
  import type { Game } from '../lib/engine/game';
  import type { Prompt } from '../lib/engine/state';

  let { game, prompt }: { game: Game; prompt: Extract<Prompt, { kind: 'place' }> } = $props();

  let svg = $state<SVGSVGElement>();
  let active = $state<string | null>(null);

  const ribs = [58, 72, 86, 100, 114, 128, 142, 156];
  const result = (id: string) => prompt.result?.find((r) => r.id === id);
  // Bei Ausschnitt (z. B. nur Brustkorb) Punkte und Schrift mitverkleinern
  const k = $derived(Number(prompt.view.split(' ')[2]) / 200);
  const allPlaced = $derived(prompt.electrodes.every((e) => prompt.pos[e.id]));

  // Ohne Auswahl die nächste noch nicht geklebte Elektrode nehmen
  $effect(() => {
    if (!prompt.result && (!active || prompt.pos[active])) {
      const next = prompt.electrodes.find((e) => !prompt.pos[e.id]);
      if (next) active = next.id;
    }
  });

  function tap(ev: PointerEvent) {
    if (!svg || !active || prompt.result) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    game.placeSet(active, Math.round(pt.x), Math.round(pt.y));
    active = null;
  }
</script>

<p class="hint">{prompt.task}</p>
<div class="place-chips">
  {#each prompt.electrodes as e (e.id)}
    {@const r = result(e.id)}
    <button
      class="chip {active === e.id ? 'active' : ''} {r ? (r.ok ? 'right' : 'wrong') : ''}"
      disabled={!!prompt.result}
      onclick={() => (active = e.id)}
    >
      <span class="dot" style="background:{e.color}"></span>{e.label}{#if prompt.pos[e.id] && !r}&nbsp;✓{/if}
    </button>
  {/each}
</div>

<div class="place-sides"><span>rechts</span><span>Patient von vorn</span><span>links</span></div>
<svg bind:this={svg} class="place-fig" viewBox={prompt.view} role="img" aria-label="Oberkörper von vorn" onpointerdown={tap}>
  <!-- Arme -->
  <path class="skin" d="M38 52 Q20 60 16 110 L14 250 L32 250 L36 130 Z" />
  <path class="skin" d="M162 52 Q180 60 184 110 L186 250 L168 250 L164 130 Z" />
  <!-- Rumpf und Hals -->
  <path class="skin" d="M86 10 L114 10 L116 34 Q150 40 162 52 Q166 70 160 110 L158 170 Q160 220 150 258 L50 258 Q40 220 42 170 L40 110 Q34 70 38 52 Q50 40 84 34 Z" />
  <!-- Schlüsselbeine, Brustbein, Rippen -->
  <path class="bone" d="M100 42 Q75 44 48 50 M100 42 Q125 44 152 50" />
  <rect class="bone" x="96" y="44" width="8" height="96" rx="3" />
  {#each ribs as y (y)}
    <path class="rib" d="M96 {y} Q70 {y + 4} 48 {y + 14} M104 {y} Q130 {y + 4} 152 {y + 14}" />
  {/each}
  <path class="rib" d="M96 142 Q75 160 48 172 M104 142 Q125 160 152 172" />
  <circle class="nipple" cx="71" cy="108" r="3" />
  <circle class="nipple" cx="129" cy="108" r="3" />
  <circle class="nipple" cx="100" cy="210" r="2.5" />

  {#if prompt.result}
    {#each prompt.result as r (r.id)}
      {#if !r.ok}<circle class="target" cx={r.target.x} cy={r.target.y} r={r.target.r} />{/if}
    {/each}
  {/if}
  {#each prompt.electrodes as e (e.id)}
    {@const p = prompt.pos[e.id]}
    {@const r = result(e.id)}
    {#if p}
      <g class="pad {r ? (r.ok ? 'ok' : 'bad') : ''}">
        <circle cx={p.x} cy={p.y} r={7 * k} fill={e.color} />
        <text x={p.x} y={p.y - 10 * k} text-anchor="middle" style="font-size:{9 * k}px">{e.label}</text>
      </g>
    {/if}
    {#if r && !r.ok}
      <text class="target-label" x={r.target.x} y={r.target.y + 3 * k} text-anchor="middle" style="font-size:{8 * k}px">{e.label}</text>
    {/if}
  {/each}
</svg>

{#if prompt.result}
  <div class="place-result">
    {#each prompt.electrodes as e (e.id)}
      {@const r = result(e.id)!}
      <div class="op {r.ok ? 'right' : 'wrong'}"><span class="dot" style="background:{e.color}"></span><b>{e.label}:</b>&nbsp;{r.where}</div>
    {/each}
  </div>
  <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
{:else}
  <div class="row">
    <button class="btn accent" disabled={!allPlaced} onclick={() => game.placeCheck()}>Prüfen</button>
  </div>
{/if}
