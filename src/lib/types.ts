/* Datenmodell. Alles unter src/data/ ist reines JSON und folgt diesen Typen.
   Die Engine interpretiert die Daten, Fälle enthalten keinen Code. */

export type Letter = 'S' | 'x' | 'A' | 'B' | 'C' | 'D' | 'E';
export type VitalKey = 'hr' | 'spo2' | 'sys' | 'dia' | 'af' | 'bz' | 'temp' | 'gcs';
export type Vitals = Record<VitalKey, number> & { rhythm: string };
export type VitalNumbers = Partial<Record<VitalKey, number>>;

/* ------------------------------------------------------------ Bedingungen */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { vital: VitalKey; op: '<' | '<=' | '>' | '>=' | '=='; value: number }
  | { flag: string }
  | { fixed: string }
  | { done: string }
  | { time: number }
  | { sinceFlag: string; over: number }
  | { doneAfterFlag: { action: string; flag: string } }
  | { setting: 'worsen' | 'detail' };

/** Zeitstempel relativ zur aktuellen Einsatzzeit oder fester Wert */
export type FlagValue = boolean | number | { now: number };

/** Zustandsänderung, die Effekte und Regeln gemeinsam haben */
export interface Mutation {
  set?: VitalNumbers & { rhythm?: string };
  delta?: VitalNumbers;
  cap?: VitalNumbers;
  flags?: Record<string, FlagValue>;
  status?: string;
}

/* ------------------------------------------------------------ Fall */
export interface Dispatch { short: string; text: string }

export interface Problem {
  id: string;
  letter: Letter;
  label: string;
  blocking?: boolean;
  fixedBy?: string[];
  worsen?: VitalNumbers;
  activeIf?: Condition;
}

/** Regel, die einmal feuert, sobald ihre Bedingung erfüllt ist */
export interface Rule extends Mutation {
  id: string;
  if: Condition;
  alert?: string;
  info?: string;
}

/** Stetige Veränderung pro Minute, solange die Bedingung gilt */
export interface Trend {
  if: Condition;
  perMin: VitalNumbers;
  min?: VitalNumbers;
  max?: VitalNumbers;
}

export interface TreatEffect extends Mutation {
  if?: Condition;
  text?: string;
  pts?: number;
  why?: string;
  fix?: string[];
  needs?: string[];
  needText?: string;
  noCount?: boolean;
  nopts?: boolean;
  repeat?: boolean;
  penalties?: { if: Condition; pts: number; why: string }[];
}
export type Variants<T> = T | (T & { if?: Condition })[];

export type Finding = string | { if?: Condition; text: string }[];
export type Answer = string | { pt?: string; by?: string };

export interface Followup { after: string; label: string; ans: string }

export interface MomentOption {
  t: string;
  pts?: number;
  mood?: number;
  delta?: VitalNumbers;
  reply?: string;
  why?: string;
}
export interface Moment {
  id: string;
  who: string;
  say: string;
  options: MomentOption[];
  before?: string;
  after?: string[];
  at?: number;
  if?: Condition;
}

export interface Required {
  pts: number;
  label: string;
  why: string;
  any?: string[];
  all?: string[];
  if?: Condition;
}

export type Quiz =
  | { on: string; type: 'order'; q: string; items: string[] }
  | { on: string; type: 'mc'; q: string; options: string[]; answer: number; explain?: string };

/** Aussehen des Patienten für das gezeichnete Gesicht */
export type HairStyle = 'short' | 'long' | 'bob' | 'bun' | 'curly' | 'bald' | 'tuft';
export interface Look {
  sex: 'm' | 'f';
  age: 'child' | 'young' | 'mid' | 'old';
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  beard?: 'stubble' | 'mustache';
  glasses?: boolean;
  /** Zusätzliche Hautzeichen, z. B. kaltschweißig beim Infarkt (ergänzen die Vitalwerte) */
  signs?: Partial<Record<'pale' | 'sweat' | 'flushed' | 'cyanotic', Condition>>;
}

export interface CaseDef {
  id: string;
  level: 1 | 2 | 3;
  rea?: boolean;
  person: string;
  icon: string;
  look: Look;
  name: string;
  mood: number;
  child?: boolean;
  nonverbal?: boolean;
  dispatches: Dispatch[];
  sssPts?: number;
  start: Vitals & { status: string };
  answerer?: { if?: Condition; who: string }[];
  problems?: Problem[];
  rules?: Rule[];
  trends?: Trend[];
  moodDrop?: { delta: VitalNumbers };
  findings?: Record<string, Finding>;
  answers?: Record<string, Answer>;
  followups?: Record<string, Followup>;
  moments?: Moment[];
  react?: Record<string, string>;
  effects?: Record<string, TreatEffect | TreatEffect[]>;
  required?: Required[];
  quizzes?: Quiz[];
  /** Keine zufälligen Störungen (z. B. Übungsmodus) */
  noStress?: boolean;
  diagnosis: {
    options: string[];
    answer: number;
    guard?: { if: Condition; pts: number; why: string };
    /** Andere Auswahl, wenn der Spieler etwas herausgefunden hat (erste passende gilt) */
    variants?: { if: Condition; options: string[]; answer: number }[];
  };
  teach: string[];
}

/* ------------------------------------------------------------ Aktionen & Abläufe */
export type ActionKind = 'assess' | 'ask' | 'treat' | 'rea';
export interface ActionDef { id: string; label: string; letter?: Letter; time?: number }
export interface ActionGroup { group: string; items: ActionDef[] }
export interface Action extends ActionDef { kind: ActionKind; group: string; time: number; followup?: boolean }

export interface ProcStep {
  id: string;
  label: string;
  say?: string;
  invasive?: boolean;
  hurt?: boolean;
  final?: boolean;
  needs?: string[];
  wrong?: string;
}
/** Wie eine Maßnahme abgefragt wird: Schritte, klappt einfach, eine Frage, Elektroden selbst kleben */
export type ProcMode = 'steps' | 'quick' | 'question' | 'place' | 'gauge' | 'iv';

export interface ProcQuestion { q: string; options: string[]; answer: number; explain?: string }

/** Elektrode/Pad auf der Oberkörper-Figur: Ziel in Figur-Koordinaten (viewBox 200 × 260, Blick von vorn) */
export interface Electrode {
  id: string; label: string; color: string; x: number; y: number; r: number; where: string;
  /** Weitere richtige Stellen, z. B. am Extremitätenansatz */
  alt?: { x: number; y: number; r: number }[];
}
export interface Placement {
  task: string;
  /** Ausschnitt der Figur [x, y, Breite, Höhe], z. B. nur der Brustkorb */
  view?: number[];
  variants: { name: string; electrodes: Electrode[] }[];
}

export interface Procedure {
  title: string;
  steps: ProcStep[];
  /** Gewichtung der Modi; fehlt sie, gilt rules.procedure.modes */
  modes?: Partial<Record<ProcMode, number>>;
  quick?: string;
  questions?: ProcQuestion[];
  place?: Placement;
  gauge?: GaugeConfig;
  iv?: IvConfig;
}

/** i.v.-Zugang als Minispiel: stauen, Vene wählen, desinfizieren, Winkel, Vorschieben, Reihenfolge */
export interface IvVein { id: string; x: number; y: number; r: number; quality: 'good' | 'ok' | 'bad'; label: string; why: string }
export interface IvConfig {
  veins: IvVein[];
  wait: number;
  waitText: string;
  angle: number[];
  order: string[];
  pts: Record<'stau' | 'vein' | 'hygiene' | 'angle' | 'hit' | 'order', number>;
  texts: Record<string, string>;
}
export interface IvRun { stauOk: boolean; vein: string; early: boolean; retouched: boolean; angle: number; hit: 'in' | 'through' | 'short'; order: string[] }

/** Blutdruck von Hand messen: Manschette aufpumpen, ablassen, Korotkow-Töne hören */
export interface GaugeConfig {
  task: string;
  max: number;
  pumpStep: number;
  /** Ablassgeschwindigkeit in mmHg/s */
  rates: { slow: number; fast: number; open: number };
  tolerance: number;
  /** So weit über systolisch muss mindestens gepumpt werden */
  pumpAbove: number;
  maxRate: number;
  pts: { value: number; technique: number };
  texts: Record<'low' | 'fast' | 'good' | 'sys' | 'dia' | 'score', string>;
}

/* ------------------------------------------------------------ EKG */
/** Gauß-Welle: [Zeitpunkt relativ zum Ereignis in s, Breite in s, Amplitude in mV] */
export type Wave = [number, number, number];
export type Range = [number, number];

export type RhythmPattern =
  | { type: 'sinus'; hr: Range; pq: number | Range; st?: number }
  | { type: 'irregular'; rr: Range; baseline?: 'fib' }
  | { type: 'flutter'; flutterInterval: number; ratios: number[] }
  | { type: 'regular'; hr: Range; complex: string }
  | { type: 'wenckebach'; atrialHr: Range; cycles: number[]; pq: number; pqStep: number }
  | { type: 'mobitz2'; atrialHr: Range; ratios: number[]; pq: number }
  | { type: 'dissociated'; atrialHr: Range; hr: Range; complex: string }
  | { type: 'bigeminy'; hr: Range; pq: number; coupling: number; ectopic: string }
  | { type: 'paced'; hr: Range; complex: string }
  | { type: 'continuous'; wave: 'vf' | 'asystole' | 'torsade'; hr?: Range };

export interface RhythmDef {
  name: string;
  pulse: boolean;
  shockable: boolean;
  analysis: { rate: string; regular: string; qrs: string; p: string; todo: string };
  pattern: RhythmPattern;
  help: string;
  hint?: string;
  monitorRate?: number;
  vignettes: string[];
}

export interface ProStep { id: string; q: string; field: 'rate' | 'regular' | 'qrs' | 'p' | 'rhythm' | 'todo'; pts: number; help: string; choices?: number; needPulse?: boolean }

export interface EcgData {
  morphology: Record<string, Wave[]>;
  analysisOptions: Record<'rate' | 'regular' | 'qrs' | 'p' | 'todo', Record<string, string>>;
  rhythms: Record<string, RhythmDef>;
  trainer: {
    basic: { title: string; rhythms: string[]; extraWeight: string[]; choices: number };
    pro: {
      sets: Record<string, { label: string; rhythms: string[] | '*' }>;
      stripSeconds: number;
      steps: ProStep[];
      pulseTip: { rhythms: string[]; text: string };
    };
    caseQuiz: { pool: string[]; choices: number };
    reaQuiz: { choices: string[]; roscLabel: string };
  };
}

/** Zufällige Störungen je nach Schwierigkeit (rules.json: stress) */
export interface StressConfig {
  worsenFactor: Record<string, number>;
  interruptions: Record<string, number>;
  window: number[];
  pool: (Omit<Moment, 'id'> & { id: string; except?: string[]; only?: string[] })[];
}
