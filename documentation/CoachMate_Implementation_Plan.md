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

Not tied to one slice: once both external processors are live (Claude API in slice 2, Twilio in slice 3), confirm DPA/SCC status with both providers (Compliance Report open item).

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

- DPA/SCC confirmation with Claude API provider and Twilio (checked, not necessarily resolved, by end of Day 8).
- Whether Assistant Coach gets persistent/browsable history, or stays single-session.
- Whether pilot test #1 included a real player, or was Alex-only.
