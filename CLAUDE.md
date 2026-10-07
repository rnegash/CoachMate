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
- Database: Supabase (roster/attendance copies, Goals, Bot Settings/overrides)
- External data source: Google Sheets (Roster, Attendance) — one-way
  periodic pull into Supabase; attendance writes go back to Sheets directly
- AI: Claude API — two separate integrations, "Goal Mentor" (player ID +
  behavioral signals) and "Assistant Coach" (stateless, no player context)
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
- PWA layer — considered and rejected for this phase (stale offline data
  risk; WhatsApp already covers reaching people without opening the app).
  Revisit only if time remains after core slices.

### In scope now (Week 2–3)

- Coach Web App (Next.js) — overview/briefing, attendance, player detail,
  goal capture + AI refine, assistant coach chat, bot settings
- Supabase — roster/attendance copies, Goals, Bot Settings/overrides
- Google Sheets — one-way pull into Supabase; attendance write-back
- Claude API — Goal Mentor + Assistant Coach integrations
- Player check-ins via WhatsApp (`BotMatcher` / `BotDelivery` split — see
  dedicated section below)
- "Add training session" flow — the Google Sheet is planned ahead with a
  column per training session for the term. This flow does **not** create
  new Sheet columns or standalone session data; it matches an app-side
  session (regular or extra/ad hoc) to its corresponding already-existing
  column in the synced Sheet, via date (+ optional label for extra
  sessions, e.g. "Extra skills session"). If no matching column exists
  yet for an extra session, the flow cannot proceed — the coach adds the
  column in the Sheet first, outside the app. Attendance itself still
  follows the existing sync model (Sheets → Supabase one-way pull;
  app → Sheets write-back for marks) — this flow only resolves _which_
  column a session's attendance marks should write to.
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
Sheets/Supabase. Only a pseudonymous player ID plus behavioral signals or
free text may reach the Claude API. No code path should send a player's
real name to the Claude API.

### Goal Mentor

- Sees: player ID + behavioral signals (attendance, check-in history,
  goal text) relevant to generating a SMART-goal suggestion
- Does not see: real name, phone number, or any other direct identifier
- A static instructional caption is shown wherever free text (goal notes,
  Assistant Coach messages) is entered, stating that only an anonymous
  player ID and the text itself reach the AI — no names or contact
  details should be included. This is always-visible text, not active
  detection of what the coach actually typed (see Future Ideas).

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

### Phrasing rule for attendance/engagement data

Any attendance or engagement data surfaced to the coach must read as
neutral fact, never judgment. Use concrete, factual phrasing only
(e.g. "3x abwesend, letzte Zielaktivität vor 2 Wochen").
Never: evaluative labels (e.g. "demotiviert"), or any computed
priority/urgency score.

### Open items (not yet resolved — do not assume closed)

- No retention/deletion rule defined yet for check-in free text
  (GoalCheckins) — flagged 🔴 in Compliance Status
- Consent wording does not yet cover storing that text
- DPA/SCC confirmation with Claude API provider and Twilio outstanding
- Roster is assumed adults-only (no parental consent handling built)

## BotMatcher / BotDelivery Boundary Split

WhatsApp check-ins are split into two components specifically so no single
piece of code sees both message content and contact PII at once.

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

Raw player check-in free text **is** persisted (coach needs to read the
actual message, not just a derived signal) — alongside player ID + goal ID

- check-in signal. This text can name third parties.

Because this is stored, the following are must-build for this slice,
not deferred cleanup:

- A retention/deletion rule for stored check-in text
- Consent wording that explicitly covers storing that text (current
  wording does not yet)

### Retention rule

- "STOP" halts future messages immediately.
- "STOP" also starts a grace-period deletion: past check-in text
  authored by that player is deleted after 7 days (not instantly) —
  avoids irreversible loss from an accidental/impulsive opt-out.
- Independent of STOP: a player's check-in text is deleted when that
  player is removed from the roster, rather than on a fixed calendar
  duration. A player who never sends STOP and stays on the roster keeps
  their check-in history for as long as they're on the team.
- Deleting a player's check-in text deletes the whole record as stored —
  no separate redaction step for third-party mentions within it. A
  third-party's name disappearing is a byproduct of deleting the
  authoring player's data, not a mechanism of its own. A third party's
  own standing right over being named in someone else's check-in is not
  solved by this rule — not yet addressed (see open questions).

### Clarifying-question text

The "unclear check-in" clarifying question sent back to a player is
templated/fixed text, not freely AI-generated. Treat it as outside Art. 50
labeling scope. If this is ever changed to be dynamically generated,
flag it for an Art. 50 labeling review before shipping.

### Consent / opt-in

WhatsApp opt-in is keyword-based, timestamped, and revocable via "STOP".
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

### Name-pattern warning (cross-reference)

- Required client-side before free text reaches Goal Mentor or Assistant
  Coach APIs — defined in the data-flow section above, restated here
  because it's a compliance control, not just a UX nicety.

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
