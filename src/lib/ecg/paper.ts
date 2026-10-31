/* EKG-Streifen auf Papier zeichnen: 25 mm/s, kleines Kästchen 0,04 s, großes 0,2 s. */
import type { Signal } from './signal';

export function drawPaper(canvas: HTMLCanvasElement, sig: Signal) {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  const w = Math.max(200, r.width), h = Math.max(120, r.height);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pxs = w / sig.dur; // Pixel pro Sekunde
  const mv = h / 3.2; // Pixel pro mV
  ctx.fillStyle = '#fff6f4';
  ctx.fillRect(0, 0, w, h);

  const grid = (color: string, width: number, dx: number, dy: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = 0; x < w; x += dx) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = h; y > 0; y -= dy) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  };
  if (pxs * 0.04 >= 3.5) grid('#f6cfc9', 0.5, pxs * 0.04, mv * 0.1);
  grid('#eb9a90', 1, pxs * 0.2, mv * 0.5);

  ctx.fillStyle = '#b5584c';
  ctx.font = '10px -apple-system, sans-serif';
  for (let s = 1; s < sig.dur; s++) { ctx.fillRect(s * pxs - 0.5, h - 8, 1, 8); ctx.fillText(`${s} s`, s * pxs + 2, h - 2); }

  const base = h * 0.55;
  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const n = Math.round(w * 2);
  for (let i = 0; i <= n; i++) {
    const y = base - sig.value((i / n) * sig.dur) * mv;
    if (i === 0) ctx.moveTo(0, y); else ctx.lineTo((i / n) * w, y);
  }
  ctx.stroke();
}
