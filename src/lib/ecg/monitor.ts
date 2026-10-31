/* Sweep-Darstellung wie am echten Monitor: EKG oben, Pleth unten. */
import type { EcgData } from '../types';
import { createSignal, plethValue, type Signal } from './signal';

const BG = '#05090b';
const SIGNAL_SECONDS = 600;

export class Monitor {
  private ctx: CanvasRenderingContext2D;
  private sig: Signal | null = null;
  private sigStart = 0;
  private hrOverride?: number;
  private w = 300;
  private h = 150;
  private x = 0;
  private t = 0;
  private lastY: number | null = null;
  private lastP: number | null = null;
  private nextBeat = 0;
  private running = false;
  private raf = 0;
  readonly speed = 110; // px pro Sekunde

  showPleth = false;
  showEcg = true;
  cpr = false;
  onBeat: (() => void) | null = null;

  constructor(private canvas: HTMLCanvasElement, private ecg: EcgData) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  get rhythm() { return this.sig?.key ?? null; }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(200, r.width);
    this.h = Math.max(100, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = BG;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.x = 0;
    this.lastY = this.lastP = null;
  }

  /** Rhythmus wechseln; null = nicht angeschlossen. Gleicher Rhythmus mit ähnlicher Frequenz bleibt. */
  setRhythm(key: string | null, hr?: number) {
    if (!key) { this.sig = null; return; }
    if (this.sig && this.sig.key === key && (hr == null || Math.abs((this.hrOverride ?? 0) - hr) <= 2)) return;
    this.hrOverride = hr;
    this.newSignal(key);
  }

  private newSignal(key: string) {
    this.sig = createSignal(this.ecg, key, SIGNAL_SECONDS, this.hrOverride);
    this.sigStart = this.t;
    this.nextBeat = 0;
  }

  private local(t: number) { return t - this.sigStart; }

  private ecgValue(t: number) {
    if (!this.sig || !this.showEcg) return 0;
    let v = this.sig.value(this.local(t));
    if (this.cpr) v += 0.9 * Math.sin(t * 2 * Math.PI * 1.85) + 0.25 * Math.sin(t * 2 * Math.PI * 3.7);
    return v;
  }

  private pleth(t: number) {
    if (!this.sig) return 0;
    if (!this.sig.pulse) return this.cpr ? 0.25 * Math.max(0, Math.sin(t * 2 * Math.PI * 1.85)) : 0;
    return plethValue(this.ecg, this.sig, this.local(t));
  }

  private beats() {
    const s = this.sig;
    if (!s || !s.pulse || !this.onBeat) return;
    const lt = this.local(this.t);
    while (this.nextBeat < s.complexes.length && s.complexes[this.nextBeat].t <= lt) { this.nextBeat++; this.onBeat(); }
  }

  private draw(dt: number) {
    const ctx = this.ctx;
    const ecgH = this.showPleth ? this.h * 0.66 : this.h;
    const base = ecgH * 0.58, scale = ecgH * 0.36;
    const pBase = this.h - 6, pScale = this.h * 0.26;
    const n = Math.max(1, Math.round(dt * this.speed));
    for (let i = 0; i < n; i++) {
      const tt = this.t - dt + (dt * (i + 1)) / n;
      if (this.x >= this.w) { this.x = 0; this.lastY = this.lastP = null; }
      ctx.fillStyle = BG;
      ctx.fillRect(this.x, 0, 14, this.h);
      if (Math.round(this.x) % 22 === 0) { ctx.fillStyle = 'rgba(80,140,120,0.12)'; ctx.fillRect(this.x, 0, 1, this.h); }
      if (!this.sig) {
        ctx.fillStyle = 'rgba(80,140,120,0.35)';
        ctx.fillRect(this.x, base, 1, 1);
      } else {
        const y = base - this.ecgValue(tt) * scale;
        this.line('#3df27a', 2, this.lastY ?? y, y);
        this.lastY = y;
      }
      if (this.showPleth) {
        const p = pBase - this.pleth(tt) * pScale;
        this.line('#46c8ff', 1.6, this.lastP ?? p, p);
        this.lastP = p;
      }
      this.x += 1;
    }
  }

  private line(color: string, width: number, y0: number, y1: number) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(this.x - 1, y0);
    ctx.lineTo(this.x, y1);
    ctx.stroke();
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.t += dt;
      if (this.sig && this.local(this.t) > SIGNAL_SECONDS - 2) this.newSignal(this.sig.key);
      this.beats();
      this.draw(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
