/* Konto-Zustand für die Oberfläche: Anmeldung, Speichern mit Offline-Warteschlange, Fortschritt. */
import config from '../../data/backend.json';
import * as sb from './supabase';
import { caseStats, type CaseRow, type CaseStats, type EcgRow } from './progress';

const LS_QUEUE = 'rs_queue';
const LS_MAIL = 'rs_mail';
const T = config.tables;

type Row = { table: string; row: object };
const queue = (): Row[] => { try { return JSON.parse(sb.storage.get(LS_QUEUE) ?? '[]'); } catch { return []; } };
const setQueue = (q: Row[]) => sb.storage.set(LS_QUEUE, q.length ? JSON.stringify(q.slice(-200)) : null);

class Account {
  readonly enabled = sb.ENABLED;
  user = $state<sb.User | null>(null);
  /** Angemeldet, aber Nutzer noch nicht geladen (z. B. offline) */
  pending = $state(sb.hasSession());
  stats = $state<Record<string, CaseStats> | null>(null);
  lastMail = sb.storage.get(LS_MAIL) ?? '';

  get signedIn() { return !!this.user || this.pending; }

  async init() {
    if (!this.enabled || !sb.hasSession()) return;
    try { this.user = await sb.currentUser(); } catch (e) { if (e instanceof sb.ApiError && e.status === 401) this.pending = false; return; }
    this.pending = false;
    await this.flush();
    await this.loadStats();
  }

  private async signedInWith(user: sb.User | undefined, email: string) {
    sb.storage.set(LS_MAIL, email);
    this.lastMail = email;
    this.user = user ?? (await sb.currentUser());
    this.pending = false;
    await this.flush();
    await this.loadStats();
  }

  async login(email: string, password: string) { await this.signedInWith(await sb.login(email, password), email); }

  /** true = angemeldet, false = Bestätigungs-E-Mail verschickt */
  async register(email: string, password: string) {
    const u = await sb.register(email, password);
    if (!u) return false;
    await this.signedInWith(u, email);
    return true;
  }

  async logout() {
    await sb.logout();
    setQueue([]);
    this.user = null; this.pending = false; this.stats = null;
  }

  /** 'ok' gespeichert · 'queued' später · 'off' nicht angemeldet */
  async save(table: 'cases' | 'ecg', row: object): Promise<'ok' | 'queued' | 'off'> {
    if (!this.enabled || !sb.hasSession()) return 'off';
    try {
      await sb.insert(T[table], row);
      if (table === 'cases') this.loadStats();
      return 'ok';
    } catch (e) {
      if (!sb.hasSession()) { this.user = null; this.pending = false; return 'off'; }
      setQueue([...queue(), { table: T[table], row }]);
      return 'queued';
    }
  }

  async flush() {
    const rest: Row[] = [];
    for (const it of queue()) { try { await sb.insert(it.table, it.row); } catch { rest.push(it); } }
    setQueue(rest);
  }

  async loadStats() {
    try { this.stats = caseStats(await sb.select<CaseRow>(T.cases, 'select=fall,prozent&order=created_at.desc&limit=5000')); } catch { /* offline */ }
  }

  async history() {
    const q = 'order=created_at.desc&limit=1000';
    const [cases, ecg] = await Promise.all([
      sb.select<CaseRow>(T.cases, `select=fall,meldung,prozent,diagnose_richtig,fehler,vergessen,created_at&${q}`),
      sb.select<EcgRow>(T.ecg, `select=rhythmus,modus,richtig&${q}`),
    ]);
    return { cases, ecg };
  }
}

export const account = new Account();
if (typeof window !== 'undefined') window.addEventListener('online', () => account.flush());
