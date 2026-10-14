# CoachMate – Technical Architecture Diagram

Sep 28, 2026 · Updated Oct 14, 2026 (diagram checked against the built code: no check-in signal is stored, check-ins only after the player's YES, coach app writes goals, how each Sheet pull is triggered); Oct 13, 2026 (Assistant Coach built; Bot Settings deferred and removed from the diagram); Oct 12, 2026 (WhatsApp check-in built, no longer deferred); Oct 8, 2026 (Goal Mentor input, check-in text storage, attendance write-back, goal retention) · Based on: Project Planning, Personas & User Stories, Customer Journey, Interview, Research Synthesis, Design Handoff

## Scope

Full target architecture, minus deferred parts: Bot Settings (decision 11) is left out of the diagram until it is decided. The WhatsApp check-in (BotMatcher/BotDelivery) has been built and is no longer deferred; dashed lines mark the WhatsApp path only to set it apart. Flowcharts drawn from the built code: `CoachMate_WhatsApp_Checkin_Flows.md`.

## Diagram

```mermaid
flowchart TB
    subgraph WK2["Core app — in scope"]
        App[Coach Web App]
        DB[(Supabase<br/>Roster copy · Attendance copy<br/>Goals · Check-ins)]
        GoalMentor[Claude API: Goal Mentor<br/>sees: goal draft + other active goal texts<br/>no player ID, name or attendance]
        Assistant[Claude API: Assistant Coach<br/>stateless, no player context<br/>single session, nothing stored]
    end

    subgraph SHEETS["Google Sheets — external, existing"]
        SheetRoster[Sheets: Roster]
        SheetAtt[Sheets: Attendance]
    end

    subgraph WA["WhatsApp Bot — built<br/>(check-in only, no advice-giving)"]
        BotMatcher[Bot: AI Generation - Check-in Matcher<br/>sees: player ID + goal text list<br/>sends only goal texts + message to Claude<br/>no phone/contact info]
        BotDelivery[Bot: Delivery / PII Resolution<br/>sees: phone numbers, Twilio, roster PII]
        CheckIn[Player Check-in<br/>free-text, self-reported]
    end

    Player((Player's phone))

    %% Sheets <-> Supabase, one-way pull only
    SheetRoster -.->|"pull: Sync now + daily job"| DB
    SheetAtt -.->|"pull: Sync now + after each save"| DB
    App -->|write attendance| SheetAtt
    App -->|read attendance/roster, goals, check-ins| DB
    App -->|"write goals, player name removed"| DB

    %% Goal Mentor path
    App -->|"Refine: draft + other goal texts, player name stripped"| GoalMentor
    GoalMentor -->|"AI suggestion — Art. 50 label"| App

    %% Assistant Coach path
    App -->|prompt, no player context| Assistant
    Assistant -->|"response — Art. 50 label"| App

    %% WhatsApp bot: player -> system (check-in + matching loop only)
    DB -.->|"phone→player ID, roster status, consent"| BotDelivery
    BotDelivery -.->|"consent: START / STOP"| DB
    Player -.->|"free-text check-in"| CheckIn
    CheckIn -.->|"resolved to player ID"| BotDelivery
    BotDelivery -.->|"player ID + free text"| BotMatcher
    DB -.goal text list per player.-> BotMatcher
    BotMatcher -.->|"templated reply: which goal? / share with coach?, no AI label"| BotDelivery
    BotDelivery -.->|"templated reply"| Player
    BotMatcher -.->|"draft, 24 h: player ID + text (+ goal ID)"| DB
    BotMatcher -.->|"on player's YES: player ID + goal ID + check-in text"| DB

    classDef deferred stroke-dasharray: 5 5
    class WA,BotMatcher,BotDelivery,CheckIn,Player deferred
```

## Decision Log

1. **Sheets vs. Supabase (roster & attendance):** Attendance is write-target Sheets, read-target periodic pull into Supabase (accepted staleness). *As built (noted 2026-10-14): the roster is pulled on "Sync now" and by the daily job (`/api/cron/retention`); attendance on "Sync now" and after each save.* Roster is periodic pull Sheets → Supabase. Goals and Bot Settings/overrides live only in Supabase. The sync is one-way (Sheets → Supabase) — avoids bidirectional sync/conflict resolution. The only write to Sheets is attendance marks taken in the app, written directly to the existing session column (changed cells only, column and player row looked up at save time); the app never creates Sheet columns, rows or sessions.
2. **Advice-giving (Bot Settings, Screen 6):** Removed from scope entirely. No component generates or sends unreviewed AI advice to players. This also removes the "strictest Art. 50 case" (no coach review gate) from the architecture. Consequence: the "Advice-giving" toggle should be removed from Screen 6 in the Design Handoff — only Passive/proactive and Adaptive-to-player toggles remain. *Screen 6 as a whole has since been deferred, see decision 11.*
3. **PII boundary (WhatsApp bot):** Modeled as two separate boundary boxes/nodes rather than one — `BotMatcher` (AI-generation, sees player ID + goal text, never phone/contact info) and `BotDelivery` (delivery + ID→phone resolution, sees phone numbers/Twilio/roster PII, never message-generation logic). Chosen as the safer approach: least-privilege via structural separation rather than same-box internal discipline; matches the project's own "access rights assigned strictly per system" principle. Trade-off: stricter to build (real service boundary, not just a code module) — relevant for build scoping.
4. **Gender field:** Dropped from scope entirely — not modeled anywhere, no data-model or consent addition needed.
5. **Assistant Coach persistence:** Stateless — calls Claude API directly, no DB read/write, single session only.
6. **Player check-in:** Added as a new flow, since built (not present in the original Design Handoff, despite being implied by Project Planning and User Story 5). Free text, routed through `BotDelivery` (for ID resolution) into `BotMatcher` (for goal matching). `player ID + goal ID + check-in signal` and the raw check-in text are written to Supabase — the coach needs to read the actual message. Because that text can name third parties, it comes with a retention rule (STOP → deleted after a 7-day grace period; roster removal → deleted) and consent wording that covers storing it (`CLAUDE.md`, BotMatcher/BotDelivery section). *Changed from the original decision, which did not store the text.* *As built (noted 2026-10-14): there is no check-in signal column — the one implied signal is "worked on it" — and a check-in is stored only after the player answers YES to "share with your coach?"; until then it is a 24 h draft (`CLAUDE.md`, "What gets persisted").*
7. **Check-in matching AI:** Modeled as a separate node (`BotMatcher`), distinct from advice-generation, since goal-matching is a different task/prompt even though both would run on the same Claude API and avoid PII.
8. **Clarifying question (unclear check-in):** Templated/fixed wording with slots filled by the matcher's decision (e.g. goal names) — not freely LLM-generated text reaching the player. Treated as out of scope for Art. 50 labeling on that basis. If this is ever implemented as freely generated phrasing instead, it should be re-evaluated and labeled like the other AI outputs.
9. **Goal Mentor input (decided 2026-10-07, extended 2026-10-08):** Sends only the coach's goal draft and the player's other active goal texts. No player ID (allowed but not needed), no name, no attendance — a missed-session count says nothing about why, and read out in front of the player it can feel like judgement. Before sending, the server replaces the selected player's own name with "the player" in all sent text; other names rely on the static no-names caption. *Replaces the original "player ID + behavioral signals" design.* Spec: `documentation/AI goal mentor/`.
10. **Goal storage and retention (decided 2026-10-08):** Goals store text, `status` (active/completed), `created_at`, `updated_at`, `completed_at` — no score, priority, progress or AI-involvement flag (a static footnote covers Art. 50 instead). A player's goals are deleted when they are removed from the roster, matching the check-in text rule.
11. **Bot Settings (deferred 2026-10-13):** Not built, and removed from the diagram (no Supabase table, no app path). The bot only replies to players and never messages them on its own, so a Passive/proactive toggle would change nothing, and the consent wording covers replies only. Proactive reminders would need a scheduled sender, new consent wording (version bump, reminders only for players who agreed to it) and, outside the 24 h after a player's last message, a Meta-approved WhatsApp template, which the Twilio sandbox can't provide. "Adaptive to player" has no defined behavior. Revisit only with those decided (Implementation Plan, slice 6).
12. **Twilio demo-only (decided 2026-10-13, not built yet):** Twilio and its WhatsApp sandbox carry the first demo. Afterwards `BotDelivery` connects to Meta's WhatsApp Cloud API directly. This removes Twilio as a processor and message-copy holder; Meta still processes the messages (WhatsApp is theirs), so US processing remains. Only `BotDelivery` changes; the BotMatcher/BotDelivery split stays as is. The diagram shows Twilio until the switch is built.

## Known Open Items (carried from Design Handoff, not resolved by this diagram)

- Whether the first pilot test (1–2 people) includes a player or is Alex only
- Whether the Assistant Coach should ever have team-specific memory/context (currently: no, per Decision 5)
- Separate deployments with scoped keys for the BotMatcher/BotDelivery split (currently enforced in code only, see `CLAUDE.md`, Residual risk)
