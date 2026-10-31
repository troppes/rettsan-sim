<script lang="ts">
  /* Gezeichnetes Patientengesicht: Aussehen aus den Falldaten, Ausdruck aus Stimmung,
     Bewusstsein und Hautzeichen (blass, schwitzig, gerötet, zyanotisch). */
  import type { FaceState } from '../lib/engine/state';
  import type { Look } from '../lib/types';

  let { look, face, size = 56 }: { look: Look; face: FaceState; size?: number } = $props();

  /* Farben mischen: mix('#rrggbb', '#rrggbb', Anteil der zweiten Farbe) */
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hex = (c: number[]) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = (h: string) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  const child = $derived(look.age === 'child');
  const skin = $derived.by(() => {
    let s = look.skin;
    if (face.pale) s = mix(s, '#e9e6df', 0.45);
    if (face.cyanotic) s = mix(s, '#9aaad6', 0.3);
    return s;
  });
  const shadow = $derived(mix(skin, '#000000', 0.18));
  const line = $derived(mix(skin, '#5a3a2a', 0.45));
  const brow = $derived(lum(look.hair) > 0.7 ? mix(look.hair, '#000000', 0.35) : look.hair);
  const lips = $derived(face.cyanotic ? '#5d6fb3' : mix(look.skin, '#b04a44', 0.55));
  const shirt = $derived(child ? '#f0b6c4' : look.sex === 'f' ? '#a8607a' : '#5b7ea3');

  // Ausdruck: e von −1 (sehr schlecht) bis +1 (gut)
  const m = $derived(face.mood);
  const e = $derived(m == null ? 0 : (m - 5) / 5);
  const angry = $derived(m != null && m <= 2);
  const worried = $derived(m != null && m > 2 && m <= 4);
  const crying = $derived(child && m != null && m <= 3 && face.eyes === 'open');

  const eyeY = $derived(child ? 57 : 53);
  const browY = $derived(child ? 47 : 44);
  const mouthY = $derived(child ? 72 : 70);
  const eyeR = $derived(child ? [6, 5, 3] : [5, 3.6, 2.4]);

  // Augenbrauen: innen tiefer bei Ärger, höher bei Sorge
  const browInner = $derived(angry ? 3.5 : worried ? -3.5 : e > 0.4 ? -1 : 0);
  const browOuter = $derived(angry ? -1.5 : worried ? 1.5 : e > 0.4 ? -1 : 0);

  const mouth = $derived.by(() => {
    const y = mouthY;
    if (face.eyes !== 'open') return { d: `M45 ${y} Q50 ${y + 2.5} 55 ${y} Q50 ${y + 0.8} 45 ${y}`, fill: true };
    if (angry) return { d: `M43 ${y + 1} Q50 ${y - 2} 57 ${y + 1}`, fill: false };
    if (e > 0.5) return { d: `M41 ${y - 1} Q50 ${y + 8} 59 ${y - 1} Q50 ${y + 2} 41 ${y - 1}`, fill: true };
    if (crying) return { d: `M43 ${y + 2} Q50 ${y - 4} 57 ${y + 2} Q50 ${y + 1} 43 ${y + 2}`, fill: true };
    const c = e * 8;
    return { d: `M42 ${y} Q50 ${y + c} 58 ${y}`, fill: false };
  });

  // Locken als Kreise am oberen Kopfrand
  const curls = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (1.08 + (0.84 * i) / 8);
    return { x: 50 + 28 * Math.cos(a), y: 50 + 31 * Math.sin(a) };
  });

  const label = $derived(
    face.eyes === 'closed' ? 'Augen geschlossen' : face.eyes === 'half' ? 'schläfrig' : angry ? 'verärgert' : worried ? 'besorgt' : e > 0.4 ? 'entspannt' : 'angespannt',
  );
</script>

<svg class="face" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Patient: {label}">
  <title>Patient: {label}</title>
  <!-- Haare hinten -->
  {#if look.hairStyle === 'long'}
    <path fill={look.hair} d="M20 52 Q18 18 50 17 Q82 18 80 52 L84 92 Q70 96 64 86 L36 86 Q30 96 16 92 Z" />
  {:else if look.hairStyle === 'bob'}
    <path fill={look.hair} d="M20 50 Q18 17 50 17 Q82 17 80 50 L81 74 Q73 79 70 70 L30 70 Q27 79 19 74 Z" />
  {:else if look.hairStyle === 'bun'}
    <circle fill={look.hair} cx="50" cy="17" r="9" />
  {/if}

  <!-- Schultern, Hals, Ohren, Kopf -->
  <path fill={shirt} d="M10 100 Q12 85 38 82 L62 82 Q88 85 90 100 Z" />
  <rect fill={shadow} x="43" y="74" width="14" height="12" />
  <ellipse fill={skin} cx={child ? 21 : 23} cy={eyeY + 3} rx="4" ry="6.5" />
  <ellipse fill={skin} cx={child ? 79 : 77} cy={eyeY + 3} rx="4" ry="6.5" />
  <ellipse fill={skin} cx="50" cy={child ? 56 : 52} rx={child ? 30 : 27} ry={child ? 29 : 32} />

  <!-- Hautzeichen -->
  {#if face.flushed}
    <circle fill="#e8473a" opacity="0.38" cx="36" cy={mouthY - 6} r="6.5" />
    <circle fill="#e8473a" opacity="0.38" cx="64" cy={mouthY - 6} r="6.5" />
  {/if}

  <!-- Falten -->
  {#if look.age === 'old'}
    <g fill="none" stroke={line} stroke-width="0.7" opacity="0.6" stroke-linecap="round">
      <path d="M38 35 Q50 33 62 35 M40 38.5 Q50 37 60 38.5" />
      <path d="M30 51 l-3 -1 M30 54 l-3 1 M70 51 l3 -1 M70 54 l3 1" />
      <path d="M42 61 Q39 66 41 71 M58 61 Q61 66 59 71" />
    </g>
  {:else if look.age === 'mid'}
    <path fill="none" stroke={line} stroke-width="0.6" opacity="0.4" d="M40 37 Q50 35.5 60 37" />
  {/if}

  <!-- Augen -->
  {#each [39, 61] as x (x)}
    {#if face.eyes === 'open'}
      <ellipse fill="#fff" cx={x} cy={eyeY} rx={eyeR[0]} ry={eyeR[1] + (worried ? 0.6 : 0)} />
      <circle fill="#3b2a1a" cx={x} cy={eyeY + 0.3} r={eyeR[2]} />
      <circle fill="#fff" cx={x + 0.9} cy={eyeY - 0.6} r="0.8" />
      {#if angry}<path fill={skin} d="M{x - 6} {eyeY - 4.5} L{x + 6} {eyeY - 4.5} L{x + (x < 50 ? 6 : -6)} {eyeY - 1.2} Z" />{/if}
    {:else if face.eyes === 'half'}
      <ellipse fill="#fff" cx={x} cy={eyeY + 0.8} rx={eyeR[0]} ry="1.6" />
      <circle fill="#3b2a1a" cx={x} cy={eyeY + 1.2} r="1.4" />
      <path fill="none" stroke={line} stroke-width="1" d="M{x - 5.5} {eyeY} Q{x} {eyeY - 1} {x + 5.5} {eyeY}" />
    {:else}
      <path fill="none" stroke={line} stroke-width="1.1" stroke-linecap="round" d="M{x - 5} {eyeY} Q{x} {eyeY + 2.5} {x + 5} {eyeY}" />
    {/if}
  {/each}
  {#if crying}
    <path fill="#8fd0ff" d="M36 {eyeY + 5} q-1.6 3 0 4.2 q1.6 -1.2 0 -4.2 Z M64 {eyeY + 5} q-1.6 3 0 4.2 q1.6 -1.2 0 -4.2 Z" />
  {/if}

  <!-- Augenbrauen -->
  <g fill="none" stroke={brow} stroke-width={child ? 1.6 : 2.4} stroke-linecap="round">
    <path d="M32 {browY + browOuter} Q38 {browY - 2 + (browOuter + browInner) / 2} 45 {browY + browInner}" />
    <path d="M55 {browY + browInner} Q62 {browY - 2 + (browOuter + browInner) / 2} 68 {browY + browOuter}" />
  </g>

  <!-- Nase -->
  <path fill="none" stroke={line} stroke-width="0.9" stroke-linecap="round" d={child ? `M49 ${eyeY + 8} Q51 ${eyeY + 9} 52 ${eyeY + 8}` : `M50 ${eyeY + 2} Q47 ${eyeY + 10} 49.5 ${eyeY + 11} Q51.5 ${eyeY + 11.5} 53 ${eyeY + 10}`} />

  <!-- Bart -->
  {#if look.beard === 'stubble'}
    <path fill={look.hair} opacity="0.3" d="M26 60 Q28 86 50 86 Q72 86 74 60 Q68 76 50 78 Q32 76 26 60 Z M42 66 Q50 63 58 66 Q50 65.5 42 66 Z" />
  {:else if look.beard === 'mustache'}
    <path fill={look.hair} d="M41 66.5 Q50 61.5 59 66.5 Q55 67.6 50 66 Q45 67.6 41 66.5 Z" />
  {/if}

  <!-- Mund -->
  {#if mouth.fill}
    <path fill={mix(lips, '#3a1414', 0.4)} stroke={lips} stroke-width="1.2" stroke-linejoin="round" d={mouth.d} />
  {:else}
    <path fill="none" stroke={lips} stroke-width="1.8" stroke-linecap="round" d={mouth.d} />
  {/if}

  <!-- Haare vorn -->
  {#if look.hairStyle === 'short'}
    <path fill={look.hair} d="M23 50 Q21 20 50 19 Q79 20 77 50 Q75 34 63 31 Q52 36 38 31 Q26 35 23 50 Z" />
  {:else if look.hairStyle === 'long'}
    <path fill={look.hair} d="M23 54 Q21 20 50 19 Q79 20 77 54 Q73 32 55 30 Q40 33 31 44 Q26 48 23 54 Z" />
  {:else if look.hairStyle === 'bob'}
    <path fill={look.hair} d="M23 50 Q21 19 50 19 Q79 19 77 50 Q76 40 71 37 Q50 33 29 37 Q24 40 23 50 Z" />
  {:else if look.hairStyle === 'bun'}
    <path fill={look.hair} d="M23 50 Q22 23 50 22 Q78 23 77 50 Q71 31 50 29 Q29 31 23 50 Z" />
  {:else if look.hairStyle === 'curly'}
    {#each curls as c, i (i)}<circle fill={look.hair} cx={c.x} cy={c.y} r="8" />{/each}
  {:else if look.hairStyle === 'bald'}
    <path fill={look.hair} d="M22 56 Q21 42 27 36 Q26 46 28 58 Z M78 56 Q79 42 73 36 Q74 46 72 58 Z" />
  {:else if look.hairStyle === 'tuft'}
    <path fill="none" stroke={look.hair} stroke-width="2.2" stroke-linecap="round" d="M50 28 Q45 20 51 18 Q56 19 53 23" />
  {/if}

  <!-- Brille -->
  {#if look.glasses}
    <g fill="#ffffff14" stroke="#2f2f2f" stroke-width="1.3">
      <rect x="31" y={eyeY - 5.5} width="16" height="11" rx="4" />
      <rect x="53" y={eyeY - 5.5} width="16" height="11" rx="4" />
      <path fill="none" d="M47 {eyeY - 1} Q50 {eyeY - 3} 53 {eyeY - 1} M31 {eyeY - 2} L24 {eyeY - 3} M69 {eyeY - 2} L76 {eyeY - 3}" />
    </g>
  {/if}

  <!-- Schweiß -->
  {#if face.sweat}
    <g fill="#bfe6ff" stroke="#7cc4ef" stroke-width="0.5">
      <path d="M33 37 q-2 3.5 0 5 q2 -1.5 0 -5 Z" />
      <path d="M66 35 q-2 3.5 0 5 q2 -1.5 0 -5 Z" />
      <path d="M73 52 q-2 3.5 0 5 q2 -1.5 0 -5 Z" />
    </g>
  {/if}
</svg>

<style>
  .face { display: block; flex: none; border-radius: 12px; background: #223244; }
</style>
