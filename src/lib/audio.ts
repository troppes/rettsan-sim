/* Gemeinsame Tonausgabe für alle Minispiele.
   Warum so: Safari (Mac und iPhone) erlaubt nur wenige AudioContexts pro Seite und gibt keinen Fehler,
   wenn es zu viele werden: Dann bleibt es einfach still. Deshalb gibt es genau einen Kontext für die ganze App.
   Außerdem:
   - Der Kontext startet erst nach einem Tippen („unlock“) und kann danach wieder pausieren
     (Tab gewechselt, Bildschirm aus, Anruf). Er wird bei jedem Tippen und beim Zurückkehren erneut gestartet.
   - iPhone: Web Audio ist im Stumm-Modus (Schalter an der Seite) still. Mit audioSession.type = "playback"
     (Safari 17+) spielt es trotzdem, wie ein Video.
   - Keine Sprachausgabe (speechSynthesis): Sie kämpft unter Safari mit Web Audio um die Audiositzung
     (auf dem Mac waren dann nur Stimmen zu hören, auf dem iPhone nur Töne). Stimmen werden hier als
     unverständliches Gemurmel synthetisiert, der Text steht in der Sprechblase. */

type AC = typeof AudioContext;
let ctx: AudioContext | null = null;
let out: AudioNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let hooked = false;

function create(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor: AC | undefined = typeof AudioContext !== 'undefined' ? AudioContext : (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch { /* ältere Browser */ }
  ctx = new Ctor();
  const comp = ctx.createDynamicsCompressor();
  const gain = ctx.createGain();
  gain.gain.value = 1.4;
  gain.connect(comp).connect(ctx.destination);
  out = gain;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Bei jedem Tippen aufrufen: legt den Kontext an bzw. weckt ihn wieder auf */
export function unlock() {
  const c = create();
  if (!c) return null;
  if (c.state !== 'running') {
    void c.resume().catch(() => {});
    // iOS: Ein kurzer stiller Puffer direkt aus dem Tippen heraus schaltet die Ausgabe frei
    const b = c.createBufferSource();
    b.buffer = c.createBuffer(1, 1, 22050);
    b.connect(c.destination);
    b.start(0);
  }
  if (!hooked) {
    hooked = true;
    const wake = () => { if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {}); };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, wake, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  }
  return c;
}

/** Läuft die Ausgabe gerade? (für die Anzeige neben dem Lautsprecher-Knopf) */
export const audioState = () => (ctx ? (ctx.state as string) : 'aus');

const ready = () => (ctx && out && ctx.state === 'running' ? ctx : null);

function env(g: GainNode, t: number, a: number, len: number, attack = 0.01) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(a, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
}

export function tone(f: number, a: number, len: number, type: OscillatorType = 'sine', at = 0) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = f;
  env(g, t, a, len);
  o.connect(g).connect(out!);
  o.start(t);
  o.stop(t + len + 0.02);
}

export function noise(a: number, len: number, lo: number, hi: number, at = 0) {
  const c = ready();
  if (!c || !noiseBuf) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (lo + hi) / 2;
  bp.Q.value = (lo + hi) / 2 / (hi - lo);
  const g = c.createGain();
  env(g, t, a, len);
  src.connect(bp).connect(g).connect(out!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + len + 0.02);
}

/** Klopfton (Korotkow): Dreieck mit fallender Tonhöhe plus Klick, damit es auch kleine Lautsprecher wiedergeben */
export function tock(a: number, dull = false) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(dull ? 170 : 240, t);
  o.frequency.exponentialRampToValueAtTime(dull ? 80 : 110, t + 0.1);
  env(g, t, a, dull ? 0.16 : 0.12, 0.008);
  o.connect(g).connect(out!);
  o.start(t);
  o.stop(t + 0.2);
  noise(a * (dull ? 0.3 : 0.6), 0.025, dull ? 300 : 500, dull ? 900 : 1600);
}

/** Sirene in der Ferne */
export function siren(len = 3) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  for (let i = 0; i < len * 2; i++) o.frequency.setValueAtTime(i % 2 ? 440 : 587, t + i * 0.5);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 1);
  g.gain.linearRampToValueAtTime(0, t + len);
  o.connect(g).connect(out!);
  o.start(t);
  o.stop(t + len + 0.1);
}

/** Menschliches Gemurmel (Silben über zwei Formantfilter), Länge grob nach Textlänge */
export function murmur(text: string, high = false) {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime;
  const syll = Math.max(3, Math.min(14, Math.round(text.length / 4)));
  const base = high ? 210 : 130;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  const f1 = c.createBiquadFilter();
  const f2 = c.createBiquadFilter();
  f1.type = f2.type = 'bandpass';
  f1.Q.value = 6;
  f2.Q.value = 8;
  const g = c.createGain();
  const mix = c.createGain();
  mix.gain.value = 0.9;
  o.connect(f1).connect(g);
  o.connect(f2).connect(g);
  g.connect(mix).connect(out!);
  g.gain.setValueAtTime(0.0001, t0);
  let t = t0;
  const vowels: [number, number][] = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870], [660, 1720]];
  for (let i = 0; i < syll; i++) {
    const d = 0.11 + Math.random() * 0.09;
    const [a1, a2] = vowels[Math.floor(Math.random() * vowels.length)];
    f1.frequency.setValueAtTime(a1, t);
    f2.frequency.setValueAtTime(a2, t);
    o.frequency.setValueAtTime(base * (1 + 0.15 * Math.sin(i * 1.7) - (i / syll) * 0.12), t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.03);
    g.gain.linearRampToValueAtTime(0.08, t + d);
    t += d + (Math.random() < 0.2 ? 0.08 : 0);
  }
  g.gain.linearRampToValueAtTime(0.0001, t + 0.05);
  o.start(t0);
  o.stop(t + 0.1);
}
