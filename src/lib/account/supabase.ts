/* Minimaler Supabase-Client (Auth + REST) ohne SDK.
   URL und publishable key sind öffentlich gedacht; den Schutz übernimmt Row Level Security. */
import config from '../../data/backend.json';

export const ENABLED = !!(config.url && config.publishableKey);
const LS_REFRESH = 'rs_refresh';

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

export const storage = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* privater Modus */ } },
};

export interface User { id: string; email: string }
interface Session { access_token: string; refresh_token: string; expires_in?: number; user?: User }

let access: string | null = null;
let expires = 0;
let refreshing: Promise<boolean> | null = null;

async function raw<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: config.publishableKey, ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = 'Bearer ' + token;
  let r: Response;
  try { r = await fetch(config.url + path, { ...init, headers }); } catch { throw new ApiError('Server nicht erreichbar.'); }
  const text = await r.text();
  const body = text ? JSON.parse(text) : null;
  if (!r.ok) throw new ApiError(body?.msg ?? body?.message ?? body?.error_description ?? body?.error ?? `HTTP ${r.status}`, r.status);
  return body as T;
}

function takeSession(d: Session): User | undefined {
  access = d.access_token;
  expires = Date.now() + (d.expires_in ?? 3600) * 1000 - 60000;
  storage.set(LS_REFRESH, d.refresh_token);
  return d.user;
}

export const hasSession = () => !!storage.get(LS_REFRESH);

async function refresh(): Promise<boolean> {
  const rt = storage.get(LS_REFRESH);
  if (!rt) return false;
  refreshing ??= raw<Session>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: rt }) })
    .then((s) => { takeSession(s); return true; })
    .catch((e: ApiError) => { if (e.status && e.status < 500) storage.set(LS_REFRESH, null); return false; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function api<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  if ((!access || Date.now() > expires) && !(await refresh())) throw new ApiError('Nicht angemeldet', 401);
  try {
    return await raw<T>(path, init, access!);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !retried) { access = null; return api(path, init, true); }
    throw e;
  }
}

export async function login(email: string, password: string): Promise<User | undefined> {
  return takeSession(await raw<Session>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }));
}

/** Gibt den Nutzer zurück, wenn keine E-Mail-Bestätigung nötig ist */
export async function register(email: string, password: string): Promise<User | undefined> {
  const r = await raw<Session | User>('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
  return 'access_token' in r ? takeSession(r) : undefined;
}

export async function logout() {
  if (access) raw('/auth/v1/logout', { method: 'POST' }, access).catch(() => {});
  storage.set(LS_REFRESH, null);
  access = null;
}

export const currentUser = () => api<User>('/auth/v1/user');
export const insert = (table: string, row: object) => api(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
export const select = <T>(table: string, query: string) => api<T[]>(`/rest/v1/${table}?${query}`);
