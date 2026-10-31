/* Einsatzort und Wetter: wo sind wir (draußen, drinnen, öffentlich, im RTW) und was folgt daraus.
   Ortsbezogenes steckt komplett hier: Daten aus places.json, Bedingungen {at}/{weather},
   Ortswechsel, Wettertrends und die Ereignisse, die zum Ort passen. */
import type { Moment, VitalNumbers } from '../types';
import type { GameState } from './state';
import placesJson from '../../data/places.json';

export interface PlaceDef { label: string; icon: string; tags: string[]; enter?: string }
export interface WeatherDef { label: string; icon: string; perMin?: VitalNumbers }
export interface SceneEvent extends Moment { if: NonNullable<Moment['if']>; except?: string[] }

export const PLACES = placesJson.places as Record<string, PlaceDef>;
export const WEATHER = placesJson.weather as Record<string, WeatherDef>;
export const SCENE_EVENTS = placesJson.events as unknown as SceneEvent[];
export const RTW_ACTION = placesJson.rtwAction;

/** Startort eines Falls auswürfeln (Wetter nur draußen) */
export function startScene(scene: { place: string; weather?: string[] } | undefined, rnd = Math.random) {
  const place = scene?.place && PLACES[scene.place] ? scene.place : 'wohnung';
  const ws = scene?.weather?.length ? scene.weather : ['mild'];
  const weather = PLACES[place].tags.includes('outdoor') ? ws[Math.floor(rnd() * ws.length)] : null;
  return { place, weather };
}

export const placeOf = (s: GameState) => PLACES[s.place] ?? PLACES.wohnung;
/** Ort-ID oder Merkmal (outdoor, public, home, rtw …) */
export const isAt = (s: GameState, tag: string) => s.place === tag || placeOf(s).tags.includes(tag);
/** Wetter wirkt nur draußen */
export const hasWeather = (s: GameState, w: string) => isAt(s, 'outdoor') && s.weather === w;

/** Ortswechsel; gibt den Text für das Protokoll zurück (null, wenn schon dort) */
export function moveTo(s: GameState, to: string): string | null {
  if (!PLACES[to] || s.place === to) return null;
  s.place = to;
  return PLACES[to].enter ?? `Ihr seid jetzt: ${PLACES[to].label}.`;
}

/** Wetterwirkung pro Minute am aktuellen Ort */
export function weatherTrend(s: GameState): VitalNumbers | null {
  if (!isAt(s, 'outdoor') || !s.weather) return null;
  return WEATHER[s.weather]?.perMin ?? null;
}

/** Kurzbeschreibung für die Anzeige, z. B. „🍺 Biergarten · 🌧️ Regen“ */
export function sceneLabel(s: GameState) {
  const p = placeOf(s);
  const w = isAt(s, 'outdoor') && s.weather ? WEATHER[s.weather] : null;
  return `${p.icon} ${p.label}${w && s.weather !== 'mild' ? ` · ${w.icon} ${w.label}` : ''}`;
}
