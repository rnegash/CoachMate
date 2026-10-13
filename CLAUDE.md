# CoachMate

## Project Identity

CoachMate is a coaching-support tool for a volunteer ultimate frisbee coach
(~40-member leisure team, ~20 at training) who lacks formal coaching training
and bandwidth to turn vague verbal goals into SMART ones mid-training.

Two core value props:

1. A weekly prioritization signal (who needs a check-in), based on
   attendance + check-ins + goal follow-up.
2. An AI coaching mentor for SMART-goal suggestions and tips.

Built as a single-tenant app for one coach's own team (real validation,
not a multi-team product). Open-sourcing the code is a possible later step;
it does not change the architecture now.

## Tech Stack

- Frontend/Backend: Next.js
- Database: Supabase (roster/attendance copies, Goals, WhatsApp check-ins)
- External data source: Google Sheets (Roster, Attendance) — one-way
  periodic pull into Supabase; attendance writes go back to Sheets directly
- AI: Claude API — two separate integrations, "Goal Mentor" (goal text
  only, see Data-Flow section) and "Assistant Coach" (stateless, no player
  context)
- Hosting: Vercel (free tier)
- Player checkins via messages: Twilio Sandbox, WhatsApp
- Design system: "Sideline" (tokens + component specs at
  https://claude.ai/artifact/KiRrpPFaV6A3KcxsasfHzY) — `ui-builder`
  implements against this directly rather than inventing its own styling

## Timeline

5 weeks, Sep 21 – Oct 26, 2026. See course Kursplan for weekly phase breakdown.

Week 3–4 slice order and two-day block mapping live in
`documentation/CoachMate_Implementation_Plan.md` — read that file at the
start of a session to see which slice/day is current. This file does not
duplicate that content; it only carries scope, data-flow, and compliance
rules that apply regardless of which slice is active.

## Current Scope Boundaries

### Explicitly out of scope (for now)

- Full user authentication (signup, sessions, password reset, roles) —
  not needed for a single-tenant, single-coach app
- Error handling beyond the basics needed for a working demo
- Automated testing beyond unit tests — end-to-end, component-rendering,
  and integration tests (against Supabase, Sheets, Claude API, Twilio)
  stay out of scope
- Formal deployment pipeline (CI/CD) — manual Vercel deploys are fine
- Multi-tenancy / multi-team support — single coach, single team, by design
- Gender as a stored/groupable player field — dropped from scope
- Advice-giving bot feature — removed from scope entirely (was the
  strictest Art. 50 case; removing it also removes that risk)
- WhatsApp bot settings (Passive/proactive, Adaptive; default + per-player
  override) — deferred 2026-10-13. The bot only replies, so the toggles
  would do nothing; proactive reminders need new consent wording and, outside
  WhatsApp's 24 h window, an approved template the sandbox can't provide.
  "Adaptive" is undefined. See Implementation Plan, slice 6.
- PWA layer — considered and rejected for this phase (stale offline data
  risk; WhatsApp already covers reaching people without opening the app).
  Revisit only if time remains after core slices.

### In scope now

- Coach Web App (Next.js) — overview/briefing, attendance, player detail,
  goal capture + AI refine, assistant coach chat
- Supabase — roster/attendance copies, Goals, WhatsApp check-ins
- Google Sheets — one-way pull into Supabase; attendance write-back
- Claude API — Goal Mentor + Assistant Coach integrations
- Player check-ins via WhatsApp (`BotMatcher` / `BotDelivery` split — see
  dedicated section below)
- Training sessions come only from the Sheet — the Google Sheet is planned
  ahead with a column per training session for the term, headed by its
  date (+ optional label for extra sessions, e.g. "2026-10-07 Extra skills
  session"). The app never creates Sheet columns, rows, or standalone
  session data, and has no "add session" flow (removed: it read as
  creating sessions). The Attendance tab lists the synced sessions as
  Today / Upcoming / Past; for an extra session the coach adds its column
  in the Sheet, then syncs. Attendance itself still follows the existing
  sync model (Sheets → Supabase one-way pull; app → Sheets write-back for
  marks, writing only changed cells, with the column and player row looked
  up live at save time).
- Single shared-password gate via middleware (one env var, no accounts/
  sessions) — distinct from the full auth system above, which stays out
  of scope. Needed because the app will run on a public Vercel URL and
  shows real player names/data.

### Unit tests (in scope)

- Vitest, `npm test`. Tests live next to their module as `lib/**/*.test.ts`
  and run in plain Node — no rendering, no network, no DB.
- Filtering, sorting, formatting, parsing and diff logic goes in a pure
  `lib/` module (no `server-only`, no Supabase/Sheets client at import), not
  inline in pages/components or sync files, so it can be tested in
  isolation. Pages, components, server actions and `*-sync.ts` files only
  wire I/O to those helpers.

### Not yet decided

- Whether pilot test #1 includes a real player or is Alex-only

## Data-Flow & Privacy Boundaries

### Core rule

Real names, jersey numbers, and other directly identifying data stay in
Sheets/Supabase. Only free text (goal texts, check-in messages) may reach the
Claude API; no player ID, attendance or behavioral signal is sent today. No code path should send a player's
real name to the Claude API.

### Goal Mentor

- Sees: the coach's goal draft text and the player's other active goal
  texts. Check-in signals may be added later (separate decision). The
  pseudonymous player ID is allowed but not needed, and is not sent.
- Does not see attendance (decided 2026-10-07): it says nothing about
  why sessions were missed, the player is usually present while the goal
  is drafted, and a count read out in front of them can feel like
  judgement. Prompt and spec: `documentation/AI goal mentor/`
- Does not see: real name, phone number, or any other direct identifier
- Before sending, the server replaces the selected player's own name
  with "the player" in the draft and in the other goal texts (a coach may
  have typed it). Saved goals are stored the same way (decided
  2026-10-08), because the check-in matcher sends them to Claude and
  can't strip names itself. Other people's names are not detected; the static
  caption below covers them.
- A static instructional caption is shown wherever free text (goal notes,
  Assistant Coach messages) is entered, stating that only the text itself
  reaches the AI — no names or contact details should be included. This
  is always-visible text, not active detection of what the coach actually
  typed (see Future Ideas).

### Goals (stored)

- Supabase only, no Sheet counterpart. Fields: goal text, `status`
  (`active` / `completed`), `created_at`, `updated_at` (shown as the
  goal's last activity), `completed_at` (decided 2026-10-08).
- These are neutral lifecycle facts. No score, priority, progress or
  AI-involvement field.
- Deleted when the player is removed from the roster (see Retention rule).

### Assistant Coach

- Stateless, no player context, no DB access — general advisory chat only
- Single session only — no persistent or browsable chat history (decided;
  do not build session storage for this)
- Same static instructional caption applies on the message input
- Nothing from this chat is written to any player record

### Residual risk (accepted, not solved)

ID linkage across systems (Sheets ↔ Supabase ↔ Claude API) is a known
residual risk. Mitigation is strict per-system access rights, not
elimination of the linkage itself.

The BotMatcher/BotDelivery split is enforced in code only (accepted
2026-10-08 for the pilot). Both sides run in the same Vercel deployment
and use the Supabase service-role key, so the database doesn't stop either
side reading the other's tables; `lib/bot-boundary.test.ts` catches direct
references only. Separate database roles were considered and not built:
with the service-role key in the same deployment they would only catch
mistakes, not isolate the sides. If the split must hold against faulty or
compromised code, the step that delivers it is separate deployments, each
holding only its own scoped key.

Twilio, WhatsApp (Meta) and Anthropic keep their own copies of messages
under their own retention rules; CoachMate's deletion rules only cover
Supabase. Accepted 2026-10-08 and disclosed in the consent text. To do:
check whether Twilio's message redaction setting is available on this
account and, if so, turn it on and record it here.

### Phrasing rule for attendance/engagement data

Any attendance or engagement data surfaced to the coach must read as
neutral fact, never judgment. Use concrete, factual phrasing only
(e.g. "3x abwesend, letzte Zielaktivität vor 2 Wochen").
Never: evaluative labels (e.g. "demotiviert"), or any computed
priority/urgency score.

### Open items (not yet resolved — do not assume closed)

- Retention/deletion rule for check-in text: defined and built
  (2026-10-08, see Retention rule); Compliance Status still to be updated
- Consent wording covering stored check-in text: drafted in
  `lib/bot-consent.ts` (2026-10-08), not yet reviewed outside the team
- DPA/SCC confirmation with Claude API provider and Twilio outstanding
- Roster is assumed adults-only (no parental consent handling built)

## BotMatcher / BotDelivery Boundary Split

WhatsApp check-ins are split into two components so that the code that
interprets messages never sees contact PII, and the code that handles
contact PII never interprets messages. BotMatcher (matching and reply
texts) never sees phone numbers or roster data; BotDelivery (phone
numbers, consent, Twilio) never matches goals or calls the AI. Only the
webhook entry point (`app/api/whatsapp/route.ts` → `handleIncoming`) holds
both the phone number and the message text, and it only resolves the
player ID and passes the text on.

### BotMatcher

- Sees: player ID + goal text (for AI-assisted check-in matching)
- Never sees: phone number, Twilio metadata, or any roster PII
- Responsible for interpreting a player's free-text check-in against their
  active goal

### BotDelivery

- Sees: phone number, Twilio payload, roster PII (for ID ↔ phone resolution
  and actual message delivery)
- Never sees: message-generation logic / goal-matching logic
- Responsible for getting messages to/from the right phone number only

### What gets persisted

Decided 2026-10-08. The bot only handles updates on a player's active
goals; anything else is not stored. If the bot gains other features,
each needs its own decision here.

- **Shared check-ins (`goal_checkins`):** row ID + player ID + goal ID +
  the player's raw message text + timestamp. Stored only after the player
  answers YES to "share this update with your coach?", asked for every
  update. The single implied signal is "worked on it"; there is no signal,
  score or status column. The text can name third parties.
- **Drafts (`checkin_drafts`):** temporary, at most one per player:
  player ID, the message text, the goal ID once matched or picked, and
  created/expiry timestamps (`expires_at`, 24 h). Held only while the bot
  waits for the goal number or YES/NO. Never shown to the coach.
- **Contacts (`player_contacts`):** player ID → phone (+ `updated_at`),
  copied from the optional `phone` column of the Roster Sheet. Read only
  by BotDelivery; never shown in the coach UI.
- **Consent (`whatsapp_consents`):** player ID, opt-in and opt-out
  timestamps, the version of the consent wording agreed to, and
  `updated_at`. Not shown in the coach UI — neither whether a player has
  joined nor whether or when they sent STOP (decided 2026-10-12).
- Not stored: messages that aren't confirmed with YES, messages from
  numbers not on the roster, and messages from players who haven't opted
  in or have sent STOP.
- Which tables each side uses: BotDelivery reads `player_contacts`,
  `players` (roster status only) and `whatsapp_consents`; BotMatcher reads
  `goals` and writes `checkin_drafts` and `goal_checkins`. On STOP,
  BotDelivery deletes the draft by calling BotMatcher's `discardDraft`
  (player ID only), never by touching `checkin_drafts` itself. Enforced in code
  by `lib/bot-boundary.test.ts`, not by the database: both use the
  service-role key (accepted residual risk, see "Residual risk").

### Retention rule

- "STOP" halts future messages immediately.
- "STOP" also starts a grace-period deletion: past check-in text
  authored by that player is deleted after 7 days (not instantly) —
  avoids irreversible loss from an accidental/impulsive opt-out.
- Independent of STOP: a player's check-in text is deleted when that
  player is removed from the roster, rather than on a fixed calendar
  duration. A player who never sends STOP and stays on the roster keeps
  their check-in history for as long as they're on the team.
- Goals follow the same roster rule (decided 2026-10-08): a player's
  goals are deleted when that player is removed from the roster (the
  roster sync deletes them). STOP does not affect goals.
- Drafts are deleted on YES (moved to `goal_checkins`), on NO, when a
  new message replaces them, immediately on STOP, on roster removal, and
  after 24 h (the bot ignores an expired draft at once; the daily job
  deletes it within the next day).
- Timing: one daily job (`/api/cron/retention`, 03:00 UTC) first runs the
  roster sync, then the purge (decided 2026-10-08). So roster-removal
  deletion happens within a day of the Sheet change, and STOP deletion
  7–8 days after STOP. Texts shown to players and the coach say "within a
  day", not an exact time. A manual sync from the app still applies
  removals at once.
- START within the 7-day grace period cancels the deletion.
- Only the first STOP sets the opt-out date; repeating STOP doesn't
  restart the 7 days. After a START, the next STOP starts a new period.
- Deleting a player's check-in text deletes the whole record as stored —
  no separate redaction step for third-party mentions within it. A
  third-party's name disappearing is a byproduct of deleting the
  authoring player's data, not a mechanism of its own. A third party's
  own standing right over being named in someone else's check-in is not
  solved by this rule — not yet addressed (see open questions).

### Clarifying-question text

Every message the bot sends — consent text, "which goal?", "share with
your coach?", confirmations — is templated/fixed text, not freely
AI-generated (`lib/bot-consent.ts`, `lib/checkin-flow.ts`). Claude only
picks which goal a message is about. Bot messages quote the player's goal texts
unlabeled (decided 2026-10-08): a saved goal is text the coach accepted or
edited, not raw AI output, and the "Goals may have been written with the
help of AI." footnote stays a coach-UI notice only. Treat it as outside Art. 50
labeling scope. If this is ever changed to be dynamically generated,
flag it for an Art. 50 labeling review before shipping.

### Consent / opt-in

WhatsApp opt-in is keyword-based ("START"), timestamped, stores the
consent wording version, and is revocable via "STOP". A player on the
roster who hasn't opted in gets the consent text and nothing else; their
message is not stored. Consent belongs to the number that sent START: when a
player's phone changes or is removed in the Sheet, the roster sync resets
their opt-in and deletes any pending draft, so the new number must send
START itself (decided 2026-10-08). The same reset happens when a player
is removed from the roster, so a returning player opts in again under the
current wording. An earlier STOP and its 7-day deletion are kept. The consent text states the AI, the per-update
YES before sharing, the draft and retention periods, and US processing.
Twilio webhooks must be signature-verified. US processing (via Twilio) is
accepted but must be documented openly, not hidden in fine print.

### Build note

This is the biggest implementation slice (Days 5–6 per Implementation
Plan) — core round-trip plus the retention rule and consent wording above.
No edge-case hardening expected at this stage. The workflow/agent
flowchart (MUSS-Kriterium) is tracked as a parallel deliverable.

## Compliance Rules to Enforce at Code Level

### Art. 50 — AI-content labeling (in force since Aug 2, 2026)

- Every Goal Mentor suggestion shown to the coach must be visibly labeled
  "AI-generated" — not implied by placement or icon alone, an explicit
  label.
- Every Assistant Coach response must carry the same label.
- Saved goals are not labeled individually and no AI flag is stored
  (decided 2026-10-07). The Goals section on Player Detail always shows
  a static footnote: "Goals may have been written with the help of AI."
  Do not remove it or hide it behind a setting.
- Goal Mentor suggestions require one-click Accept / Edit / Dismiss —
  never auto-applied to a player's record.
- Assistant Coach chat has no Accept/Edit/Dismiss and writes nothing to
  any player record (chat is advisory only — see data-flow section).
- The WhatsApp clarifying question is templated/fixed text, not freely
  generated — stays unlabeled by design. If this is ever changed to be
  dynamically generated, that change requires an Art. 50 labeling review
  before shipping, not after.

### Art. 50(1) — disclosure of AI interaction

- Applies to the Assistant Coach since it talks directly to the coach.
  A static notice (e.g. shown once, or persistent in the chat header) is
  sufficient per current design — do not remove or hide it behind a
  settings toggle.

### No priority/urgency scoring

- Do not compute or display any single priority/urgency score for a
  player, however derived (not from attendance, not from goal lapse time,
  not combined signals). This was explicitly rejected in user research —
  the team is leisure, not competitive, and a score reads as judgment.
- Attendance/engagement data shown to the coach must use neutral, factual
  phrasing only (see data-flow section for the exact pattern). Do not
  introduce evaluative labels even as an internal field name that later
  surfaces in the UI (e.g. a DB column called `urgency_score` or
  `at_risk` is itself a violation of this rule, not just its display).

### No-names controls (cross-reference)

- Required: the static instructional caption on every free-text input
  whose text reaches the Claude API (goal drafts, Assistant Coach
  messages) — defined in the data-flow section above, restated here
  because it's a compliance control, not just a UX nicety. Do not remove
  it or hide it behind a setting.
- Server-side, the selected player's own name is replaced with "the
  player" in Goal Mentor requests and in saved goal texts (see Goal
  Mentor section). Other names are not detected.
- Active name-pattern detection is deferred (see Future Ideas), not
  required.

## For Subagents & Skills

This file is the single source of truth for scope, data-flow boundaries,
and compliance rules. Subagent definitions (`.claude/agents/*.md`) should
read this file directly at the start of their run rather than restating
these rules inline, to avoid drift between copies.

- `ai-integration` and `compliance-reviewer` should both `Read` this file
  at the start of their run rather than each encoding their own copy of
  the data-boundary and Art. 50 labeling rules.
- `compliance-reviewer` runs read-only (no Write access) and checks a
  day's diff against: Art. 50 labeling present where required, no
  priority/urgency scoring introduced (including in field/column names),
  neutral phrasing on attendance/engagement data, and no real name or
  direct identifier reaching the Claude API.
- Any subagent touching the WhatsApp check-in path must respect the
  BotMatcher/BotDelivery split as a hard boundary, not just a suggested
  pattern — each sees only its allowed data (see dedicated section).
- If a subagent's task would require persisting something not already
  covered here (a new field, a new table, a new API payload shape), stop
  and flag it rather than assuming it's fine — this file is not
  exhaustive of every future case, only of what's been decided so far.

## Future Ideas (explicitly deferred, not current scope)

- Active name-pattern detection: a regex/heuristic that scans free text
  as the coach types and warns (or blocks submission) only when it
  spots something that looks like a real name, rather than relying
  solely on the static instructional caption. Decided against for now
  because the static caption is lower-effort and was what the hi-fi
  prototype actually showed; revisit if the static caption proves
  insufficient in practice (e.g. during pilot test #1).
- Copyable Google Sheet templates: ready-made Roster and Attendance Sheets
  with the headers the sync expects (`player_id`, `name`, optional `jersey`
  on Roster; `player_id` plus one date column per session, optionally
  "YYYY-MM-DD Label" for extra sessions, on Attendance), so a coach copies
  them instead of building the layout by hand. Most useful if the code is
  open-sourced; would not change the sync's read-only access to Sheets.
- Team-specific AI reference: a second document next to the generic sport
  reference (`documentation/AI sport knowledge/`) for one team's own
  terms, structures and drills, loaded into the Assistant Coach and Goal
  Mentor prompts. The sport reference itself stays team-neutral.

## Known Open Questions (carried forward, do not assume resolved)

1. DPA/SCC confirmation with Claude API provider and Twilio is scheduled
   as a status check by Day 8 of the Implementation Plan, but not
   necessarily resolved by then.
2. A third party's own standing right over being named in someone else's
   stored check-in text is unresolved. The current retention rule only
   covers what happens when the _authoring_ player's data is deleted
   (roster removal, or STOP's 7-day grace period) — it does not address
   whether a mentioned third party has any independent claim over that
   text while it's still retained.
