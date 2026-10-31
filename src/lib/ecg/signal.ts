/* EKG-Signal aus den Rhythmus-Daten erzeugen.
   Vorhof- (P) und Kammeraktionen (QRS) werden als Ereignislisten gebaut; die Kurvenform
   kommt aus den Gauß-Wellen in ecg.json. Genutzt von Monitor und Papierstreifen. */
import type { EcgData, Range, RhythmPattern, Wave } from '../types';
import { pick, rnd } from '../util';

export interface Complex { t: number; kind: string }

export interface Signal {
  key: string;
  /** Kammerfrequenz pro Minute (gemessen über die Dauer) */
  hr: number;
  dur: number;
  pulse: boolean;
  /** Zeitpunkte aller Kammerkomplexe, aufsteigend */
  complexes: Complex[];
  value(t: number): number;
}

const gauss = (t: number, [mu, sd, a]: Wave) => a * Math.exp(-((t - mu) * (t - mu)) / (2 * sd * sd));
const waves = (dt: number, list: Wave[]) => list.reduce((v, w) => v + gauss(dt, w), 0);
const fixedHr = (r: Range, hr?: number) => hr ?? Math.round(rnd(r[0], r[1]));

/** Index des ersten Elements mit t >= x (Liste aufsteigend sortiert) */
function lowerBound<T>(arr: T[], x: number, get: (e: T) => number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (get(arr[m]) < x) lo = m + 1; else hi = m; }
  return lo;
}

interface Events { p: number[]; q: Complex[]; spikes: number[]; hr: number; flutter?: number; fib?: boolean; cont?: 'vf' | 'asystole' | 'torsade' }

function schedule(pattern: RhythmPattern, dur: number, hrOverride?: number): Events {
  const e: Events = { p: [], q: [], spikes: [], hr: 0 };
  const end = dur + 1;
  // Mittlere Kammerfrequenz aus den RR-Abständen
  const countHr = () => {
    const q = e.q.map((c) => c.t).sort((a, b) => a - b);
    return q.length > 1 ? Math.round((60 * (q.length - 1)) / (q[q.length - 1] - q[0])) : 0;
  };
  switch (pattern.type) {
    case 'sinus': {
      e.hr = fixedHr(pattern.hr, hrOverride);
      const pq = Array.isArray(pattern.pq) ? rnd(pattern.pq[0], pattern.pq[1]) : pattern.pq;
      for (let t = rnd(0.1, 0.6); t < end; t += (60 / e.hr) * rnd(0.98, 1.02)) { e.p.push(t); e.q.push({ t: t + pq, kind: 'narrow' }); }
      break;
    }
    case 'irregular': {
      e.fib = pattern.baseline === 'fib';
      const scale = hrOverride ? 60 / hrOverride / ((pattern.rr[0] + pattern.rr[1]) / 2) : 1;
      for (let t = rnd(0.1, 0.4); t < end; t += rnd(pattern.rr[0], pattern.rr[1]) * scale) e.q.push({ t, kind: 'narrow' });
      e.hr = countHr();
      break;
    }
    case 'flutter': {
      e.flutter = pattern.flutterInterval;
      const ratio = pick(pattern.ratios);
      for (let t = 0.15, i = 0; t < end; t += pattern.flutterInterval, i++) if (i % ratio === 0) e.q.push({ t: t + 0.12, kind: 'narrow' });
      e.hr = Math.round(60 / pattern.flutterInterval / ratio);
      break;
    }
    case 'regular': {
      e.hr = fixedHr(pattern.hr, hrOverride);
      for (let t = 0.1; t < end; t += 60 / e.hr) e.q.push({ t, kind: pattern.complex });
      break;
    }
    case 'wenckebach': {
      const pp = 60 / rnd(pattern.atrialHr[0], pattern.atrialHr[1]);
      const cyc = pick(pattern.cycles);
      for (let t = rnd(0.1, 0.4), i = 0; t < end; t += pp, i++) {
        const k = i % (cyc + 1);
        e.p.push(t);
        if (k < cyc) e.q.push({ t: t + pattern.pq + k * pattern.pqStep, kind: 'narrow' });
      }
      e.hr = countHr();
      break;
    }
    case 'mobitz2': {
      const pp = 60 / rnd(pattern.atrialHr[0], pattern.atrialHr[1]);
      const ratio = pick(pattern.ratios);
      for (let t = rnd(0.1, 0.4), i = 0; t < end; t += pp, i++) { e.p.push(t); if (i % ratio !== ratio - 1) e.q.push({ t: t + pattern.pq, kind: 'narrow' }); }
      e.hr = countHr();
      break;
    }
    case 'dissociated': {
      const pp = 60 / rnd(pattern.atrialHr[0], pattern.atrialHr[1]);
      for (let t = rnd(0, 0.5); t < end; t += pp) e.p.push(t);
      e.hr = fixedHr(pattern.hr, hrOverride);
      for (let t = rnd(0.3, 1.0); t < end; t += 60 / e.hr) e.q.push({ t, kind: pattern.complex });
      break;
    }
    case 'bigeminy': {
      e.hr = fixedHr(pattern.hr, hrOverride);
      const rr = 60 / e.hr;
      for (let t = rnd(0.1, 0.4); t < end; t += rr * 2) {
        e.p.push(t);
        e.q.push({ t: t + pattern.pq, kind: 'narrow' }, { t: t + pattern.pq + rr * pattern.coupling, kind: pattern.ectopic });
      }
      break;
    }
    case 'paced': {
      e.hr = fixedHr(pattern.hr, hrOverride);
      for (let t = rnd(0.1, 0.5); t < end; t += 60 / e.hr) { e.spikes.push(t); e.q.push({ t: t + 0.03, kind: pattern.complex }); }
      break;
    }
    case 'continuous':
      e.cont = pattern.wave;
      e.hr = pattern.hr ? pattern.hr[0] : 0;
      break;
  }
  return e;
}

export function createSignal(ecg: EcgData, key: string, dur: number, hrOverride?: number): Signal {
  const def = ecg.rhythms[key];
  if (!def) throw new Error(`Unbekannter Rhythmus: ${key}`);
  const m = ecg.morphology;
  const ev = schedule(def.pattern, dur, hrOverride);
  const st = def.pattern.type === 'sinus' ? def.pattern.st ?? 0 : 0;
  const phase = Math.random() * 10;

  const qrs = (dt: number, kind: string) => {
    let v = waves(dt, m[kind]);
    if (st && kind === 'narrow') v += st / (1 + Math.exp(-(dt - 0.05) / 0.008)) / (1 + Math.exp((dt - 0.3) / 0.03));
    return v;
  };

  function value(t: number): number {
    if (ev.cont === 'vf') {
      const p = t + phase;
      const amp = 0.35 + 0.22 * Math.sin(p * 0.9) + 0.1 * Math.sin(p * 2.3);
      return amp * (Math.sin(p * 2 * Math.PI * 4.6) + 0.6 * Math.sin(p * 2 * Math.PI * 6.3 + 1.1) + 0.4 * Math.sin(p * 2 * Math.PI * 3.1 + 2));
    }
    if (ev.cont === 'asystole') return 0.03 * Math.sin(t * 0.7 + phase) + (Math.random() - 0.5) * 0.012;
    if (ev.cont === 'torsade') {
      const env = 0.25 + 0.95 * Math.abs(Math.sin(((t + phase) * Math.PI) / 2.4));
      return env * Math.sin(t * 2 * Math.PI * (ev.hr / 60));
    }
    let v = 0;
    for (let i = lowerBound(ev.p, t - 0.1, (x) => x); i < ev.p.length && ev.p[i] < t + 0.1; i++) v += waves(t - ev.p[i], m.p);
    for (let i = lowerBound(ev.q, t - 0.6, (c) => c.t); i < ev.q.length && ev.q[i].t < t + 0.15; i++) v += qrs(t - ev.q[i].t, ev.q[i].kind);
    for (let i = lowerBound(ev.spikes, t - 0.006, (x) => x); i < ev.spikes.length && ev.spikes[i] < t + 0.004; i++) v += 1.6;
    if (ev.fib) v += 0.05 * Math.sin(t * 2 * Math.PI * 6.5 + phase) + 0.03 * Math.sin(t * 2 * Math.PI * 9.1);
    if (ev.flutter) {
      const f = ev.flutter;
      const x = ((((t - 0.15) % f) + f) % f) / f;
      v += 0.22 * (x < 0.75 ? -x / 0.75 : -(1 - x) / 0.25) + 0.11;
    }
    return v + (Math.random() - 0.5) * 0.012;
  }

  ev.q.sort((a, b) => a.t - b.t);
  return { key, hr: ev.hr, dur, pulse: def.pulse, complexes: ev.q, value };
}

/** Pulskurve (Pleth) zu den Kammerkomplexen eines Signals */
export function plethValue(ecg: EcgData, sig: Signal, t: number): number {
  if (!sig.pulse) return 0;
  const q = sig.complexes;
  let v = 0;
  for (let i = lowerBound(q, t - 1.02, (c) => c.t); i < q.length && q[i].t < t - 0.12; i++) v += waves(t - q[i].t - 0.12, ecg.morphology.pleth);
  return v;
}
