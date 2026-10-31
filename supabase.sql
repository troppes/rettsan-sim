-- RettSan Sim: Tabellen für Login und Fortschritt.
-- Ist im Projekt bereits eingespielt (Migration "rettsan_fortschritt"); hier zur Dokumentation.
-- Jeder angemeldete Nutzer darf nur seine eigenen Zeilen anlegen, lesen und löschen.

create table if not exists public.rettsan_einsaetze (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  fall text not null,
  meldung text,
  prozent smallint,
  punkte smallint,
  max_punkte smallint,
  dauer_s integer,
  diagnose_richtig boolean,
  detail boolean,
  fehler jsonb default '[]'::jsonb,
  vergessen jsonb default '[]'::jsonb
);

create table if not exists public.rettsan_ekg (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  rhythmus text not null,
  modus text,
  richtig boolean,
  punkte smallint,
  max_punkte smallint
);

create index if not exists rettsan_einsaetze_user on public.rettsan_einsaetze (user_id, created_at desc);
create index if not exists rettsan_ekg_user on public.rettsan_ekg (user_id, created_at desc);

alter table public.rettsan_einsaetze enable row level security;
alter table public.rettsan_ekg enable row level security;

drop policy if exists "eigene lesen" on public.rettsan_einsaetze;
drop policy if exists "eigene anlegen" on public.rettsan_einsaetze;
drop policy if exists "eigene loeschen" on public.rettsan_einsaetze;
create policy "eigene lesen" on public.rettsan_einsaetze for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigene anlegen" on public.rettsan_einsaetze for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigene loeschen" on public.rettsan_einsaetze for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "eigene lesen" on public.rettsan_ekg;
drop policy if exists "eigene anlegen" on public.rettsan_ekg;
drop policy if exists "eigene loeschen" on public.rettsan_ekg;
create policy "eigene lesen" on public.rettsan_ekg for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigene anlegen" on public.rettsan_ekg for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigene loeschen" on public.rettsan_ekg for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.rettsan_einsaetze, public.rettsan_ekg to authenticated;

revoke all on public.rettsan_einsaetze, public.rettsan_ekg from anon;
