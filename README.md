# CoachMate

A coaching assistant for volunteer coaches of recreational teams:

- **Weekly briefing:** who might need a check-in, from attendance and goal activity, stated as plain facts with no scores or rankings.
- **Player goals with an AI Goal Mentor:** feedback on a goal's wording and a suggested SMART version, which the coach accepts, edits or dismisses.
- **AI Assistant Coach:** a chat for thinking through coaching questions such as training plans, drills and feedback. It has no access to player data.
- **Attendance:** taken in the app and written back to your Google Sheet.
- **WhatsApp check-ins:** players send updates on their goals, and an update reaches the coach only if the player confirms sharing it.

Each team runs its **own copy**: one deployment per team, with its own database, Sheets and API keys, and a single shared password instead of user accounts. There is no central service; as the coach running a copy, you are responsible for your team's data. See [Running your own copy](documentation/Running_your_own_copy.md) for what that involves. Scope, data-flow and compliance rules live in [`CLAUDE.md`](CLAUDE.md). Read it before changing anything that touches player data or the Claude API.

**Stack:** Next.js on Vercel · Supabase (Postgres) · Google Sheets as the source of truth for roster and attendance · Claude API · Twilio WhatsApp (optional).

## Setting up a copy for your team

You need accounts for Supabase, Google Cloud (for a service account), Anthropic and Vercel, plus Twilio if you want WhatsApp check-ins. Node 20.9 or later.

```bash
git clone https://github.com/rnegash/CoachMate.git && cd CoachMate
npm install
cp .env.example .env.local   # every variable is explained in the file
```

### 1. Supabase

1. Create a project.
2. In the SQL editor, run the files in [`supabase/migrations/`](supabase/migrations) in order (`0001` … `0005`).
3. Put the project URL, anon key and service-role key in `.env.local`.

### 2. Google Sheets

The app reads two spreadsheets and never creates rows or columns in them. The Sheets stay the source of truth: the app copies them into Supabase when it syncs.

1. **Create the two spreadsheets from the templates.** In Google Sheets, create a spreadsheet, then *File → Import → Upload*, pick the CSV, and choose *Replace current sheet*. Then rename the tab exactly as below. Delete the example rows when you add your players.
   - **Roster** from [`templates/roster.csv`](templates/roster.csv), tab named `Roster`. Columns: `player_id`, `name`, optional `jersey`, optional `phone`.
   - **Attendance** from [`templates/attendance.csv`](templates/attendance.csv), tab named `Attendance`. Columns: `player_id`, then one column per training session headed by its date.
2. **Fill in the Roster.**
   - `player_id` is `P` plus digits (`P001`, `P002`, …). It must not contain names or initials: it is the only player identifier other parts of the app pass around.
   - `phone` is only needed for WhatsApp check-ins and needs a country code (`+49 176 …`). Format the column as *Plain text* (*Format → Number → Plain text*) before typing, or Sheets drops the `+`.
3. **Plan the term in the Attendance tab.** Add one column per training session, headed `2026-10-07` (or `2026-10-07 Extra skills session` for an extra one). The app never adds sessions; for a new one, add its column here and sync. Copy each player's `player_id` into the first column. The `name` column is only there for you to read; the sync ignores it. Leave the session cells empty: Take Attendance writes `TRUE` (present) or `FALSE` (absent) into them, and an empty cell means not marked. If you edit marks in the Sheet, type `TRUE`/`FALSE`. Don't turn the cells into checkboxes: an unticked checkbox is `FALSE`, so every player would count as absent for every future session.
4. **Give the app access.** In Google Cloud, create a service account and a JSON key, and put its email and private key in `.env.local`. Share the Roster spreadsheet with that email as **Viewer** and the Attendance spreadsheet as **Editor** (Take Attendance writes marks back). Put both spreadsheet IDs (the long part of the URL between `/d/` and `/edit`) in `.env.local`.

### 3. Your team's settings

In `.env.local`:

- `COACHMATE_SPORT`: your sport as a lowercase slug, e.g. `ultimate`. The AI prompts name it, and if [`documentation/AI sport knowledge/`](documentation/AI%20sport%20knowledge) has a file of that name (`ultimate.md`), the AI gets it as its sport reference. For another sport, see *Adapting it* below.
- `COACHMATE_TIME_ZONE`: your team's time zone, e.g. `Europe/Berlin`. It decides what "today" and "this week" mean. Unset, the app uses UTC.
- `APP_SHARED_PASSWORD`: the one password for the app.

### 4. Run locally

```bash
npm run dev    # http://localhost:3000, log in with APP_SHARED_PASSWORD
npm test       # Vitest unit tests (pure lib/ modules, no network or DB)
```

Sync the roster and attendance from the app once to fill Supabase.

### 5. Deploy (Vercel)

1. Import your copy of the repo in Vercel.
2. Add every variable from `.env.local` as an environment variable, including `COACHMATE_SPORT`, `COACHMATE_TIME_ZONE` and `CRON_SECRET`.
3. Deploy.
4. If you use WhatsApp: set `TWILIO_WEBHOOK_URL` to `https://<your-domain>/api/whatsapp` (the stable production domain, no trailing slash) and redeploy.

[`vercel.json`](vercel.json) schedules the daily retention job (`/api/cron/retention`, 03:00 UTC). It runs the roster sync, then deletes check-in data per the retention rule. Vercel sends `CRON_SECRET` with each request.

### 6. WhatsApp check-ins (optional, Twilio sandbox)

Without the Twilio variables everything else works; the WhatsApp webhook then rejects every request. Twilio is used for the first demo only; a move to Meta's WhatsApp Cloud API is planned (see the [Implementation Plan](documentation/CoachMate_Implementation_Plan.md)).

On a trial account the sandbox settings are only reachable in Twilio's legacy console: <https://www.twilio.com/console/sms/whatsapp/sandbox>. The new console's "Try out WhatsApp" can't run the bot: it doesn't accept TwiML replies.

- Under **Sandbox settings**, set "When a message comes in" to your webhook URL with method POST.
- Each phone joins by sending the sandbox's `join …` code. Joins expire after 3 days.
- A player reaches the bot once their number is in the Roster sheet and synced. They send START to opt in.

## Adapting it

- **Another sport:** copy [`documentation/AI sport knowledge/ultimate.md`](documentation/AI%20sport%20knowledge/ultimate.md) to `<your-sport>.md`, rewrite it for your sport (it is plain text written for the AI: rules, skills, terms, how progress can be checked), and set `COACHMATE_SPORT` to `<your-sport>`. Keep it about the sport in general; nothing about your own team or players belongs in it.
- **Prompts:** the Goal Mentor, Assistant Coach and check-in matcher read theirs at runtime from `documentation/AI goal mentor/`, `AI assistant coach/` and `AI checkin matcher/`. The Goal Mentor and Assistant Coach folders also have a technical spec next to the prompt.
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
| [Running your own copy](documentation/Running_your_own_copy.md) | What a coach deploying CoachMate is responsible for |
| [Implementation Plan](documentation/CoachMate_Implementation_Plan.md) | Slices and build order |
| [Archive](documentation/archive) | Planning-phase documents, not maintained: project planning, lo/mid-fi design handoff, user research (simulated interview, personas, journey, synthesis) |
