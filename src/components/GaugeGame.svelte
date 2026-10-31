<script lang="ts">
  /* Blutdruck manuell messen: Manschette aufpumpen, Ventil öffnen, Korotkow-Töne hören.
     Erster Ton = systolisch, Verschwinden der Töne = diastolisch. */
  import type { Game } from '../lib/engine/game';
  import type { Prompt } from '../lib/engine/state';

  let { game, prompt }: { game: Game; prompt: Extract<Prompt, { kind: 'gauge' }> } = $props();
  const cfg = $derived(prompt.cfg);

  type Valve = 'zu' | 'slow' | 'fast' | 'open';
  let p = $state(0);
  let valve = $state<Valve>('zu');
  let jitter = $state(0);
  let tock = $state(false);
  let sound = $state(true);
  let read = $state<{ sys?: { p: number; t: number }; dia?: { p: number; t: number } }>({});
  let maxP = 0;

  let audio: AudioContext | null = null;
  function playTock() {
    if (!sound || !audio) return;
    const t = audio.currentTime;
    for (const [f, a] of [[65, 0.7], [130, 0.25]] as const) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.13);
    }
  }

  // Druckverlauf und Herzschläge
  $effect(() => {
    if (prompt.result) return;
    let last = performance.now();
    let nextBeat = last + 300;
    let raf = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const rate = valve === 'zu' ? 0 : cfg.rates[valve];
      p = Math.max(0, p - rate * dt);
      jitter *= Math.exp(-dt * 8);
      if (now >= nextBeat) {
        nextBeat = now + 60000 / prompt.hr;
        if (p > prompt.dia - 12 && p < prompt.sys + 20) jitter = 2.2;
        if (p > prompt.dia && p < prompt.sys) {
          tock = true;
          playTock();
          setTimeout(() => (tock = false), 140);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  function pump() {
    if (!audio && typeof AudioContext !== 'undefined') audio = new AudioContext();
    void audio?.resume();
    valve = 'zu';
    p = Math.min(cfg.max, p + cfg.pumpStep);
    maxP = Math.max(maxP, p);
  }
  const mark = (k: 'sys' | 'dia') => {
    if (k === 'dia' && !read.sys) return;
    read = { ...read, [k]: { p, t: performance.now() } };
  };
  function done() {
    const s = read.sys!, d = read.dia!;
    const secs = Math.max(0.1, (d.t - s.t) / 1000);
    game.gaugeDone({ sys: s.p, dia: d.p, maxP, rate: Math.max(0, (s.p - d.p) / secs) });
  }

  // Zifferblatt: 0 unten links, Maximum unten rechts (270°)
  const ang = (v: number) => ((135 + (v / cfg.max) * 270) * Math.PI) / 180;
  const pt = (v: number, r: number) => [100 + r * Math.cos(ang(v)), 100 + r * Math.sin(ang(v))];
  const ticks = $derived(Array.from({ length: cfg.max / 10 + 1 }, (_, i) => i * 10));
  const needle = $derived(pt(Math.min(cfg.max, p + jitter), 74));
</script>

<p class="hint">{cfg.task}</p>

<div class="gauge-wrap">
  <svg class="gauge" viewBox="0 0 200 200" role="img" aria-label="Manometer {Math.round(p)} mmHg">
    <circle cx="100" cy="100" r="94" class="g-rim" />
    <circle cx="100" cy="100" r="88" class="g-face" />
    {#each ticks as v (v)}
      {@const a = pt(v, 84)}
      {@const b = pt(v, v % 50 ? 78 : 72)}
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} class="g-tick" stroke-width={v % 50 ? 1 : 2} />
      {#if v % 50 === 0}
        {@const l = pt(v, 60)}
        <text x={l[0]} y={l[1] + 4} text-anchor="middle" class="g-num">{v}</text>
      {/if}
    {/each}
    <text x="100" y="140" text-anchor="middle" class="g-unit">mmHg</text>
    <line x1="100" y1="100" x2={needle[0]} y2={needle[1]} class="g-needle" />
    <circle cx="100" cy="100" r="6" class="g-hub" />
  </svg>
  <div class="steth {tock ? 'on' : ''}" aria-live="off">🩺<span>{tock ? 'Tock' : ''}</span></div>
</div>

{#if prompt.result}
  <div class="place-result">
    {#each prompt.result.lines as l, i (i)}<div class="op {l.ok ? 'right' : 'wrong'}">{l.ok ? '✓' : '✗'}&nbsp;{l.text}</div>{/each}
  </div>
  <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
{:else}
  <div class="gauge-read">
    <button class="btn small {read.sys ? 'set' : ''}" onclick={() => mark('sys')}>Systole{#if read.sys}: {Math.round(read.sys.p)}{/if}</button>
    <button class="btn small {read.dia ? 'set' : ''}" disabled={!read.sys} onclick={() => mark('dia')}>Diastole{#if read.dia}: {Math.round(read.dia.p)}{/if}</button>
    <button class="btn small ghost" onclick={() => (sound = !sound)} aria-label="Ton an/aus">{sound ? '🔊' : '🔇'}</button>
  </div>
  <div class="valve">
    <span class="muted">Ventil</span>
    {#each [['zu', 'zu'], ['slow', 'langsam'], ['fast', 'schneller'], ['open', 'ganz auf']] as [k, l] (k)}
      <button class="chip {valve === k ? 'active' : ''}" onclick={() => (valve = k as Valve)}>{l}</button>
    {/each}
  </div>
  <div class="row">
    <button class="btn accent pump" onclick={pump}>Pumpen</button>
    <button class="btn" disabled={!read.sys || !read.dia} onclick={done}>Fertig</button>
  </div>
{/if}

<style>
  .gauge-wrap { position: relative; max-width: 210px; margin: 6px auto; }
  .gauge { display: block; width: 100%; }
  .g-rim { fill: #9aa5b1; }
  .g-face { fill: #f6f4ee; }
  .g-tick { stroke: #222; }
  .g-num { font-size: 12px; fill: #222; font-weight: 600; }
  .g-unit { font-size: 10px; fill: #555; }
  .g-needle { stroke: #d32f2f; stroke-width: 2.5; stroke-linecap: round; }
  .g-hub { fill: #333; }
  .steth { position: absolute; right: -4px; top: 0; font-size: 26px; opacity: 0.45; transition: transform 0.08s, opacity 0.08s; display: flex; flex-direction: column; align-items: center; }
  .steth span { font-size: 12px; font-weight: 700; color: var(--hr); min-height: 1em; }
  .steth.on { opacity: 1; transform: scale(1.18); }
  .gauge-read { display: flex; gap: 6px; justify-content: center; margin: 6px 0; }
  .gauge-read :global(.btn.set) { background: #173426; color: var(--good); }
  .valve { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; margin: 6px 0; font-size: 14px; }
  .valve .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg2); }
  .valve .chip.active { border-color: var(--accent2); box-shadow: 0 0 0 2px var(--accent2) inset; }
  .pump { flex: 1; }
</style>
