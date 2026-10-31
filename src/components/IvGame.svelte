<script lang="ts">
  /* i.v.-Zugang als Minispiel: stauen → Vene wählen → desinfizieren → Winkel wählen und
     vorschieben, bis Blut kommt → Reihenfolge nach dem Treffer. */
  import type { Game } from '../lib/engine/game';
  import type { Prompt } from '../lib/engine/state';
  import { shuffle } from '../lib/util';

  let { game, prompt }: { game: Game; prompt: Extract<Prompt, { kind: 'iv' }> } = $props();
  const cfg = $derived(prompt.cfg);

  type Phase = 'stau' | 'vene' | 'desinf' | 'stich' | 'order' | 'done';
  let phase = $state<Phase>('stau');
  let stauOk = $state(false);
  let vein = $state<string | null>(null);
  let miss = $state('');
  let early = $state(false);
  let retouched = $state(false);
  let left = $state(0);
  let sprayed = $state(false);
  let angle = $state(40);
  let s = $state(-12);
  let pushing = $state(false);
  let wasIn = $state(false);
  let hit = $state<'in' | 'through' | 'short' | null>(null);
  let picked = $state<string[]>([]);
  let orderItems = $state<string[]>([]);

  /* ---------- Phase 1: stauen */
  function stau(ok: boolean) { stauOk = ok; phase = 'vene'; }

  /* ---------- Phase 2: Vene antippen */
  let arm = $state<SVGSVGElement>();
  function tapArm(ev: PointerEvent) {
    if (phase !== 'vene' || !arm) return;
    const m = arm.getScreenCTM();
    if (!m) return;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    const v = cfg.veins.find((x) => Math.hypot(pt.x - x.x, pt.y - x.y) <= x.r);
    if (!v) { miss = 'Da ist keine Vene zu tasten.'; return; }
    miss = '';
    vein = v.id;
    phase = 'desinf';
  }

  /* ---------- Phase 3: desinfizieren und Einwirkzeit */
  let timer: ReturnType<typeof setInterval> | undefined;
  function spray() {
    sprayed = true;
    left = cfg.wait;
    clearInterval(timer);
    timer = setInterval(() => { left = Math.max(0, left - 1); if (!left) clearInterval(timer); }, 1000);
  }
  function touch() { retouched = true; sprayed = false; left = 0; clearInterval(timer); }
  function toStich() {
    if (left > 0) early = true;
    clearInterval(timer);
    phase = 'stich';
  }
  $effect(() => () => clearInterval(timer));

  /* ---------- Phase 4: Querschnitt, Kanüle vorschieben */
  const SKIN = 40, VX = 200, VY = 86, RX = 46, RY = 13;
  const rad = $derived((angle * Math.PI) / 180);
  const entry = $derived(VX - (VY - SKIN) / Math.tan(rad));
  const tip = $derived({ x: entry + s * Math.cos(rad), y: SKIN + s * Math.sin(rad) });
  const inside = (p: { x: number; y: number }) => ((p.x - VX) / RX) ** 2 + ((p.y - VY) / RY) ** 2 <= 1;
  const tipIn = $derived(inside(tip));
  const tail = $derived({ x: tip.x - 130 * Math.cos(rad), y: tip.y - 130 * Math.sin(rad) });

  $effect(() => {
    if (!pushing) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      s += ((now - last) / 1000) * 32;
      last = now;
      if (inside(tip)) wasIn = true;
      else if (wasIn && tip.y > VY) { pushing = false; hit = 'through'; return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
  function stopHere() {
    pushing = false;
    hit = tipIn ? 'in' : 'short';
    if (hit === 'in') { orderItems = shuffle(cfg.order); phase = 'order'; } else finish();
  }

  /* ---------- Phase 5: Reihenfolge */
  function pick(t: string) {
    if (picked.includes(t)) return;
    picked = [...picked, t];
    if (picked.length === cfg.order.length) finish();
  }

  function finish() {
    phase = 'done';
    game.ivDone({ stauOk, vein: vein ?? '', early, retouched, angle, hit: hit ?? 'short', order: picked });
  }
</script>

{#if phase === 'stau'}
  <p class="hint">Material liegt bereit, Handschuhe sind an. Wie staust du?</p>
  <div class="options">
    <button class="opt" onclick={() => stau(true)}>Stauband anlegen, nur so fest, dass der Radialispuls tastbar bleibt</button>
    <button class="opt" onclick={() => stau(false)}>Stauband richtig fest anziehen, bis kein Puls mehr tastbar ist</button>
  </div>
{:else if phase === 'vene' || phase === 'desinf'}
  <p class="hint">{phase === 'vene' ? 'Tippe auf die Stelle, die du punktieren willst.' : 'Desinfizieren und die Einwirkzeit abwarten.'}</p>
  <svg bind:this={arm} class="iv-arm" viewBox="0 0 300 130" role="img" aria-label="Unterarm, Handinnenseite" onpointerdown={tapArm}>
    <path class="skin" d="M10 40 Q120 30 240 42 L296 36 Q300 70 296 104 L240 98 Q120 112 10 104 Z" />
    <path class="crease" d="M58 38 Q62 72 58 104" />
    <g class="veins" class:filled={stauOk}>
      <path d="M12 60 Q100 57 150 62 Q185 66 205 70" />
      <path d="M205 70 Q235 62 268 57" />
      <path d="M205 70 Q232 80 252 86" />
    </g>
    <path class="artery" d="M196 100 Q222 97 252 95" />
    {#if stauOk}<rect class="band" x="20" y="34" width="10" height="74" rx="3" />{:else}<rect class="band tight" x="20" y="32" width="12" height="78" rx="3" />{/if}
    {#if vein}
      {@const v = cfg.veins.find((x) => x.id === vein)!}
      <circle class="spot" cx={v.x} cy={v.y} r="7" />
      {#if sprayed}<circle class="wet" cx={v.x} cy={v.y} r="16" />{/if}
    {/if}
  </svg>
  {#if miss}<p class="hint warn">{miss}</p>{/if}
  {#if phase === 'desinf'}
    <div class="row">
      <button class="btn small" onclick={spray}>🧴 Desinfizieren</button>
      <button class="btn small ghost" onclick={touch}>☝️ Nochmal tasten</button>
    </div>
    <p class="hint">{#if sprayed}{left > 0 ? `${cfg.waitText}: noch ${left} s` : 'Trocken, Einwirkzeit vorbei.'}{:else}Noch nicht desinfiziert.{/if}</p>
    <button class="btn wide accent" disabled={!sprayed} onclick={toStich}>Zum Punktieren</button>
  {/if}
{:else if phase === 'stich'}
  <p class="hint">Winkel einstellen, dann <b>gedrückt halten</b> zum Vorschieben. Loslassen, sobald Blut in der Kammer ist.</p>
  <svg class="iv-cut" viewBox="0 0 300 130" role="img" aria-label="Querschnitt Haut und Vene">
    <rect class="tissue" x="0" y={SKIN} width="300" height={130 - SKIN} />
    <line class="skinline" x1="0" y1={SKIN} x2="300" y2={SKIN} />
    <ellipse class="vein" class:hit={tipIn} cx={VX} cy={VY} rx={RX} ry={RY} />
    <line class="needle" x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} />
    <rect class="chamber" class:blood={wasIn && hit !== 'through'} x={tail.x - 14} y={tail.y - 6} width="16" height="12" rx="2" transform="rotate({angle} {tail.x} {tail.y})" />
  </svg>
  <label class="angle">Winkel: <b>{angle}°</b>
    <input type="range" min="5" max="60" bind:value={angle} disabled={s > -12} />
  </label>
  {#if hit === 'through'}
    <p class="hint warn">Durchgestochen!</p>
    <button class="btn wide accent" onclick={finish}>Weiter</button>
  {:else}
    <div class="row">
      <button class="btn accent push" onpointerdown={() => (pushing = true)} onpointerup={() => (pushing = false)} onpointerleave={() => (pushing = false)} oncontextmenu={(e) => e.preventDefault()}>Vorschieben (halten)</button>
      <button class="btn" disabled={s <= -12 || pushing} onclick={stopHere}>Kanüle liegt</button>
    </div>
  {/if}
{:else if phase === 'order'}
  <p class="hint">Blut in der Kammer! Was jetzt, in welcher Reihenfolge?</p>
  <div class="order-picked">{#each picked as t, i (t)}<div class="op"><span class="n">{i + 1}.</span><span>{t}</span></div>{/each}</div>
  <div class="options">{#each orderItems.filter((t) => !picked.includes(t)) as t (t)}<button class="opt" onclick={() => pick(t)}>{t}</button>{/each}</div>
  {#if picked.length}<button class="btn small ghost" onclick={() => (picked = [])}>Zurücksetzen</button>{/if}
{/if}

{#if prompt.result}
  <div class="place-result">
    {#each prompt.result.lines as l, i (i)}<div class="op {l.ok ? 'right' : 'wrong'}">{l.ok ? '✓' : '✗'}&nbsp;{l.text}</div>{/each}
  </div>
  <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
{/if}

<style>
  .iv-arm, .iv-cut { display: block; width: 100%; max-width: 420px; margin: 6px auto; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
  .skin { fill: #ecc6a6; stroke: #b48d72; }
  .crease { fill: none; stroke: #b48d72; stroke-width: 1; opacity: 0.6; }
  .veins path { fill: none; stroke: #6c86c4; stroke-width: 2.5; opacity: 0.35; stroke-linecap: round; }
  .veins.filled path { stroke-width: 5; opacity: 0.8; }
  .artery { fill: none; stroke: #c0504d; stroke-width: 2.5; opacity: 0.5; animation: puls 0.85s ease-in-out infinite; }
  @keyframes puls { 50% { stroke-width: 4; opacity: 0.85; } }
  .band { fill: #3f8cff; }
  .band.tight { fill: #ff5a4e; }
  .spot { fill: none; stroke: #fff; stroke-width: 2; }
  .wet { fill: #9fd8ff55; stroke: #9fd8ff; stroke-width: 1; }
  .tissue { fill: #f0cdb2; }
  .skinline { stroke: #b48d72; stroke-width: 2; }
  .vein { fill: #6c86c4; opacity: 0.8; }
  .vein.hit { fill: #8a2b2b; }
  .needle { stroke: #cfd6de; stroke-width: 3; stroke-linecap: round; }
  .chamber { fill: #ffffffaa; stroke: #888; }
  .chamber.blood { fill: #b71c1c; }
  .angle { display: flex; gap: 10px; align-items: center; justify-content: center; font-size: 15px; }
  .angle input { flex: 1; max-width: 220px; }
  .push { flex: 1; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  .warn { color: var(--bad); }
</style>
