/* Laufzeit-Zustand eines Einsatzes und die Dialoge, die die Oberfläche anzeigt. */
import type { Dispatch, Electrode, GaugeConfig, IvConfig, Letter, Moment, ProcStep, Quiz, Vitals } from '../types';

export interface Settings { worsen: boolean; detail: boolean }

export type LogType = 'dispatch' | 'info' | 'you' | 'pt' | 'moment' | 'find' | 'good' | 'bad' | 'alert';
export interface LogEntry { type: LogType; text: string; who?: string; pts?: number }

export type EventType = 'good' | 'bad' | 'miss' | 'none';
export interface ScoreEvent { pts: number; max: number; text: string; why?: string; type: EventType; at: number }

export interface ReaState {
  path: string[];
  pi: number;
  bak: boolean;
  hdm: boolean;
  paused: boolean;
  defi: boolean;
  analyses: number;
  shocks: number;
  blocks: number;
  sinceAnalysis: number;
  ivz: boolean;
  adr: number[];
  airway: boolean;
  lt: boolean;
  rosc: boolean;
  nefBlock: number | null;
  monRhythm: string;
  absaug: boolean;
  hdmBeforeDefi: boolean | null;
  missAirway: boolean;
}

export interface GameState {
  dispatch: Dispatch;
  v: Vitals;
  status: string;
  mood: number;
  time: number;
  count: Record<string, number>;
  lastAt: Record<string, number>;
  fixed: Record<string, boolean>;
  flags: Record<string, boolean | number>;
  warned: Record<string, boolean>;
  quizDone: Record<number, boolean>;
  momentDone: Record<string, boolean>;
  rulesDone: Record<string, boolean>;
  letters: Partial<Record<Letter, boolean>>;
  unlocked: string[];
  events: ScoreEvent[];
  attached: { ekg: boolean; spo2: boolean };
  nibp: { sys: number; dia: number } | null;
  afShown: number | null;
  measured: { bz?: number; temp?: string; gcs?: number };
  quickAsk: number;
  over: boolean;
  rea: ReaState | null;
}

/* ------------------------------------------------------------ Dialoge */
export interface Choice { label: string; state?: 'right' | 'wrong' | 'neutral' }

export type Prompt =
  | { kind: 'mc'; title: string; kicker: string; choices: Choice[]; answered: boolean; explain?: string; cont: string }
  | { kind: 'order'; title: string; items: string[]; picked: string[]; result?: { item: string; ok: boolean; right: string }[] }
  | { kind: 'moment'; who: string; say: string; choices: Choice[]; answered: boolean; reply?: string; why?: string }
  | { kind: 'proc'; title: string; done: { label: string; bad?: boolean }[]; react?: { who: string; text: string }; steps: ProcStep[]; refusal?: Choice[]; finished: boolean }
  | { kind: 'place'; title: string; task: string; view: string; variant: string; electrodes: Pick<Electrode, 'id' | 'label' | 'color'>[]; pos: Record<string, { x: number; y: number }>; result?: { id: string; ok: boolean; target: { x: number; y: number; r: number }; where: string }[] }
  | { kind: 'gauge'; title: string; cfg: GaugeConfig; hr: number; sys: number; dia: number; result?: { lines: { ok: boolean; text: string }[] } }
  | { kind: 'iv'; title: string; cfg: IvConfig; result?: { lines: { ok: boolean; text: string }[] } }
  | { kind: 'rhythm'; title: string; kicker: string; rhythm: string; rate?: number; pulseKnown: boolean; pulseText?: string; help?: { label: string; text: string }[]; choices: Choice[]; answered: boolean; explain?: string };

export type PromptKind = Prompt['kind'];

/** Interne Ergänzungen zu einem Dialog: Reihenfolge der Antworten und was danach passiert */
export interface PromptCtl {
  keys: (string | number)[];
  onAnswer?: (key: string | number) => void;
  next?: () => void;
  quiz?: Quiz;
  moment?: Moment;
  /** Ziele beim Elektroden-Kleben */
  targets?: Electrode[];
}

/** Was das gezeichnete Gesicht gerade zeigt */
export interface FaceState {
  /** Stimmung 0–10; null, wenn der Patient nicht wach ist */
  mood: number | null;
  eyes: 'open' | 'half' | 'closed';
  pale: boolean;
  sweat: boolean;
  flushed: boolean;
  cyanotic: boolean;
}
