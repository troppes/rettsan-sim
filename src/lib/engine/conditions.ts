/* Bedingungen und Zustandsänderungen aus den Falldaten auswerten. */
import type { Condition, Mutation, VitalKey } from '../types';
import type { GameState, Settings } from './state';
import { hasWeather, isAt, moveTo } from './scene';

export interface Ctx { s: GameState; settings: Settings }

export function test(c: Condition | undefined, ctx: Ctx): boolean {
  if (!c) return true;
  const { s } = ctx;
  if ('all' in c) return c.all.every((x) => test(x, ctx));
  if ('any' in c) return c.any.some((x) => test(x, ctx));
  if ('not' in c) return !test(c.not, ctx);
  if ('vital' in c) {
    const v = s.v[c.vital];
    switch (c.op) {
      case '<': return v < c.value;
      case '<=': return v <= c.value;
      case '>': return v > c.value;
      case '>=': return v >= c.value;
      case '==': return v === c.value;
    }
  }
  if ('flag' in c) return !!s.flags[c.flag];
  if ('fixed' in c) return !!s.fixed[c.fixed];
  if ('done' in c) return !!s.count[c.done];
  if ('time' in c) return s.time >= c.time;
  if ('sinceFlag' in c) {
    const f = s.flags[c.sinceFlag];
    return typeof f === 'number' && s.time - f > c.over;
  }
  if ('doneAfterFlag' in c) {
    const f = s.flags[c.doneAfterFlag.flag];
    const at = s.lastAt[c.doneAfterFlag.action];
    return typeof f === 'number' && at != null && at > f;
  }
  if ('setting' in c) return !!ctx.settings[c.setting];
  if ('at' in c) return isAt(s, c.at);
  if ('weather' in c) return hasWeather(s, c.weather);
  throw new Error('Unbekannte Bedingung: ' + JSON.stringify(c));
}

/** Erste passende Variante (Liste mit `if`) oder den Einzelwert */
export function variant<T extends object>(v: T | (T & { if?: Condition })[] | undefined, ctx: Ctx): T | undefined {
  if (!v) return undefined;
  if (!Array.isArray(v)) return v;
  return v.find((x) => test(x.if, ctx));
}

export function mutate(s: GameState, m: Mutation) {
  if (m.set) Object.assign(s.v, m.set);
  if (m.delta) for (const [k, d] of Object.entries(m.delta)) s.v[k as VitalKey] += d!;
  if (m.cap) for (const [k, d] of Object.entries(m.cap)) s.v[k as VitalKey] = Math.min(s.v[k as VitalKey], d!);
  if (m.flags) for (const [k, f] of Object.entries(m.flags)) s.flags[k] = typeof f === 'object' ? s.time + f.now : f;
  if (m.status) s.status = m.status;
  if (m.move) moveTo(s, m.move);
}
