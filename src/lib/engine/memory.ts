/* Was über mehrere Einsätze hinweg im Kopf bleibt: welcher Modus zuletzt bei einer Maßnahme
   kam und welche Kurzfragen schon richtig beantwortet wurden. Die Oberfläche speichert das
   im Browser (siehe main.ts), die Engine kennt nur dieses Objekt. */
import type { ProcMode } from '../types';

export interface ProcMemory { lastMode?: ProcMode; right: number[] }

export const procMemory = {
  data: {} as Record<string, ProcMemory>,
  onSave: (_data: Record<string, ProcMemory>) => {},
  get(id: string): ProcMemory {
    return (this.data[id] ??= { right: [] });
  },
  save() { this.onSave(this.data); },
};
