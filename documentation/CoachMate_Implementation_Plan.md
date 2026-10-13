# CoachMate – Implementation Plan (Week 3–4)

Covers Oct 5–8 (Week 3) and Oct 12–15 (Week 4). Landing page/marketing and WhatsApp bot *build-out beyond the check-in round-trip* are handled separately.

## Stack decision

- **Next.js (responsive web app) + Vercel + Supabase** — confirmed, no PWA layer.
- PWA (installable, offline shell) was considered and rejected for this phase: the caching-invalidation risk (stale attendance/goal data served offline) and setup time don't pay off against the 5-week timeline, given WhatsApp already covers the "reach the coach/player without opening an app" need. Can revisit as a later add-on if time remains.

## Functional slices (prioritized)

1. **Roster via Google Sheets + basic overview** — includes a basic Player Detail shell (reachable by tapping a row), static roster fields only; later slices add data to it.
2. **Player goal + AI refine** — adds goals list to Player Detail. Includes: static no-names caption on the goal input (active name-pattern detection deferred, see `CLAUDE.md`).
3. **WhatsApp integration (check-ins)** — built as two least-privilege components per the Technical Architecture doc:
   - `BotMatcher`: sees player ID + goal text only, never phone/contact info.
   - `BotDelivery`: sees phone/Twilio/roster PII, never message-generation logic.
   - The player confirms each update ("share with your coach?") before it is stored; only goal-linked, confirmed check-ins with their raw text are persisted (changed 2026-10-08, see `CLAUDE.md`, "What gets persisted").
   - Includes: documenting the retention/deletion rule for check-in text and updating consent wording accordingly.
   - Also where the workflow/agent flowchart (MUSS-Kriterium: "Prozess mit einem Flowchart visualisiert") gets produced. Done 2026-10-12: `documentation/CoachMate_WhatsApp_Checkin_Flows.md` (process, data flow, retention).
4. **Attendance — read from Google Sheets** — adds attendance history/trend to Player Detail.
5. **Attendance — write to sheet from app (Take Attendance)** — completes the attendance round-trip (app → Sheets → pulled back into Supabase).
6. **WhatsApp bot settings** — adds default + per-player bot-override toggle (Passive/proactive, Adaptive) to Player Detail. No advice-giving toggle (removed from scope per Architecture decision log).
   - **Deferred 2026-10-13, not built.** The bot only replies; it never sends a message on its own, and the consent wording covers replies only, so a Passive/proactive toggle would change nothing. Making "proactive" real needs a scheduled reminder, new consent wording (version bump, reminders only for players who agreed to it), and, outside the 24 h after a player's last message, a Meta-approved WhatsApp template, which the Twilio sandbox can't provide. "Adaptive to player" has no defined behavior yet. Revisit only with those decided; any new stored setting needs its own decision in `CLAUDE.md` first.
7. **AI assistant** — stateless Assistant Coach chat, no player context, no DB access. Includes: the same static no-names caption on the message input.

Not tied to one slice: once both external processors are live (Claude API in slice 2, Twilio in slice 3), confirm DPA/SCC status with both providers (Twilio since made demo-only, 2026-10-13: Meta replaces it after the demo, see "After the first demo") (Compliance Report open item).

## After the first demo

- **Replace Twilio with Meta's WhatsApp Cloud API** (decided 2026-10-13). Twilio and its sandbox are for the first demo only. Afterwards BotDelivery talks to Meta directly: one fewer processor holding message copies, one fewer DPA/SCC, and no sandbox re-join every 3 days. US processing stays (Meta hosts the Cloud API).
  - Code, BotDelivery side only: webhook (Meta's signature check, JSON payload, one-time verification request) and sending via Meta's Graph API in place of `lib/twilio.ts`. BotMatcher is unchanged.
  - Consent text in `lib/bot-consent.ts` names Twilio: new wording + version bump, so players opt in again under it.
  - Docs naming Twilio: `CLAUDE.md`, Compliance Report, Technical Architecture, `CoachMate_WhatsApp_Checkin_Flows.md`.
  - Needs from Alex: a Meta Business account and a phone number not in use on WhatsApp; business verification may take days, start early. Check Meta's current pricing and terms first (user-initiated replies were expected to be free; not verified).

## Open-source packaging (decided 2026-10-13)

Other teams run CoachMate as a self-hosted copy (see `CLAUDE.md`, Project Identity). Pilot testing is outside the software project. Work items, not yet scheduled:

- **Privacy pass — done 2026-10-13** (`github.com/rnegash/CoachMate` was already public at that point, so this checked what was already out). All 21 commits, all branches: no API keys, tokens, private keys, Supabase project URL or Sheet IDs; `.env.local` was never committed. Phone numbers are test values (`+49176 12345678`, `+1 415 555 0100`) or Twilio's published signature test vector. People named in docs and tests are personas or test data: the interview is marked "simuliert (fiktiv)"; Alex Schneider, Lena Bauer and Anna Berg are fictional. No real club, team or player data. Left as is: commit author emails (personal and course address) are public in history; rewriting history was not done. The Sideline design-system link (`claude.ai/artifact/…`) is private, so others can't open it; the tokens it defines are in `app/globals.css`.
- **Configuration instead of hardcoding — done 2026-10-13.** Two env vars, read in `lib/instance-config.ts` (no settings screen, no DB table): `COACHMATE_SPORT` (prompt text + sport reference file; unset → "sports teams", no reference) and `COACHMATE_TIME_ZONE` (today, briefing week, displayed times; unset → UTC). Ultimate-specific examples in the goal input, Assistant Coach caption and WhatsApp opt-in reply made sport-neutral. Remaining sport-specific content: only `ultimate.md` exists as a sport reference; other teams write their own (setup guide). "CoachMate" stays as the product name in the consent text; the UI stays English.
- **Setup without the author — done 2026-10-13.** `README.md` "Setting up a copy for your team": Supabase, Sheets from templates, team settings, local run, Vercel, optional WhatsApp, another sport's reference. Sheet templates as CSV in `templates/` (`roster.csv`, `attendance.csv`, fictional example rows), imported via *File → Import*; chosen over a shared Google Sheet so nothing depends on the author's Google account. The guide says to leave session cells empty, not checkboxes: an unticked checkbox reads as FALSE = absent.
- **Deployer guide — done 2026-10-13:** `documentation/Running_your_own_copy.md`, linked from the README. Processors and DPAs, adults only, consent text and version, deletion scope, AI labels in place, Art. 50(2) open.

## Day mapping (strict 2-day blocks)

| Days | Slices | Deliverable |
|---|---|---|
| 1–2 | 1 (Roster + overview) + 4 (Attendance read) | Coach sees roster + attendance history in Player Detail, read-only |
| 3–4 | 5 (Take Attendance — write) + 2 (Goal + AI refine, incl. no-names caption) | Coach can mark attendance and capture/refine goals |
| 5–6 | 3 (WhatsApp check-ins) alone — biggest slice; flowchart + retention/consent docs run as lightweight parallel paperwork, not deep design; BotMatcher/BotDelivery get only the core round-trip, not edge-case hardening | A WhatsApp check-in updates a goal's status signal in the sandbox |
| 7–8 | ~~6 (Bot settings)~~ (deferred, see slice 6) + 7 (AI assistant, incl. no-names caption) + DPA/SCC status check | Assistant Coach chat working (done 2026-10-13); compliance status documented |

## EU AI Act flags carried into this plan

- **Art. 50** (AI-content labeling): applies to Goal Mentor suggestions (slice 2) and Assistant Coach replies (slice 7) — already labeled "AI-generated" in the Hi-Fi prototype.
- **Art. 50(1)** (disclosure of AI interaction): applies to Assistant Coach since it talks directly to the coach as a person — the prototype's static notice ("Every reply here is written by AI…") already covers this.
- Templated WhatsApp clarifying question (slice 3) is intentionally unlabeled as fixed, non-generated text — flag to re-evaluate if that question ever becomes freely generated.

## Open items carried forward (not resolved by this plan)

- DPA/SCC confirmation with Claude API provider (checked, not necessarily resolved, by end of Day 8). Twilio is demo-only (see "After the first demo"); Meta's terms are checked when switching instead.
- Whether Assistant Coach gets persistent/browsable history, or stays single-session.
- Whether pilot test #1 included a real player, or was Alex-only.
