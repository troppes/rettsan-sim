/* Fortschritt aus den gespeicherten Ergebnissen berechnen (reine Funktionen). */
export interface CaseRow { fall: string; prozent: number; meldung?: string; diagnose_richtig?: boolean; fehler?: string[]; vergessen?: string[]; created_at?: string }
export interface EcgRow { rhythmus: string; modus: string; richtig: boolean }

export interface CaseStats { n: number; best: number; last: number; avg: number }

/** Zeilen neueste zuerst */
export function caseStats(rows: CaseRow[]): Record<string, CaseStats> {
  const out: Record<string, CaseStats & { sum: number }> = {};
  for (const r of rows) {
    const x = (out[r.fall] ??= { n: 0, best: 0, last: r.prozent ?? 0, avg: 0, sum: 0 });
    x.n++; x.sum += r.prozent ?? 0; x.best = Math.max(x.best, r.prozent ?? 0);
  }
  for (const x of Object.values(out)) x.avg = Math.round(x.sum / x.n);
  return out;
}

export function rhythmStats(rows: EcgRow[]) {
  const by: Record<string, { n: number; ok: number }> = {};
  for (const e of rows) { const r = (by[e.rhythmus] ??= { n: 0, ok: 0 }); r.n++; if (e.richtig) r.ok++; }
  return Object.entries(by).map(([key, r]) => ({ key, n: r.n, pct: Math.round((100 * r.ok) / r.n) })).sort((a, b) => a.pct - b.pct);
}

/** Häufige Fehler und vergessene Maßnahmen der letzten Einsätze */
export function frequentMistakes(rows: CaseRow[], last = 30, top = 6) {
  const cnt: Record<string, number> = {};
  for (const c of rows.slice(0, last)) {
    for (const t of [...(c.vergessen ?? []).map((x) => 'Vergessen: ' + x), ...(c.fehler ?? [])]) cnt[t] = (cnt[t] ?? 0) + 1;
  }
  return Object.entries(cnt).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, top).map(([text, n]) => ({ text, n }));
}
