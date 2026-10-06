-- Slice 4: attendance copy (Google Sheets -> Supabase, one-way pull).
-- Mirrors the Sheet: one session per existing Sheet column, never created
-- independently of it.

create table public.attendance_sessions (
  -- Normalized column header: "2026-10-07" or "2026-10-07 Extra skills session".
  id text primary key,
  session_date date not null,
  label text,
  -- A1 column letter in the Sheet, refreshed every sync (target for the
  -- slice 5 write-back).
  sheet_column text not null,
  unique nulls not distinct (session_date, label)
);

create table public.attendance_marks (
  player_id text not null references public.players (id) on delete cascade,
  session_id text not null references public.attendance_sessions (id) on delete cascade,
  -- true = present (TRUE in the Sheet), false = absent (FALSE).
  -- "Not counted" (blank cell) is stored as no row. No reason is stored.
  present boolean not null,
  primary key (player_id, session_id)
);

alter table public.sheet_syncs drop constraint sheet_syncs_source_check;
alter table public.sheet_syncs
  add constraint sheet_syncs_source_check check (source in ('roster', 'attendance'));

-- Same access model as 0001/0002: RLS on with no policies, and only the
-- server-side service_role gets privileges.
alter table public.attendance_sessions enable row level security;
alter table public.attendance_marks enable row level security;
grant select, insert, update, delete on public.attendance_sessions to service_role;
grant select, insert, update, delete on public.attendance_marks to service_role;
