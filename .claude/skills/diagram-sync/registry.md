# Diagram registry

Every technical diagram in the project, what it claims, and which docs and code
it must agree with. `/diagram-sync` reads this file on every run. When a diagram
is added, moved, renamed or removed, update this file in the same commit.

All diagrams are Mermaid blocks inside Markdown, so they render on GitHub.

---

## D1 · System architecture

- **File:** `documentation/CoachMate_Technical_Architecture.md`, section "Diagram"
- **Shows:** every component (Coach Web App, Supabase, Sheets, Goal Mentor,
  Assistant Coach, BotMatcher, BotDelivery, player phone) and what data flows
  between them, including what each Claude integration sees.
- **Companion text in the same file:** header "Updated …" line, "Scope",
  numbered "Decision Log", "Known Open Items". A change to the diagram usually
  needs a dated decision-log entry and an "Updated" note.
- **Sources of truth:**
  - `CLAUDE.md`: Tech Stack, Current Scope Boundaries, Data-Flow & Privacy
    Boundaries, BotMatcher / BotDelivery Boundary Split, "What gets persisted"
  - `documentation/CoachMate_Implementation_Plan.md` (built / deferred slices)
  - `documentation/AI goal mentor/`, `documentation/AI assistant coach/`,
    `documentation/AI checkin matcher/` (what each AI call sends)
- **Watch paths (a change here may affect D1):**
  `CLAUDE.md`, `documentation/CoachMate_Implementation_Plan.md`,
  `documentation/AI */**`, `lib/goal-mentor*.ts`, `lib/assistant-coach*.ts`,
  `lib/ai-prompt.ts`, `lib/bot-*.ts`, `lib/checkin*.ts`, `lib/sheets.ts`,
  `lib/*-sync.ts`, `lib/attendance-write.ts`, `lib/twilio.ts`, `app/api/**`,
  `app/actions/**`, `supabase/migrations/**`, `vercel.json`, `proxy.ts`
- **Known conventions:** dashed lines/`deferred` class set the WhatsApp path
  apart (not a "not built" marker, see Scope text). Deferred features are left
  out of the diagram and recorded in the decision log. Twilio stays in the
  diagram until the Meta Cloud API switch is built (decision 12).

## D2 · WhatsApp check-in process (one incoming message)

- **File:** `documentation/CoachMate_WhatsApp_Checkin_Flows.md`, section "1. Process"
- **Shows:** every branch a single incoming message can take: signature check,
  roster lookup, STOP/START, consent state, draft handling, YES/NO/goal number,
  length limit, Claude match, reply sent.
- **Sources of truth (code first; this chart is drawn from the built code):**
  `app/api/whatsapp/route.ts`, `lib/bot-delivery.ts`, `lib/bot-matcher.ts`,
  `lib/checkin-flow.ts`, `lib/bot-consent.ts`, `lib/twilio.ts`;
  `CLAUDE.md` "Consent / opt-in", "Clarifying-question text"
- **Watch paths:** the files above plus `lib/checkin*.ts`,
  `documentation/AI checkin matcher/**`
- **Check especially:** branch conditions and their order, character limit,
  reply wording summaries ("Reply: …") vs. templates in `lib/checkin-flow.ts`
  and `lib/bot-consent.ts`, what is or isn't stored on each branch.

## D3 · WhatsApp data flow (who sees and stores what)

- **File:** `documentation/CoachMate_WhatsApp_Checkin_Flows.md`, section "2. Data flow"
- **Shows:** which component (webhook route, BotDelivery, BotMatcher, roster
  sync, coach app, Claude) reads/writes which Supabase table, and what crosses
  each boundary.
- **Sources of truth:** `supabase/migrations/**` (tables and columns),
  `lib/bot-delivery.ts`, `lib/bot-matcher.ts`, `lib/roster-sync.ts`,
  `lib/checkins.ts`, `lib/goals.ts`, `app/api/whatsapp/route.ts`,
  `lib/bot-boundary.test.ts` (allowed table access per side);
  `CLAUDE.md` "What gets persisted", "Residual risk"
- **Watch paths:** the files above plus `lib/roster-sheet.ts`, `app/players/**`,
  `lib/twilio.ts`
- **Check especially:** table names and their column summaries, each side's
  table access matching `lib/bot-boundary.test.ts`, what the coach app reads,
  external processors (Twilio/Meta/Anthropic).

## D4 · Check-in data retention

- **File:** `documentation/CoachMate_WhatsApp_Checkin_Flows.md`, section "3. Retention"
- **Shows:** every way drafts, shared check-ins, goals, contacts and consent
  get deleted or reset, and when.
- **Sources of truth:** `lib/retention.ts`, `lib/retention-purge.ts`,
  `lib/roster-sync.ts`, `lib/bot-delivery.ts`, `lib/bot-matcher.ts`,
  `app/api/cron/retention/route.ts`, `vercel.json` (cron schedule);
  `CLAUDE.md` "Retention rule", "Consent / opt-in"
- **Watch paths:** the files above plus `supabase/migrations/**`
- **Check especially:** durations (24 h, 7 days, "within a day"), cron time,
  what STOP/START/roster removal/phone change each do.

---

## Shared companion text

`documentation/CoachMate_WhatsApp_Checkin_Flows.md` has a header line naming
the code files the charts were drawn from, plus prose under each chart
("Not shown: …", "What the coach never sees: …"). Keep both in step with the
charts.

## Places that link to diagrams

Update these if a diagram file is renamed or moved:
`README.md` (Documentation table, check-in section),
`documentation/CoachMate_Implementation_Plan.md`,
`documentation/archive/CoachMate_Project_Planning.md` (archive: only fix
broken links, don't rewrite history).
