-- Slice 2: player goals. Lives only in Supabase (no Sheet counterpart).
-- Run in the Supabase SQL editor.
--
-- Stores only the goal text the coach saves. Nothing from a Goal Mentor
-- response is stored, and no flag records AI involvement: the Goals
-- section shows a static footnote instead (CLAUDE.md, Art. 50 section).
-- No score, priority or progress field, by design (CLAUDE.md, "No
-- priority/urgency scoring").

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  player_id text not null references public.players (id) on delete cascade,
  text text not null constraint goals_text_not_blank check (length(btrim(text)) > 0),
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  -- Last change to the goal; shown as its last activity.
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint goals_completed_at_matches_status
    check ((status = 'completed') = (completed_at is not null))
);

create index goals_player_id_idx on public.goals (player_id);

-- Same access model as 0001-0003: RLS on with no policies, and only the
-- server-side service_role gets privileges.
alter table public.goals enable row level security;
grant select, insert, update, delete on public.goals to service_role;
