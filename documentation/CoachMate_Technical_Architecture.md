# CoachMate – Technical Architecture Diagram

Sep 28, 2026 · Based on: Project Planning, Personas & User Stories, Customer Journey, Interview, Research Synthesis, Design Handoff

## Scope

Full target architecture (Week 2 prototype + Week 3+ deferred components), with deferred parts marked dashed.

## Diagram

```mermaid
flowchart TB
    subgraph WK2["Week 2 Prototype — in scope"]
        App[Coach Web App]
        DB[(Supabase<br/>Roster copy · Attendance copy<br/>Goals · Bot Settings/Overrides)]
        GoalMentor[Claude API: Goal Mentor<br/>sees: player ID + behavioral signals]
        Assistant[Claude API: Assistant Coach<br/>stateless, no player context]
    end

    subgraph SHEETS["Google Sheets — external, existing"]
        SheetRoster[Sheets: Roster]
        SheetAtt[Sheets: Attendance]
    end

    subgraph WA["WhatsApp Bot — deferred, Week 3+<br/>(check-in only, no advice-giving)"]
        BotMatcher[Bot: AI Generation - Check-in Matcher<br/>sees: player ID + goal text list<br/>no phone/contact info]
        BotDelivery[Bot: Delivery / PII Resolution<br/>sees: phone numbers, Twilio, roster PII]
        CheckIn[Player Check-in<br/>free-text, self-reported]
    end

    Player((Player's phone))

    %% Sheets <-> Supabase, one-way pull only
    SheetRoster -.periodic pull.-> DB
    SheetAtt -.periodic pull.-> DB
    App -->|write attendance| SheetAtt
    App -->|read attendance/roster, goals, bot settings| DB

    %% Goal Mentor path
    App -->|"Refine now: ID + free-text signals"| GoalMentor
    GoalMentor -->|"AI suggestion — Art. 50 label"| App

    %% Assistant Coach path
    App -->|prompt, no player context| Assistant
    Assistant -->|"response — Art. 50 label"| App

    %% WhatsApp bot: player -> system (check-in + matching loop only)
    DB -.roster PII: ID→phone mapping.-> BotDelivery
    Player -.->|"free-text check-in"| CheckIn
    CheckIn -.->|"resolved to player ID"| BotDelivery
    BotDelivery -.->|"player ID + free text"| BotMatcher
    DB -.goal text list per player.-> BotMatcher
    BotMatcher -.->|"if unclear: templated clarifying question, no AI label"| BotDelivery
    BotDelivery -.->|"clarifying question"| Player
    BotMatcher -.->|"matched: player ID + goal ID + check-in signal"| DB

    classDef deferred stroke-dasharray: 5 5
    class WA,BotMatcher,BotDelivery,CheckIn,Player deferred
```

## Decision Log

1. **Sheets vs. Supabase (roster & attendance):** Attendance is write-target Sheets, read-target periodic pull into Supabase (accepted staleness). Roster is periodic pull Sheets → Supabase. Goals and Bot Settings/overrides live only in Supabase. Direction is one-way (Sheets → Supabase), no write-back — avoids bidirectional sync/conflict resolution.
2. **Advice-giving (Bot Settings, Screen 6):** Removed from scope entirely. No component generates or sends unreviewed AI advice to players. This also removes the "strictest Art. 50 case" (no coach review gate) from the architecture. Consequence: the "Advice-giving" toggle should be removed from Screen 6 in the Design Handoff — only Passive/proactive and Adaptive-to-player toggles remain.
3. **PII boundary (WhatsApp bot):** Modeled as two separate boundary boxes/nodes rather than one — `BotMatcher` (AI-generation, sees player ID + goal text, never phone/contact info) and `BotDelivery` (delivery + ID→phone resolution, sees phone numbers/Twilio/roster PII, never message-generation logic). Chosen as the safer approach: least-privilege via structural separation rather than same-box internal discipline; matches the project's own "access rights assigned strictly per system" principle. Trade-off: stricter to build (real service boundary, not just a code module) — relevant for Week 3 scoping.
4. **Gender field:** Dropped from scope entirely — not modeled anywhere, no data-model or consent addition needed.
5. **Assistant Coach persistence:** Stateless — calls Claude API directly, no DB read/write, single session only.
6. **Player check-in:** Added as a new deferred flow (not present in the original Design Handoff, despite being implied by Project Planning and User Story 5). Free text, routed through `BotDelivery` (for ID resolution) into `BotMatcher` (for goal matching). Only `player ID + goal ID + check-in signal` is written back to Supabase — raw free text is not persisted.
7. **Check-in matching AI:** Modeled as a separate node (`BotMatcher`), distinct from advice-generation, since goal-matching is a different task/prompt even though both would run on the same Claude API and avoid PII.
8. **Clarifying question (unclear check-in):** Templated/fixed wording with slots filled by the matcher's decision (e.g. goal names) — not freely LLM-generated text reaching the player. Treated as out of scope for Art. 50 labeling on that basis. If this is ever implemented as freely generated phrasing instead, it should be re-evaluated and labeled like the other AI outputs.

## Known Open Items (carried from Design Handoff, not resolved by this diagram)

- Whether the Week 2 pilot test (1–2 people) includes a player or is Alex only
- Whether the Assistant Coach should ever have team-specific memory/context (currently: no, per Decision 5)
- Full WhatsApp bot build timeline (Week 3+) and the build-effort implications of the two-boundary-box PII split (Decision 3)
