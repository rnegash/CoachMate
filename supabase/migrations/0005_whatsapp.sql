-- Slice 3: WhatsApp check-ins (contacts, consent, stored check-in text).
-- Run in the Supabase SQL editor.
--
-- Split by who may read what (CLAUDE.md, "BotMatcher / BotDelivery
-- Boundary Split"): phone numbers live only in player_contacts, never in
-- players or next to goal / check-in text. No score, priority or signal
-- strength field anywhere, by design (CLAUDE.md, "No priority/urgency
-- scoring").

-- Phone numbers copied from the Roster Sheet's optional "phone" column on
-- every roster sync (one-way, like players). Read only by BotDelivery.
create table public.player_contacts (
  player_id text primary key references public.players (id) on delete cascade,
  -- E.164, e.g. +4917612345678. Normalized by the sync before insert.
  phone text not null unique constraint player_contacts_phone_e164 check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  updated_at timestamptz not null default now()
);

-- WhatsApp opt-in state per player. A "START" keyword sets opted_in_at and
-- consent_version and clears opted_out_at; "STOP" sets opted_out_at, which
-- halts messages immediately and starts the 7-day grace period after which
-- the player's stored check-ins are deleted (see goal_checkins below).
create table public.whatsapp_consents (
  player_id text primary key references public.players (id) on delete cascade,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  -- Which consent wording the player agreed to.
  consent_version text,
  updated_at timestamptz not null default now()
);

-- Raw check-in text, stored so the coach can read it. Only check-ins
-- linked to one of the player's goals are stored; unmatched messages are
-- never stored. One implied signal ("worked on it"), so no signal column.
--
-- Retention (CLAUDE.md, "Retention rule"): a player's rows are deleted
--   - 7 days after STOP (whatsapp_consents.opted_out_at), by the daily
--     /api/cron/retention job, and
--   - when the player is removed from the roster, by the roster sync.
-- Deletion removes the whole row; there is no separate redaction step.
create table public.goal_checkins (
  id uuid primary key default gen_random_uuid(),
  player_id text not null references public.players (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  text text not null constraint goal_checkins_text_not_blank check (length(btrim(text)) > 0),
  created_at timestamptz not null default now()
);

create index goal_checkins_goal_id_created_at_idx on public.goal_checkins (goal_id, created_at desc);
create index goal_checkins_player_id_idx on public.goal_checkins (player_id);

-- TEMPORARY holding area for the share confirmation: before anything goes
-- into goal_checkins, the bot asks the player "share this with your coach?
-- YES/NO" and holds the message here. Never shown to the coach.
--   - One draft per player; a new message replaces it (upsert on player_id).
--   - goal_id is null while the bot waits for the player to pick a goal.
--   - Deleted on YES (moved into goal_checkins), on NO, on STOP
--     (immediately, no grace period), on roster removal (roster sync), and
--     once expires_at has passed (24 h; daily /api/cron/retention job).
create table public.checkin_drafts (
  player_id text primary key references public.players (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete cascade,
  text text not null constraint checkin_drafts_text_not_blank check (length(btrim(text)) > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Same access model as 0001-0004: RLS on with no policies, and only the
-- server-side service_role gets privileges.
alter table public.player_contacts enable row level security;
alter table public.whatsapp_consents enable row level security;
alter table public.goal_checkins enable row level security;
alter table public.checkin_drafts enable row level security;
grant select, insert, update, delete on public.player_contacts to service_role;
grant select, insert, update, delete on public.whatsapp_consents to service_role;
grant select, insert, update, delete on public.goal_checkins to service_role;
grant select, insert, update, delete on public.checkin_drafts to service_role;
