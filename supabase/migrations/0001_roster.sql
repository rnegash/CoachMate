-- Slice 1: roster copy (Google Sheets -> Supabase, one-way pull).
-- Run in the Supabase SQL editor.

create table public.players (
  -- player_id from the Sheet's ID column. Pseudonymous: this is the only
  -- player key that may ever reach the Claude API.
  id text primary key constraint players_id_format check (id ~ '^P[0-9]{1,6}$'),
  name text not null,
  jersey_number text,
  -- Set when the player no longer appears in the Sheet; null = on roster.
  -- Kept as a row (not deleted) so goals stay attached; the check-in text
  -- deletion rule (CLAUDE.md retention) will key off this in slice 3.
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sheet_syncs (
  id bigint generated always as identity primary key,
  source text not null check (source in ('roster')),
  synced_at timestamptz not null default now(),
  rows_synced integer not null,
  rows_skipped integer not null
);

-- RLS on with no policies: the publishable/anon key (shipped to the
-- browser) can read nothing. All access is server-side via the
-- service-role key.
alter table public.players enable row level security;
alter table public.sheet_syncs enable row level security;
