<script lang="ts">
  /* i.v.-Zugang wie am Tablett: Werkzeug wählen und direkt am Arm benutzen.
     Stauband, Tasten, Desinfizieren, Haut straffen, dann mit der Kanüle auf den Arm drücken und
     in Stichrichtung ziehen: Die Zugrichtung ist die Stichrichtung, die Zuglänge der Vorschub.
     Die kleine Seitenansicht zeigt die Tiefe. Blut kommt leicht verzögert, zu weit = durchgestochen. */
  import type { Game } from '../lib/engine/game';
  import type { Prompt } from '../lib/engine/state';
  import { shuffle } from '../lib/util';
  import { onMount } from 'svelte';

  let { game, prompt }: { game: Game; prompt: Extract<Prompt, { kind: 'iv' }> } = $props();
  const cfg = $derived(prompt.cfg);

  type Tool = 'stau' | 'tasten' | 'spray' | 'daumen' | 'nadel';
  let tool = $state<Tool>('stau');
  let stau = $state<'none' | 'ok' | 'tight'>('none');
  let askStau = $state(false);
  let spray = $state<{ x: number; y: number } | null>(null);
  let left = $state(0);
  let retouched = $state(false);
  let feel = $state<{ x: number; y: number; t: number } | null>(null);
  let thumb = $state<{ x: number; y: number } | null>(null);
  let angle = $state(20);
  let msg = $state('');

  /* ---------- Gefäße (Mittellinien), Roll-Versatz */
  const VEINS = ['M12 72 Q100 69 150 74 Q185 78 205 82', 'M205 82 Q235 74 268 69', 'M205 82 Q232 92 252 98'];
  const ARTERY = 'M196 118 Q222 115 252 113';
  let pts: { x: number; y: number }[] = [];
  let art: { x: number; y: number }[] = [];
  let roll = $state(0);
  let probe = $state<SVGPathElement[]>([]);
  let probeA = $state<SVGPathElement>();
  onMount(() => {
    const sample = (p: SVGPathElement) => { const n = p.getTotalLength(); return Array.from({ length: Math.ceil(n / 2) + 1 }, (_, i) => p.getPointAtLength(Math.min(n, i * 2))).map((q) => ({ x: q.x, y: q.y })); };
    pts = probe.flatMap(sample);
    if (probeA) art = sample(probeA);
  });
  const dist = (list: { x: number; y: number }[], x: number, y: number, dy = 0) => list.reduce((m, q) => Math.min(m, Math.hypot(q.x - x, q.y + dy - y)), 1e9);

  /* ---------- Tiefe und Treffer */
  const VD = 4; // Tiefe der Venenmitte
  const K = 0.35; // Vorschub → Tiefe
  const R = $derived((stau === 'ok' ? 2 : stau === 'tight' ? 1.4 : 1.1));
  const W = $derived(R * 2.4); // halbe Venenbreite von oben

  let S = $state<{ x: number; y: number } | null>(null); // Einstichstelle
  let dir = $state<{ x: number; y: number } | null>(null);
  let s = $state(0); // Vorschub entlang der Stichrichtung
  let base = 0;
  let D0: { x: number; y: number } | null = null;
  let dragging = $state(false);
  let usedAngle = 0;
  let early = false, offSite = false, wrongDir = false;
  let tensioned = false;
  let corrections = $state(0);
  let flashAt: number | null = null; // Vorschub beim Eintritt in die Vene
  let flash = $state(false);
  let arterial = $state(false);
  let hema = $state(0);
  let done = $state<'through' | 'in' | null>(null);
  let siteId = '';

  const rad = $derived((angle * Math.PI) / 180);
  const tip = $derived(S && dir ? { x: S.x + dir.x * s * Math.cos(rad), y: S.y + dir.y * s * Math.cos(rad) } : null);
  const depth = $derived(s * Math.sin(rad) * K);
  const lateral = $derived(tip ? dist(pts, tip.x, tip.y, roll) : 1e9);
  const inVein = $derived(!!tip && lateral <= W && Math.abs(depth - VD) < R);
  const inArtery = $derived(!!tip && dist(art, tip.x, tip.y) <= 3.5 && Math.abs(depth - VD) < 1.6);

  /** Nadel von oben: Spitze, Ende (Kammer) und Ende der Kunststoffkanüle */
  const ng = $derived.by(() => {
    if (!S) return { tx: 0, ty: 0, bx: 0, by: 0, cx: 0, cy: 0 };
    const tx = tip?.x ?? S.x, ty = tip?.y ?? S.y;
    const bx = dir ? tx - dir.x * 80 : S.x + 50, by = dir ? ty - dir.y * 80 : S.y;
    return { tx, ty, bx, by, cx: dir ? tx - dir.x * 6 : tx, cy: dir ? ty - dir.y * 6 : ty };
  });
  function svgPoint(ev: PointerEvent) {
    const m = arm!.getScreenCTM()!;
    const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }
  let arm = $state<SVGSVGElement>();
  let timer: ReturnType<typeof setInterval> | undefined;
  $effect(() => () => clearInterval(timer));

  function down(ev: PointerEvent) {
    if (!arm || done || flash && !dragging && tool !== 'nadel') return;
    const q = svgPoint(ev);
    msg = '';
    if (tool === 'stau') { askStau = true; return; }
    if (tool === 'tasten') {
      if (spray) retouched = true;
      feel = { x: q.x, y: q.y, t: Date.now() };
      setTimeout(() => (feel = null), 1500);
      const near = dist(pts, q.x, q.y, roll) <= 9 || dist(art, q.x, q.y) <= 6;
      msg = dist(art, q.x, q.y) <= 6 ? 'Hier pulsiert es: eine Arterie!' : near ? (stau === 'ok' ? 'Prall gefüllte Vene, gut tastbar.' : 'Eine Vene, aber schlecht gefüllt.') : 'Hier tastest du keine Vene.';
      return;
    }
    if (tool === 'spray') {
      spray = q; retouched = false; left = cfg.wait;
      clearInterval(timer);
      timer = setInterval(() => { left = Math.max(0, left - 1); if (!left) clearInterval(timer); }, 1000);
      return;
    }
    if (tool === 'daumen') { thumb = q; return; }
    // Kanüle
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
    dragging = true;
    if (!S) {
      S = q; dir = null; s = 0; base = 0; D0 = q; usedAngle = angle;
      early = !spray || left > 0;
      offSite = !spray || Math.hypot(q.x - spray.x, q.y - spray.y) > 24;
      tensioned = !!thumb && thumb.x > q.x + 10 && Math.hypot(thumb.x - q.x, thumb.y - q.y) < 80;
    } else { base = s; D0 = q; }
  }
  function move(ev: PointerEvent) {
    if (!dragging || !S || !D0 || done) return;
    const q = svgPoint(ev);
    if (!dir) {
      const dx = q.x - S.x, dy = q.y - S.y, n = Math.hypot(dx, dy);
      if (n < 6) return;
      dir = { x: dx / n, y: dy / n };
      wrongDir = dir.x > 0.3; // Richtung Hand = gegen den Blutfluss
      if (!tensioned && Math.random() < 0.6) roll = (Math.random() < 0.5 ? -1 : 1) * (W + 3 + Math.random() * 5);
    }
    s = Math.max(0, base + (q.x - D0.x) * dir.x + (q.y - D0.y) * dir.y);
    if (inArtery && !arterial) { arterial = true; flash = true; siteId = 'arterie'; dragging = false; return; }
    if (inVein && flashAt == null) {
      flashAt = s;
      const v = cfg.veins.reduce((b, x) => (Math.hypot(x.x - tip!.x, x.y - tip!.y) < Math.hypot(b.x - tip!.x, b.y - tip!.y) ? x : b));
      siteId = v.id;
      setTimeout(() => (flash = true), 300);
    }
    if (flashAt != null && depth >= VD + R && lateral <= W) {
      dragging = false; done = 'through'; flash = true;
      const grow = setInterval(() => { hema = Math.min(18, hema + 1.5); if (hema >= 18) clearInterval(grow); }, 70);
    }
  }
  function up() { dragging = false; }

  function retry() {
    corrections++; S = null; dir = null; s = 0; flashAt = null; flash = false; msg = 'Zurückgezogen. Neu ansetzen, ohne nochmal zu tasten.';
  }
  let picked = $state<string[]>([]);
  let orderItems = $state<string[]>([]);
  let catheter = $state(false);
  function vorschieben() {
    catheter = inVein && flashAt != null && s - flashAt >= cfg.catheter;
    done = 'in';
    if (catheter) orderItems = shuffle(cfg.order); else finish('in');
  }
  function pick(t: string) {
    if (picked.includes(t)) return;
    picked = [...picked, t];
    if (picked.length === cfg.order.length) finish('in');
  }
  let finished = false;
  function finish(hit: 'in' | 'through' | 'short' | 'beside') {
    if (finished) return;
    finished = true;
    game.ivDone({
      stauOk: stau === 'ok', noStau: stau === 'none', vein: siteId || 'unterarm', early, retouched, offSite, wrongDir,
      tensioned, corrections, angle: usedAngle, hit: arterial ? 'artery' : hit, catheter, order: picked,
    });
  }
  const hint = $derived(
    done === 'through' ? 'Durchgestochen, es bildet sich ein Hämatom.'
    : arterial ? 'Hellrotes, pulsierendes Blut: Arterie getroffen!'
    : flash ? 'Blut in der Kammer! Noch ein kleines Stück nachschieben, dann loslassen und die Kunststoffkanüle vorschieben.'
    : S ? 'Weiter in Stichrichtung ziehen. Erneut drücken und ziehen schiebt weiter, zurückziehen geht auch.'
    : tool === 'nadel' ? 'Auf die Einstichstelle drücken und in Stichrichtung ziehen (zum Herzen hin).'
    : 'Werkzeug wählen und am Arm benutzen. Reihenfolge und Hygiene entscheidest du.',
  );
</script>

<p class="hint ivhint">{hint}</p>
<div class="iv-wrap">
  <svg bind:this={arm} class="iv-arm" viewBox="0 0 300 150" role="img" aria-label="Unterarm von oben"
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <path class="skin" d="M4 50 Q120 40 240 52 L298 46 Q302 84 298 124 L240 118 Q120 132 4 124 Z" />
    <path class="crease" d="M58 46 Q62 86 58 124" />
    <g class="veins" class:filled={stau === 'ok'} class:tight={stau === 'tight'} style="transform: translateY({roll}px)">
      {#each VEINS as d, i (i)}<path {d} bind:this={probe[i]} />{/each}
    </g>
    <path class="artery" d={ARTERY} bind:this={probeA} />
    {#if stau !== 'none'}<rect class="band" class:tightband={stau === 'tight'} x="18" y="40" width="11" height="90" rx="3" />{/if}
    {#if spray}<circle class="wet" cx={spray.x} cy={spray.y} r="24" />{/if}
    {#if feel}<circle class="feel" cx={feel.x} cy={feel.y} r="9" />{/if}
    {#if thumb}<text class="thumb" x={thumb.x - 8} y={thumb.y + 6}>👍</text>{/if}
    {#if hema}<ellipse class="hema" cx={tip?.x ?? 0} cy={tip?.y ?? 0} rx={hema * 1.4} ry={hema} />{/if}
    {#if S}
      <line class="needle" x1={ng.bx} y1={ng.by} x2={ng.tx} y2={ng.ty} />
      <line class="cath" x1={ng.bx} y1={ng.by} x2={ng.cx} y2={ng.cy} />
      <rect class="chamber" class:blood={flash} class:arterial x={ng.bx - 7} y={ng.by - 5} width="14" height="10" rx="2" />
      <circle class="spot" cx={S.x} cy={S.y} r="2.5" />
    {/if}
  </svg>
  {#if S}
    <svg class="side" viewBox="0 0 120 60" aria-label="Seitenansicht">
      <rect x="0" y="10" width="120" height="50" class="tissue" />
      <line x1="0" y1="10" x2="120" y2="10" class="skinline" />
      <rect x="0" y={10 + (VD - R) * 6} width="120" height={R * 12} class="lumen" class:off={lateral > W} class:hit={inVein} />
      <line x1="20" y1="10" x2={20 + s * Math.cos(rad) * 1.6} y2={10 + depth * 6} class="needle" />
    </svg>
  {/if}
</div>
{#if msg}<p class="hint warn">{msg}</p>{/if}

<div class="iv-controls">
{#if prompt.result}
  <div class="place-result">
    {#each prompt.result.lines as l, i (i)}<div class="op {l.ok ? 'right' : 'wrong'}">{l.ok ? '✓' : '✗'}&nbsp;{l.text}</div>{/each}
  </div>
  <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
{:else if orderItems.length}
  <p class="hint">Kanüle liegt. Was jetzt, in welcher Reihenfolge?</p>
  <div class="order-picked">{#each picked as t, i (t)}<div class="op"><span class="n">{i + 1}.</span><span>{t}</span></div>{/each}</div>
  <div class="options">{#each orderItems.filter((t) => !picked.includes(t)) as t (t)}<button class="opt" onclick={() => pick(t)}>{t}</button>{/each}</div>
{:else if done === 'through'}
  <button class="btn wide accent" onclick={() => finish('through')}>Abbrechen, abdrücken</button>
{:else if arterial}
  <button class="btn wide accent" onclick={() => finish('in')}>Sofort raus, fest abdrücken</button>
{:else if askStau}
  <div class="options">
    <button class="opt" onclick={() => { stau = 'ok'; askStau = false; }}>Venös stauen: Radialispuls bleibt tastbar</button>
    <button class="opt" onclick={() => { stau = 'tight'; askStau = false; }}>Richtig fest, bis kein Puls mehr tastbar ist</button>
  </div>
{:else if S && !dragging}
  <div class="row">
    <button class="btn accent" disabled={!flash} onclick={vorschieben}>Kunststoffkanüle vorschieben</button>
    {#if !flash && corrections < 2}<button class="btn small ghost" onclick={retry}>Zurückziehen, neu ansetzen</button>{/if}
    {#if !flash}<button class="btn small ghost" onclick={() => finish(s > 0 ? 'beside' : 'short')}>Abbrechen</button>{/if}
  </div>
{:else if !S}
  <div class="tools">
    {#each [['stau', '🎗️', 'Stauband'], ['tasten', '☝️', 'Tasten'], ['spray', '🧴', 'Desinfizieren'], ['daumen', '👍', 'Haut straffen'], ['nadel', '💉', 'Kanüle']] as [k, ic, l] (k)}
      <button class="tool {tool === k ? 'active' : ''}" onclick={() => { tool = k as Tool; msg = ''; }}><span>{ic}</span>{l}</button>
    {/each}
  </div>
  {#if spray}<p class="hint small">{left > 0 ? `Einwirkzeit: noch ${left} s` : 'Desinfektion trocken.'}</p>{/if}
  {#if tool === 'nadel'}
    <div class="angles">Stichwinkel:
      {#each [10, 20, 30, 45] as a (a)}<button class="chip {angle === a ? 'active' : ''}" onclick={() => (angle = a)}>{a}°</button>{/each}
    </div>
  {/if}
{/if}
</div>

<style>
  .iv-wrap { position: relative; }
  .ivhint { min-height: 4.4em; }
  .iv-controls { min-height: 170px; }
  .iv-arm { display: block; width: 100%; max-width: 460px; margin: 6px auto; touch-action: none; user-select: none; -webkit-user-select: none; }
  .side { position: absolute; right: 4px; top: 4px; width: 34%; max-width: 150px; border-radius: 8px; border: 1px solid #0003; background: #f0cdb2; }
  .skin { fill: #ecc6a6; stroke: #b48d72; }
  .crease { fill: none; stroke: #b48d72; stroke-width: 1; opacity: 0.6; }
  .veins { transition: transform 0.4s; }
  .veins path { fill: none; stroke: #6c86c4; stroke-width: 3; opacity: 0.3; stroke-linecap: round; }
  .veins.filled path { stroke-width: 6; opacity: 0.75; }
  .veins.tight path { stroke-width: 4; opacity: 0.45; }
  .artery { fill: none; stroke: #c0504d; stroke-width: 2.5; opacity: 0.45; animation: puls 0.85s ease-in-out infinite; }
  @keyframes puls { 50% { stroke-width: 4; opacity: 0.8; } }
  .band { fill: #3f8cff; }
  .band.tightband { fill: #ff5a4e; }
  .wet { fill: #9fd8ff44; stroke: #9fd8ff; stroke-width: 1; }
  .feel { fill: none; stroke: #fff; stroke-width: 1.5; stroke-dasharray: 2 2; }
  .thumb { font-size: 16px; }
  .hema { fill: #5b1f3a; opacity: 0.6; }
  .needle { stroke: #cfd6de; stroke-width: 2.5; stroke-linecap: round; }
  .cath { stroke: #f2c94c; stroke-width: 4; stroke-linecap: round; opacity: 0.85; }
  .chamber { fill: #ffffffcc; stroke: #888; }
  .chamber.blood { fill: #8a1c1c; }
  .chamber.arterial { fill: #ff2b2b; animation: puls 0.6s infinite; }
  .spot { fill: #fff; }
  .tissue { fill: #f0cdb2; }
  .skinline { stroke: #b48d72; stroke-width: 1.5; }
  .lumen { fill: #6c86c4; opacity: 0.8; }
  .lumen.off { opacity: 0.15; }
  .lumen.hit { fill: #8a2b2b; }
  .tools { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 8px 0; }
  .tool { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 2px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg2); font-size: 11px; color: inherit; }
  .tool span { font-size: 22px; }
  .tool.active { border-color: var(--accent2); box-shadow: 0 0 0 2px var(--accent2) inset; }
  .angles { display: flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: wrap; font-size: 14px; }
  .angles .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg2); color: inherit; }
  .angles .chip.active { border-color: var(--accent2); box-shadow: 0 0 0 2px var(--accent2) inset; }
  .warn { color: var(--warn); }
  .small { font-size: 13px; }
</style>
