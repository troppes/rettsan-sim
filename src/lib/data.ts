/* Lädt alle Spieldaten (reines JSON) und baut Nachschlage-Tabellen. */
import type { Action, ActionGroup, ActionKind, CaseDef, EcgData, Letter, Procedure } from './types';
import actionsJson from '../data/actions.json';
import proceduresJson from '../data/procedures.json';
import rulesJson from '../data/rules.json';
import reaJson from '../data/rea.json';
import ecgJson from '../data/ecg.json';
import caseOrder from '../data/cases/index.json';

const caseFiles = import.meta.glob<CaseDef>('../data/cases/*.json', { eager: true, import: 'default' });

export const ECG = ecgJson as unknown as EcgData;
export const RULES = rulesJson;
export const REA = reaJson;
export const PROCEDURES = proceduresJson.procedures as Record<string, Procedure>;
export const EXPLAIN_WHY = proceduresJson.explainWhy;
export const LETTERS = actionsJson.letters as Letter[];

export const ACTION_GROUPS: Record<ActionKind, ActionGroup[]> = {
  assess: actionsJson.assess as ActionGroup[],
  ask: actionsJson.ask as ActionGroup[],
  treat: actionsJson.treat as ActionGroup[],
  rea: actionsJson.rea as ActionGroup[],
};

export const ACTIONS: Record<string, Action> = {};
for (const kind of Object.keys(ACTION_GROUPS) as ActionKind[]) {
  for (const g of ACTION_GROUPS[kind]) {
    for (const it of g.items) ACTIONS[it.id] = { ...it, kind, group: g.group, time: it.time ?? 15 };
  }
}

export const CASES: CaseDef[] = caseOrder.map((id) => {
  const c = caseFiles[`../data/cases/${id}.json`];
  if (!c) throw new Error(`Fall fehlt: ${id}`);
  return c;
});
export const caseById = (id: string) => CASES.find((c) => c.id === id);
