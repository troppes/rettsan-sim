<script lang="ts">
  /* i.v.-Zugang als Minispiel: stauen → Vene wählen → desinfizieren → Winkel wählen und
     vorschieben, bis Blut kommt → Reihenfolge nach dem Treffer. */
  import type { Game } from '../lib/engine/game';
  import type { Prompt } from '../lib/engine/state';
  import { shuffle } from '../lib/util';

  let { game, prompt }: { game: Game; prompt: Extract<Prompt, { kind: 'iv' }> } = $props();
  const cfg = $derived(prompt.cfg);

  type Phase = 'stau' | 'vene' | 'desinf' | 'ziel' | 'stich' | 'order' | 'done';
  let phase = $state<Phase>('stau');
  let stauOk = $state(false);
  let vein = $state<string | null>(null);
  let miss = $state('');
  let early = $state(false);
  let retouched = $state(false);
  let left = $state(0);
  let sprayed = $state(false);
  let angle = $state(40);
  let pushing = $state(false);
  let wasIn = $state(false);
  let hit = $state<'in' | 'through' | 'short' | 'beside' | null>(null);
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
    phase = 'ziel';
  }
  $effect(() => () => clearInterval(timer));

  /* ---------- Phase 4: Zielen (Draufsicht). Die Vene schlängelt sich, ohne gestraffte Haut rollt sie weg. */
  const veinQ = $derived(cfg.veins.find((v) => v.id === vein)?.quality ?? 'ok');
  const W = $derived(veinQ === 'good' ? 8 : veinQ === 'ok' ? 6 : 5); // halbe Venenbreite in der Draufsicht
  const D = 34; // so weit vor der Einstichstelle erreicht die Spitze die Vene
  const shape = { cy: 62 + Math.random() * 26, amp: 4 + Math.random() * 9, f: 0.018 + Math.random() * 0.02, ph: Math.random() * 6.28 };
  let roll = $state(0);
  const veinY = (x: number) => shape.cy + roll + shape.amp * Math.sin(x * shape.f + shape.ph);
  const veinPath = $derived(Array.from({ length: 31 }, (_, i) => `${i ? 'L' : 'M'}${i * 10} ${veinY(i * 10).toFixed(1)}`).join(' '));
  let aim = $state<{ x: number; y: number } | null>(null);
  let tensioned = $state(false);
  let corrections = $state(0);
  let rolled = $state(false);
  let beside = $state(false);
  let top = $state<SVGSVGElement>();
  function tapTop(ev: PointerEvent) {
    if (phase !== 'ziel' || !top) return;
    const m = top.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    aim = { x: Math.max(D + 20, Math.min(280, q.x)), y: Math.max(10, Math.min(140, q.y)) };
  }
  const nudge = (dy: number) => { if (aim) aim = { ...aim, y: aim.y + dy }; };
  function einstechen() {
    if (!aim) return;
    let justRolled = false;
    if (!tensioned && !rolled && Math.random() < 0.65) {
      rolled = true; justRolled = true;
      roll = (Math.random() < 0.5 ? -1 : 1) * (W + 3 + Math.random() * 6);
    }
    beside = Math.abs(aim.y - veinY(aim.x - D)) > W;
    // Seitenansicht neu aufbauen
    tip = { x: EX - 8 * Math.cos(rad0()), y: SKIN - 8 * Math.sin(rad0()) };
    a = angle; inDist = 0; wasIn = false; flash = false; hit = null; hematoma = 0;
    setTimeout(() => (phase = 'stich'), justRolled ? 900 : 0);
  }

  /* ---------- Phase 5: Seitenansicht, vorschieben bis Blut kommt, Winkel absenken, nachschieben */
  const SKIN = 40, EX = 60;
  const VY = 70 + Math.random() * 18;
  const R = $derived(veinQ === 'good' ? 7 : veinQ === 'ok' ? 6 : 5);
  let a = $state(25); // aktueller Winkel (sinkt beim Absenken)
  const rad0 = () => (angle * Math.PI) / 180;
  const rad = $derived((a * Math.PI) / 180);
  let tip = $state({ x: EX, y: SKIN });
  let inDist = $state(0);
  let flash = $state(false);
  let hematoma = $state(0);
  const lumen = (y: number) => y > VY - R && y < VY + R;
  const tipIn = $derived(!beside && lumen(tip.y));
  const tail = $derived({ x: tip.x - 130 * Math.cos(rad), y: tip.y - 130 * Math.sin(rad) });
  const under = $derived(tip.y > SKIN);

  $effect(() => {
    if (!pushing) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const d = ((now - last) / 1000) * 22;
      last = now;
      tip = { x: tip.x + d * Math.cos(rad), y: tip.y + d * Math.sin(rad) };
      if (!beside && lumen(tip.y)) {
        inDist += d;
        if (!wasIn) { wasIn = true; setTimeout(() => (flash = true), 350); }
      } else if (!beside && wasIn && tip.y >= VY + R) {
        pushing = false; hit = 'through'; flash = true;
        const grow = setInterval(() => { hematoma = Math.min(26, hematoma + 2); if (hematoma >= 26) clearInterval(grow); }, 80);
        return;
      }
      if (tip.y > 128 || tip.x > 296) { pushing = false; return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
  /** Winkel absenken: Spitze bleibt, die Kanüle wird flacher */
  function lower() { a = Math.max(5, a - 10); }
  function vorschieben() {
    pushing = false;
    if (beside) hit = 'beside';
    else if (tipIn) hit = 'in';
    else hit = wasIn ? 'through' : 'short';
    if (hit === 'in' && inDist >= cfg.catheter) { orderItems = shuffle(cfg.order); phase = 'order'; } else finish(false);
  }
  function retry() {
    pushing = false;
    corrections++;
    phase = 'ziel';
  }

  /* ---------- Phase 5: Reihenfolge */
  function pick(t: string) {
    if (picked.includes(t)) return;
    picked = [...picked, t];
    if (picked.length === cfg.order.length) finish(true);
  }

  function finish(catheter: boolean) {
    phase = 'done';
    game.ivDone({ stauOk, vein: vein ?? '', early, retouched, tensioned, corrections, angle, hit: hit ?? 'short', catheter, order: picked });
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
{:else if phase === 'ziel'}
  <p class="hint">{corrections ? 'Zurückgezogen. Neu ausrichten:' : 'Ziel auf die Vene tippen, mit ▲▼ fein ausrichten.'} Die Spitze trifft erst ein Stück vor der Einstichstelle auf die Vene (gestrichelt).</p>
  <svg bind:this={top} class="iv-top" viewBox="0 0 300 150" role="img" aria-label="Punktionsstelle von oben" onpointerdown={tapTop}>
    <rect class="skin" x="0" y="0" width="300" height="150" rx="8" />
    <path class="topvein" class:roll={rolled} d={veinPath} stroke-width={W * 2} />
    {#if tensioned}<g class="thumb"><ellipse cx="292" cy={veinY(292)} rx="14" ry="20" /><text x="282" y={veinY(292) + 5}>👍</text></g>{/if}
    {#if aim}
      <line class="needle-top" x1={aim.x} y1={aim.y} x2={aim.x + 120} y2={aim.y} />
      <line class="path-top" x1={aim.x - D} y1={aim.y} x2={aim.x} y2={aim.y} />
      <circle class="tip-top" cx={aim.x - D} cy={aim.y} r="2.5" />
      <circle class="spot" cx={aim.x} cy={aim.y} r="3" />
    {/if}
  </svg>
  {#if rolled && roll}<p class="hint warn">Die Vene ist weggerollt!</p>{/if}
  <div class="row">
    <button class="btn small {tensioned ? 'set' : 'ghost'}" onclick={() => (tensioned = !tensioned)}>👍 Haut straffen</button>
    <button class="btn small ghost" disabled={!aim} onclick={() => nudge(-1)}>▲</button>
    <button class="btn small ghost" disabled={!aim} onclick={() => nudge(1)}>▼</button>
  </div>
  {#if !corrections}
    <label class="angle">Winkel: <b>{angle}°</b><input type="range" min="5" max="60" bind:value={angle} /></label>
  {/if}
  <button class="btn wide accent" disabled={!aim} onclick={einstechen}>Einstechen</button>
{:else if phase === 'stich'}
  <p class="hint">{#if !flash}<b>Gedrückt halten</b> zum Vorschieben, bis Blut in der Kammer ist.{:else if hit === 'through'}Durchgestochen!{:else}Blut! Winkel absenken, noch ein Stück vorschieben, dann die Kunststoffkanüle vorschieben.{/if}</p>
  <svg class="iv-cut" viewBox="0 0 300 130" role="img" aria-label="Seitenansicht Haut und Vene">
    <rect class="tissue" x="0" y={SKIN} width="300" height={130 - SKIN} />
    <line class="skinline" x1="0" y1={SKIN} x2="300" y2={SKIN} />
    <rect class="vein-long" class:ghost={beside} class:hit={tipIn} x="0" y={VY - R} width="300" height={R * 2} rx={R} />
    {#if hematoma}<ellipse class="hema" cx={tip.x} cy={VY + R} rx={hematoma * 1.6} ry={hematoma} />{/if}
    <line class="needle" x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} />
    <line class="cath" x1={tail.x + 8 * Math.cos(rad)} y1={tail.y + 8 * Math.sin(rad)} x2={tip.x - cfg.catheter * Math.cos(rad)} y2={tip.y - cfg.catheter * Math.sin(rad)} />
    <rect class="chamber" class:blood={flash && !beside} x={tail.x - 14} y={tail.y - 6} width="16" height="12" rx="2" transform="rotate({a} {tail.x} {tail.y})" />
  </svg>
  <p class="hint small">Winkel jetzt {a}° · Kunststoffkanüle (gelb) endet kurz hinter der Stahlspitze.</p>
  {#if hit === 'through'}
    <button class="btn wide accent" onclick={() => finish(false)}>Weiter</button>
  {:else}
    <div class="row">
      <button class="btn accent push" onpointerdown={() => (pushing = true)} onpointerup={() => (pushing = false)} onpointerleave={() => (pushing = false)} oncontextmenu={(e) => e.preventDefault()}>Vorschieben (halten)</button>
      <button class="btn small" disabled={!under || pushing} onclick={lower}>Winkel ↓</button>
    </div>
    <div class="row">
      <button class="btn" disabled={!under || pushing} onclick={vorschieben}>Kunststoffkanüle vorschieben</button>
      {#if under && !flash && corrections < 2}<button class="btn small ghost" disabled={pushing} onclick={retry}>Zurückziehen, neu zielen</button>{/if}
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
  .vein-long { fill: #6c86c4; opacity: 0.8; }
  .vein-long.hit { fill: #8a2b2b; }
  .vein-long.ghost { opacity: 0.15; }
  .hema { fill: #5b1f3a; opacity: 0.7; }
  .cath { stroke: #f2c94c; stroke-width: 4.5; stroke-linecap: round; opacity: 0.9; }
  .iv-top { display: block; width: 100%; max-width: 420px; margin: 6px auto; touch-action: manipulation; }
  .topvein { fill: none; stroke: #6c86c4; opacity: 0.75; stroke-linecap: round; transition: d 0.5s; }
  .needle-top { stroke: #cfd6de; stroke-width: 3; }
  .path-top { stroke: #fff; stroke-width: 1.5; stroke-dasharray: 3 3; }
  .tip-top { fill: #fff; }
  .thumb ellipse { fill: #e2b591; stroke: #b48d72; }
  .thumb text { font-size: 14px; }
  .small { font-size: 13px; }
  :global(.btn.set) { background: #173426; color: var(--good); }
  .needle { stroke: #cfd6de; stroke-width: 3; stroke-linecap: round; }
  .chamber { fill: #ffffffaa; stroke: #888; }
  .chamber.blood { fill: #b71c1c; }
  .angle { display: flex; gap: 10px; align-items: center; justify-content: center; font-size: 15px; }
  .angle input { flex: 1; max-width: 220px; }
  .push { flex: 1; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  .warn { color: var(--bad); }
</style>
