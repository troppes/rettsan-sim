/* EKG- und Pleth-Simulation auf einem Canvas (Sweep-Darstellung wie am echten Monitor). */
(function () {
  'use strict';

  const g = (t, mu, sd, a) => a * Math.exp(-((t - mu) * (t - mu)) / (2 * sd * sd));

  // Ein normaler Herzschlag (P-QRS-T), t = Zeit relativ zur R-Zacke in Sekunden.
  function sinusBeat(t, opts) {
    const st = opts.st || 0;
    let v = 0;
    if (!opts.noP) v += g(t, -0.16, 0.025, 0.15);
    v += g(t, -0.035, 0.009, -0.12);
    v += g(t, 0, 0.011, 1.25);
    v += g(t, 0.035, 0.011, -0.3);
    if (st) {
      // ST-Hebung: Plateau zwischen J-Punkt und T-Welle
      const rise = 1 / (1 + Math.exp(-(t - 0.05) / 0.008));
      const fall = 1 / (1 + Math.exp((t - 0.3) / 0.03));
      v += st * rise * fall;
    }
    v += g(t, 0.27, 0.05, 0.32);
    return v;
  }

  // Breiter Kammerkomplex (VT)
  function wideBeat(t) {
    return g(t, 0, 0.045, 1.1) + g(t, 0.12, 0.05, -0.55);
  }

  /* Rhythmus-Definitionen.
     rr(): nächstes RR-Intervall in s; beat(t): Form; cont(t): durchgehende Kurve (VF/Asystolie). */
  const RHYTHMS = {
    sinus: { name: 'Sinusrhythmus', rate: 78, pulse: true },
    sinustachy: { name: 'Sinustachykardie', rate: 128, pulse: true },
    sinusbrady: { name: 'Sinusbradykardie', rate: 42, pulse: true },
    vhf: { name: 'Vorhofflimmern (absolute Arrhythmie)', rate: 115, pulse: true, irregular: true, noP: true, fib: true },
    stemi: { name: 'Sinusrhythmus mit ST-Hebung (STEMI)', rate: 92, pulse: true, st: 0.35 },
    vt: { name: 'Ventrikuläre Tachykardie (mit Puls)', rate: 180, pulse: true, wide: true },
    pvt: { name: 'Pulslose ventrikuläre Tachykardie (pVT)', rate: 190, pulse: false, wide: true },
    vf: { name: 'Kammerflimmern (VF)', pulse: false, cont: 'vf' },
    asystolie: { name: 'Asystolie', pulse: false, cont: 'asy' },
    pea: { name: 'PEA (pulslose elektrische Aktivität)', rate: 46, pulse: false, pea: true },
  };

  // Hilfe-Texte für das Erkennen (Hilfeknopf)
  const HELP = {
    sinus: 'Regelmäßig, vor jedem schmalen QRS eine P-Welle, Frequenz 60–100/min.',
    sinustachy: 'Wie Sinus (P vor jedem QRS, schmal, regelmäßig), aber über 100/min.',
    sinusbrady: 'Wie Sinus (P vor jedem QRS, schmal, regelmäßig), aber unter 60/min.',
    vhf: 'Unregelmäßige Abstände der QRS-Komplexe („absolute Arrhythmie“), keine klaren P-Wellen, zittrige Grundlinie.',
    stemi: 'Sinusrhythmus, aber die Strecke nach dem QRS (ST-Strecke) ist angehoben wie ein Grabstein („Grabstein-ST“).',
    vt: 'Schnelle, breite, gleich aussehende Kammerkomplexe ohne P-Wellen. Puls ist tastbar.',
    pvt: 'Schnelle, breite, gleich aussehende Kammerkomplexe – aber KEIN Puls. Schockbar!',
    vf: 'Völlig chaotische Zacken ohne erkennbare Komplexe, unterschiedlich hoch. Schockbar!',
    asystolie: 'Fast eine Nulllinie. Vorher Elektroden und Ableitung prüfen. NICHT schockbar.',
    pea: 'Ein geordneter Rhythmus ist sichtbar, aber der Patient hat keinen Puls (Puls prüfen!). NICHT schockbar.',
  };

  class Monitor {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.rhythm = null; // null = Monitor nicht angeschlossen
      this.showPleth = false;
      this.cpr = false;
      this.speed = 110; // px pro Sekunde (CSS-Pixel)
      this.x = 0;
      this.t = 0;
      this.nextBeat = 0.3;
      this.beats = [];
      this.lastY = null;
      this.lastP = null;
      this.vfPhase = Math.random() * 10;
      this.running = false;
      this.onBeat = null;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const r = this.c.getBoundingClientRect();
      this.w = Math.max(200, r.width);
      this.h = Math.max(100, r.height);
      this.c.width = Math.round(this.w * dpr);
      this.c.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.clear();
    }

    clear() {
      this.ctx.fillStyle = '#05090b';
      this.ctx.fillRect(0, 0, this.w, this.h);
      this.x = 0;
      this.lastY = null;
      this.lastP = null;
    }

    setRhythm(key, rate) {
      this.rhythm = key ? Object.assign({}, RHYTHMS[key], { key }) : null;
      if (this.rhythm && rate) this.rhythm.rate = rate;
      this.beats = [];
      this.nextBeat = this.t + 0.2;
    }

    rrInterval() {
      const r = this.rhythm;
      let rr = 60 / (r.rate || 70);
      if (r.irregular) rr *= 0.55 + Math.random() * 0.9;
      else rr *= 0.98 + Math.random() * 0.04;
      return rr;
    }

    ecgValue(t) {
      const r = this.rhythm;
      if (!r) return 0;
      let v = 0;
      if (r.cont === 'vf') {
        const p = t + this.vfPhase;
        const amp = 0.35 + 0.25 * Math.sin(p * 0.9) + 0.1 * Math.sin(p * 2.3);
        v = amp * (Math.sin(p * 2 * Math.PI * 4.6) + 0.6 * Math.sin(p * 2 * Math.PI * 6.3 + 1.1) + 0.4 * Math.sin(p * 2 * Math.PI * 3.1 + 2));
      } else if (r.cont === 'asy') {
        v = 0.03 * Math.sin(t * 0.7) + (Math.random() - 0.5) * 0.015;
      } else {
        for (const b of this.beats) {
          const dt = t - b;
          if (dt < -0.3 || dt > 0.6) continue;
          v += r.wide ? wideBeat(dt) : sinusBeat(dt, r);
        }
        if (r.fib) v += 0.05 * Math.sin(t * 2 * Math.PI * 6.5) + 0.03 * Math.sin(t * 2 * Math.PI * 9.1);
        v += (Math.random() - 0.5) * 0.012;
      }
      if (this.cpr) v += 0.9 * Math.sin(t * 2 * Math.PI * 1.85) + 0.25 * Math.sin(t * 2 * Math.PI * 3.7);
      return v;
    }

    plethValue(t) {
      const r = this.rhythm;
      if (!r || !r.pulse) {
        return this.cpr ? 0.25 * Math.max(0, Math.sin(t * 2 * Math.PI * 1.85)) : 0;
      }
      let v = 0;
      for (const b of this.beats) {
        const dt = t - b - 0.12;
        if (dt < 0 || dt > 0.9) continue;
        v += g(dt, 0.12, 0.06, 1) + g(dt, 0.34, 0.07, 0.35);
      }
      return v;
    }

    step(dt) {
      const r = this.rhythm;
      this.t += dt;
      if (r && !r.cont) {
        while (this.nextBeat < this.t + 0.4) {
          this.beats.push(this.nextBeat);
          const bt = this.nextBeat;
          setTimeout(() => this.onBeat && r.pulse && this.onBeat(), Math.max(0, (bt - this.t) * 1000));
          this.nextBeat += this.rrInterval();
        }
        this.beats = this.beats.filter((b) => b > this.t - 1);
      }
    }

    draw(dt) {
      const ctx = this.ctx;
      const ecgH = this.showPleth ? this.h * 0.66 : this.h;
      const base = ecgH * 0.58;
      const scale = ecgH * 0.36;
      const pBase = this.h - 6;
      const pScale = this.h * 0.26;
      const n = Math.max(1, Math.round(dt * this.speed));
      for (let i = 0; i < n; i++) {
        const tt = this.t - dt + (dt * (i + 1)) / n;
        if (this.x >= this.w) {
          this.x = 0;
          this.lastY = null;
          this.lastP = null;
        }
        // Löschbalken vor dem Strahl
        ctx.fillStyle = '#05090b';
        ctx.fillRect(this.x, 0, 14, this.h);
        // Raster
        if (Math.round(this.x) % 22 === 0) {
          ctx.fillStyle = 'rgba(80,140,120,0.12)';
          ctx.fillRect(this.x, 0, 1, this.h);
        }
        if (!this.rhythm) {
          ctx.fillStyle = 'rgba(80,140,120,0.35)';
          ctx.fillRect(this.x, base, 1, 1);
        } else {
          const y = base - this.ecgValue(tt) * scale;
          ctx.strokeStyle = '#3df27a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(this.x - 1, this.lastY == null ? y : this.lastY);
          ctx.lineTo(this.x, y);
          ctx.stroke();
          this.lastY = y;
        }
        if (this.showPleth) {
          const p = pBase - this.plethValue(tt) * pScale;
          ctx.strokeStyle = '#46c8ff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(this.x - 1, this.lastP == null ? p : this.lastP);
          ctx.lineTo(this.x, p);
          ctx.stroke();
          this.lastP = p;
        }
        this.x += 1;
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      let last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        this.step(dt);
        this.draw(dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    stop() {
      this.running = false;
    }
  }

  window.ECG = { Monitor, RHYTHMS, HELP };
})();
