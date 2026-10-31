<script lang="ts">
  /* Blutdruck manuell messen: Manschette aufpumpen, Ventil fein aufdrehen, Korotkow-Töne hören.
     Erster Ton = systolisch, Verschwinden der Töne = diastolisch.
     Erschwert durch: Störgeräusche (Reiben, Monitor, Sirene, Patient spricht/hustet),
     eine mögliche auskultatorische Lücke, schwergängiges Ventil und unregelmäßigen Puls bei Vorhofflimmern. */
  import type { Game } from '../lib/engine/game';
  import type { Prompt } from '../lib/engine/state';

  let { game, prompt }: { game: Game; prompt: Extract<Prompt, { kind: 'gauge' }> } = $props();
  const cfg = $derived(prompt.cfg);

  let p = $state(0);
  let valve = $state(0); // Ventilstellung 0–10
  let dump = $state(false); // ganz auf
  let jitter = $state(0);
  let sound = $state(true);
  let say = $state(''); // Sprechblase des Patienten / der Umgebung
  let read = $state<{ sys?: { p: number; t: number }; dia?: { p: number; t: number } }>({});
  let maxP = 0;
  let maskUntil = 0; // solange jemand spricht, sind die Töne leiser
  // Ventil ist bei jeder Manschette etwas anders, manchmal leckt sie leicht
  const sens = 0.75 + Math.random() * 0.3;
  const leak = Math.random() < 0.4 ? 0.3 + Math.random() * 0.5 : 0;
  const rate = () => (dump ? cfg.rates.open : sens * valve * 0.6 + leak);

  /* ---------- Anzeige „Was höre ich?“: Ausschläge der letzten Sekunden */
  type Blip = { t: number; a: number; w: number };
  let blips = $state<Blip[]>([]);
  let now = $state(performance.now());
  const blip = (a: number, w = 1) => { blips = [...blips.filter((b) => now - b.t < 3000), { t: performance.now(), a, w }]; };

  /* ---------- Töne */
  let audio: AudioContext | null = null;
  let noiseBuf: AudioBuffer | null = null;
  function ctx() {
    if (!audio && typeof AudioContext !== 'undefined') {
      audio = new AudioContext();
      noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    void audio?.resume();
    return audio;
  }
  function tone(f: number, a: number, len: number, type: OscillatorType = 'sine', at = 0) {
    if (!sound || !audio) return;
    const t = audio.currentTime + at;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + len + 0.02);
    return o;
  }
  function noise(a: number, len: number, lo: number, hi: number) {
    if (!sound || !audio || !noiseBuf) return;
    const t = audio.currentTime;
    const src = audio.createBufferSource();
    src.buffer = noiseBuf;
    const bp = audio.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (lo + hi) / 2;
    bp.Q.value = (lo + hi) / 2 / (hi - lo);
    const g = audio.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(bp).connect(g).connect(audio.destination);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.02);
  }
  /** Ein „Tock“: echte Korotkow-Töne sind sehr tief, Laptop- und Handylautsprecher geben unter ~150 Hz
      kaum etwas wieder. Deshalb Grundton + Obertöne + kurzer Klick, dumpf = tiefer und weicher. */
  function tock(a: number, dull = false) {
    const f = dull ? 95 : 120;
    tone(f, a, 0.12);
    tone(f * 2, a * 0.8, 0.09);
    tone(f * 3, a * (dull ? 0.2 : 0.45), 0.06);
    noise(a * (dull ? 0.4 : 0.8), 0.04, dull ? 150 : 200, dull ? 450 : 800);
  }
  /** Korotkow-Ton je nach Phase: I leise klopfend, II mit Rauschen, III kräftig, IV dumpf */
  function korotkow(pr: number) {
    const { sys, dia } = prompt;
    const span = Math.max(10, sys - dia);
    const x = (sys - pr) / span; // 0 = systolisch, 1 = diastolisch
    const masked = performance.now() < maskUntil ? 0.35 : 1;
    let a: number;
    if (x < 0.15) a = 0.18 + x * 2.5; // Phase I: leise, wird lauter
    else if (x < 0.4) a = 0.45; // Phase II
    else if (x < 0.8) a = 0.75; // Phase III
    else a = 0.35; // Phase IV: dumpf, leiser
    a *= masked;
    tock(a, x >= 0.8);
    if (x >= 0.15 && x < 0.4) noise(a * 0.5, 0.14, 250, 700);
    blip(a);
  }

  /* ---------- Störungen */
  type Distraction = () => void;
  const lines = ['„Und, wie hoch ist er?“', '„Ist das schlimm?“', '„Mir ist so komisch …“', '„Das drückt aber fest!“', '„Bei meinem Hausarzt war er immer gut.“'];
  const speak = (text: string) => {
    say = text;
    maskUntil = performance.now() + 2200;
    setTimeout(() => (say = ''), 2200);
    try {
      if (sound && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text.replace(/[„“…]/g, ''));
        u.lang = 'de-DE';
        u.volume = 0.6;
        speechSynthesis.speak(u);
      }
    } catch { /* kein Ton, Sprechblase reicht */ }
    blip(0.5, 6);
  };
  const DISTRACT: Distraction[] = [
    // Schlauch reibt am Stethoskop: klingt fast wie ein Ton
    () => { noise(0.7, 0.1, 180, 700); tone(140, 0.3, 0.08); blip(0.55); },
    () => { noise(0.6, 0.1, 180, 700); setTimeout(() => { noise(0.5, 0.1, 180, 700); blip(0.4); }, 260); blip(0.45); },
    // Monitor piept
    () => { tone(960, 0.12, 0.12, 'square'); tone(960, 0.12, 0.12, 'square', 0.25); blip(0.2, 2); },
    // Sirene in der Ferne
    () => {
      if (!sound || !audio) return;
      const t = audio.currentTime;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'triangle';
      for (let i = 0; i < 6; i++) o.frequency.setValueAtTime(i % 2 ? 440 : 587, t + i * 0.5);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 1);
      g.gain.linearRampToValueAtTime(0, t + 3);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 3.1);
      say = '🚨 Sirene draußen';
      setTimeout(() => (say = ''), 2500);
      blip(0.15, 10);
    },
    // Patient spricht
    () => speak(lines[Math.floor(Math.random() * lines.length)]),
    // Husten
    () => { noise(0.6, 0.25, 300, 1500); say = '„*hust*“'; maskUntil = performance.now() + 600; setTimeout(() => (say = ''), 900); blip(0.7, 4); },
  ];

  /* ---------- Druckverlauf, Herzschläge, Störungen */
  $effect(() => {
    if (prompt.result) return;
    let last = performance.now();
    let nextBeat = last + 300;
    let nextNoise = last + 2500 + Math.random() * 3000;
    let raf = 0;
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      now = t;
      if (p > 0) p = Math.max(0, p - rate() * dt);
      if (p === 0) dump = false;
      jitter *= Math.exp(-dt * 8);
      if (t >= nextBeat) {
        const base = 60000 / prompt.hr;
        nextBeat = t + (prompt.irregular ? base * (0.65 + Math.random() * 0.7) : base);
        if (p > prompt.dia - 12 && p < prompt.sys + 20) jitter = 2.2;
        const inGap = !!prompt.gap && p < prompt.gap[0] && p > prompt.gap[1];
        if (p > prompt.dia && p < prompt.sys && !inGap) korotkow(p);
      }
      if (t >= nextNoise) {
        nextNoise = t + 2500 + Math.random() * 4000;
        if (p > 0) DISTRACT[Math.floor(Math.random() * DISTRACT.length)]();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); try { speechSynthesis.cancel(); } catch { /* egal */ } };
  });

  function pump() {
    ctx();
    dump = false;
    p = Math.min(cfg.max, p + cfg.pumpStep);
    maxP = Math.max(maxP, p);
    noise(0.15, 0.15, 400, 1200);
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
<p class="hint small">🎧 Mit Kopfhörern hört man die Töne am besten. Tippe auf 🔊 für einen Testton.</p>

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
  {#if say}<div class="bubble">{say}</div>{/if}
</div>

<svg class="ear" viewBox="0 0 300 34" preserveAspectRatio="none" aria-label="Was du im Stethoskop hörst">
  <line x1="0" y1="30" x2="300" y2="30" class="ear-base" />
  {#each blips as b, i (i)}
    {@const x = 300 - ((now - b.t) / 3000) * 300}
    {#if x > 0}<rect x={x} y={30 - b.a * 28} width={2 + b.w * 3} height={b.a * 28} class="ear-blip" />{/if}
  {/each}
</svg>

{#if prompt.result}
  <div class="place-result">
    {#each prompt.result.lines as l, i (i)}<div class="op {l.ok ? 'right' : 'wrong'}">{l.ok ? '✓' : '✗'}&nbsp;{l.text}</div>{/each}
  </div>
  <button class="btn wide accent" onclick={() => game.next()}>Weiter</button>
{:else}
  <div class="gauge-read">
    <button class="btn small {read.sys ? 'set' : ''}" onclick={() => mark('sys')}>Systole{#if read.sys}: {Math.round(read.sys.p)}{/if}</button>
    <button class="btn small {read.dia ? 'set' : ''}" disabled={!read.sys} onclick={() => mark('dia')}>Diastole{#if read.dia}: {Math.round(read.dia.p)}{/if}</button>
    <button class="btn small ghost" onclick={() => { sound = !sound; if (sound && ctx()) tock(0.6); }} aria-label="Ton an/aus">{sound ? '🔊' : '🔇'}</button>
  </div>
  <label class="valve">
    <span class="muted">Ventil</span>
    <input type="range" min="0" max="10" step="0.1" bind:value={valve} oninput={() => (dump = false)} aria-label="Ventil aufdrehen" />
    <span class="muted">{valve < 0.2 ? 'zu' : 'offen'}</span>
  </label>
  <div class="valve">
    <button class="btn small ghost" onclick={() => (valve = Math.max(0, +(valve - 0.5).toFixed(1)))} aria-label="Ventil etwas zu">− zu</button>
    <button class="btn small ghost" onclick={() => (valve = Math.min(10, +(valve + 0.5).toFixed(1)))} aria-label="Ventil etwas auf">auf +</button>
  </div>
  <div class="row">
    <button class="btn accent pump" onclick={pump}>Pumpen</button>
    <button class="btn ghost" onclick={() => (dump = true)}>Ablassen</button>
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
  .bubble { position: absolute; left: 50%; top: -6px; transform: translateX(-50%); background: #fff; color: #111; font-size: 13px; padding: 4px 10px; border-radius: 12px; white-space: nowrap; box-shadow: 0 2px 8px #0006; }
  .ear { display: block; width: 100%; max-width: 300px; height: 34px; margin: 4px auto; background: #10161d; border-radius: 8px; }
  .ear-base { stroke: #2d3a48; stroke-width: 1; }
  .ear-blip { fill: #6fd3a0; }
  .gauge-read { display: flex; gap: 6px; justify-content: center; margin: 6px 0; }
  .gauge-read :global(.btn.set) { background: #173426; color: var(--good); }
  .valve { display: flex; gap: 10px; align-items: center; justify-content: center; margin: 6px 0; font-size: 14px; }
  .valve input { flex: 1; max-width: 220px; }
  .pump { flex: 1; }
</style>
