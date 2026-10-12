# CoachMate

A coaching-support web app for one volunteer coach and their team: a weekly briefing of who might need a check-in, goal capture with an AI mentor that suggests SMART wording, attendance taken in the app, and player check-ins via WhatsApp.

It is built single-tenant: one deployment per team, with a single shared password instead of user accounts. Scope, data-flow and compliance rules live in [`CLAUDE.md`](CLAUDE.md). Read it before changing anything that touches player data or the Claude API.

**Stack:** Next.js on Vercel · Supabase (Postgres) · Google Sheets as the source of truth for roster and attendance · Claude API · Twilio WhatsApp.

## Setting it up for your team

You need accounts for Supabase, Google Cloud (a service account), Anthropic, Twilio and Vercel. Node 20+.

```bash
npm install
cp .env.example .env.local   # every variable is explained in the file
```

### 1. Supabase

Create a project and run the files in [`supabase/migrations/`](supabase/migrations) in order (`0001` … `0005`) in the SQL editor. Put the project URL, anon key and service-role key in `.env.local`.

### 2. Google Sheets

The app reads two spreadsheets and never creates rows or columns in them.

- **Roster** (tab `Roster`): row 1 headers `player_id`, `name`, optional `jersey`, optional `phone`.
  - `player_id` looks like `P1`, `P2`, …
  - `phone` needs a country code (`+49…`). Format the column as Plain text so Sheets keeps the `+`.
- **Attendance** (tab `Attendance`): a `player_id` column, plus one column per training session headed by its date (`2026-10-07`, or `2026-10-07 Extra skills session`). Cells are TRUE/FALSE checkboxes.

Create a Google Cloud service account and share the Roster sheet with its email as **Viewer** and the Attendance sheet as **Editor** (Take Attendance writes marks back).

### 3. Run locally

```bash
npm run dev    # http://localhost:3000, log in with APP_SHARED_PASSWORD
npm test       # Vitest unit tests (pure lib/ modules, no network or DB)
```

Sync the roster and attendance from the app once to fill Supabase.

### 4. Deploy (Vercel)

1. Import the GitHub repo in Vercel.
2. Add the same environment variables.
3. Deploy.
4. Set `TWILIO_WEBHOOK_URL` to `https://<your-domain>/api/whatsapp` (the stable production domain, no trailing slash) and redeploy.

[`vercel.json`](vercel.json) schedules the daily retention job (`/api/cron/retention`, 03:00 UTC). It runs the roster sync, then deletes check-in data per the retention rule. Vercel sends `CRON_SECRET` with each request.

### 5. WhatsApp (Twilio sandbox)

On a trial account the sandbox settings are only reachable in Twilio's legacy console: <https://www.twilio.com/console/sms/whatsapp/sandbox>. The new console's "Try out WhatsApp" can't run the bot: it doesn't accept TwiML replies.

- Under **Sandbox settings**, set "When a message comes in" to your webhook URL with method POST.
- Each phone joins by sending the sandbox's `join …` code. Joins expire after 3 days.
- A player reaches the bot once their number is in the Roster sheet and synced. They send START to opt in.

## Adapting it

- **Sport knowledge for the AI:** [`documentation/AI sport knowledge/`](documentation/AI%20sport%20knowledge) holds the reference loaded into the Goal Mentor prompt (currently `ultimate.md`, chosen by `SPORT` in `lib/goal-mentor.ts`). Add a file for your sport and change `SPORT`.
- **Prompts:** the Goal Mentor and check-in matcher read theirs at runtime from `documentation/AI goal mentor/` and `AI checkin matcher/`. The Assistant Coach prompt in `AI assistant coach/` is written, but the chat isn't built yet.
- **Bot texts and consent wording:** [`lib/bot-consent.ts`](lib/bot-consent.ts) and [`lib/checkin-flow.ts`](lib/checkin-flow.ts). All bot messages are fixed templates. Review the consent text for your context before a real player opts in, and bump `CONSENT_VERSION` when you change it.
- **Privacy:** you are responsible for the player data you put in. Read the [compliance report](documentation/CoachMate_Compliance_Report_EN.md) for what's covered and what's still open (e.g. DPAs with Anthropic and Twilio).

## Code layout

- `app/`: pages, server actions, and the API routes `api/whatsapp` and `api/cron/retention`.
- `lib/`: logic. Parsing, diffing and formatting live in pure modules with a `*.test.ts` next to them. `*-sync.ts`, `bot-*.ts` and pages only wire I/O to them.
- `components/`: UI, built against the "Sideline" design system linked in `CLAUDE.md`.
- `supabase/migrations/`: schema.

WhatsApp check-ins are split into **BotDelivery** (phone numbers, consent) and **BotMatcher** (goals, Claude) so neither sees the other's data. [`lib/bot-boundary.test.ts`](lib/bot-boundary.test.ts) guards the split. See the [check-in flowcharts](documentation/CoachMate_WhatsApp_Checkin_Flows.md).

## Documentation

| Document | What's in it |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Scope, data-flow and privacy boundaries, compliance rules (source of truth) |
| [Technical Architecture](documentation/CoachMate_Technical_Architecture.md) | System diagram |
| [WhatsApp check-in flows](documentation/CoachMate_WhatsApp_Checkin_Flows.md) | Process, data flow and retention charts |
| [Compliance Report](documentation/CoachMate_Compliance_Report_EN.md) | GDPR and EU AI Act status, open measures |
| [Implementation Plan](documentation/CoachMate_Implementation_Plan.md) | Slices and build order |
| [Project Planning](documentation/CoachMate_Project_Planning.md) | Goals and timeline |
| [Design Handoff](<documentation/CoachMate – Design Handoff (Lo Mid-Fi Prototype).md>) | Screens and interactions |
| [User research](documentation/user-research) | Interview, personas, journey, synthesis |
