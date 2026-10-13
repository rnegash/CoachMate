# CoachMate – Design Handoff (Lo/Mid-Fi Prototype)

Sep 28, 2026 · @Rufael Negash

## Overview

This document hands off the lo/mid-fi prototype (Sep 28–Oct 4) scope for CoachMate to design. It follows from the research synthesis (simulated interview, personas, customer journey) and the flow/screen definitions worked out with the project lead.

Scope: 3 flows — Weekly Briefing (incl. Attendance), Goal Capture (incl. AI Refine), and AI Assistant Coach — plus a Bot Settings screen for default WhatsApp bot behavior. Player-facing (Lena) flow and the full WhatsApp bot build are deferred to the build phase (see Deferred / Out of Scope).

## Flows Summary

&#91;embedded content: screen map · 4 flows, Player Detail as hub\]

Player Detail is the shared hub: Weekly Briefing and Take Attendance feed into it, and it's the entry point to both Add Goal and the per-player bot override. Bot Settings and Assistant Coach sit outside this hub — Bot Settings sets the default all players inherit unless overridden in Player Detail; Assistant Coach carries no player context at all.

## Screen 1: Briefing / Overview

Entry point each week. A factual signal list, not a to-do list — no urgency badges, color-coded ranking, or evaluative labels.

- Header: current week label (date range)
- Search bar: by player name
- Filter/group controls: by attendance, by gender, by goal status (saved / not saved)
- Player list, one row each: name, attendance signal (e.g. "3x abwesend"), goal signal (e.g. "letzte Zielaktivität vor 2 Wochen" / "kein Ziel gesetzt")
- Sort: by recency/change of signal, never a computed priority score
- No action buttons on the row itself — tapping a row opens Player Detail
  **States:** player with no goal set yet; player with no recent attendance change (neutral, still shown); empty state for a filter/group with no matches.

**Open item:** gender is a new stored field with no current home in the data model or consent/governance scope (at the time "player ID + behavioral signals"; superseded 2026-10-12: the Claude API now sees free text only, see Architecture decision 9) — needs to be added to both before build.

## Screen 2: Take Attendance

Fast, whole-team roll call, used right after/during training — must not feel like admin overhead.

- Header: today's date, session label if relevant
- Search/filter: by name, group by gender (consistent with Screen 1)
- Full team list, one row each: player name, Present/Absent toggle (defaults unmarked, not pre-set to present)
- Plain, non-alarming count of players still unmarked
- Explicit Save/confirm action — progress isn't silently lost if interrupted mid-training
  **States:** unmarked players remaining; reopening the screen same-day shows the current saved entries and is editable, not locked.

## Screen 3: Player Detail

The shared hub — history (not just a snapshot), goal status, and the per-player bot behavior override.

**Header:** player name; gender (carried from Screen 1's data field)

**Section A — Attendance:** attendance pattern over time (trend/history, not just a running total)

**Section B — Goal Status:**

- List of active goals — multiple allowed simultaneously, each showing the confirmed/refined text + last activity/update timestamp
- "+ Add Goal" action (entry point to Screen 4) — always available, not conditional on having none
- Completed goals history — separate/expandable section, showing past goals and their completion date
  **Section C — Bot Behavior (override):** *(deferred 2026-10-13, not built — see Technical Architecture decision 11)*

- Shows whether this player currently follows the default (from Screen 6: Bot Settings) or has a custom override
- If override: same toggle set as Bot Settings (passive/nudging, adaptive, advice-giving), scoped to this player only

## Screen 4: Add Goal (incl. Refine)

Reached from Player Detail's "+ Add Goal." Free-text capture and AI structuring live together on one screen so the coach can iterate — refine, adjust the original text, refine again — without navigating away.

- Free-text input (e.g. "Lena, mehr Würfe treffen"), stays editable throughout
- Two actions after entry: **Refine now** / **Save now**
  - Save now → goal saved as-is, informal
  - Refine now → generates an AI-suggested SMART version, tagged as AI-generated (**Art. 50 EU AI Act**)
- Suggestion area (appears only after Refine is triggered):
  - Shows the AI suggestion
  - Accept (saves the suggestion as the goal)
  - Edit inline (adjust the suggestion directly)
  - Dismiss (discard suggestion, free text remains, can refine again)
- Refine can be triggered again after editing the original free text, replacing the previous suggestion
- Save now remains available at any point — saves whichever version is currently active (free text, or the accepted/edited suggestion)

## Screen 5: Assistant Coach chat

General-purpose advisory chat — training planning, pedagogical cues, content. Separate main navigation entry, no player context passed in.

- Open text input, conversational
- AI responses labeled as AI-generated (**Art. 50 EU AI Act**)
- No accept/edit/dismiss controls — advisory only, nothing here is written to a player record
  **Open item:** history/persistence (saved, browsable past conversations vs. stateless single session) is undecided — for this prototype pass, shown as a single open session with no visible history list; flagged for a later decision.

## Screen 6: Bot Settings

*Deferred 2026-10-13, not built: the bot only replies, so these toggles would have no effect yet. See Technical Architecture decision 11.*

Default WhatsApp bot behavior for all players without an individual override (override lives in Player Detail, Section C).

- Toggle: Passive (reply-only) vs. proactive nudging
- Toggle: Adaptive to player (on/off)
- Toggle: Advice-giving (on/off)
- Short static note near "Advice-giving": this is where AI-generated advice goes directly to a player with no coach review step in between — the clearest **Art. 50** case in the product, and it also raises whether players are told at WhatsApp opt-in that they may receive AI-generated advice (not just AI-labeled goal suggestions the coach reviews first)
- No per-player list on this screen — it sets the default only; per-player state is visible/editable in each Player Detail

## Open Questions

- [ ] Should the Assistant Coach chat have persistent, browsable history, or is each session stateless? (Screen 5)
- [ ] Should the assistant-coach chat have any memory/context of the specific team, or is it general knowledge only?
- [ ] Where does the first pilot test (1–2 people) sit — Alex only, or does it include a player?

## Constraints & Compliance Flags

- **Art. 50 EU AI Act (AI-content labeling):** applies to every AI-generated output surfaced anywhere in this prototype — SMART-goal suggestions (Screen 4), Assistant Coach responses (Screen 5), and any bot advice sent to a player (Screen 6). The bot-advice case is the strictest, since it can reach a player directly with no coach review step.
- **Data minimization / governance:** the current data model and consent scope are defined at the time as "player ID + behavioral signals" only (superseded 2026-10-12: free text only, see Architecture decision 9) (no names, phone numbers, or addresses reaching the agent). Adding gender as a stored, groupable field (Screen 1) is new and needs to be added to both the data model and the governance/consent documentation before build.
- **Consent (WhatsApp):** if bot advice-giving is enabled (Screen 6), consider whether the existing opt-in consent message needs to explicitly cover receiving AI-generated advice, not only AI-labeled goal suggestions reviewed by the coach.

## Deferred / Out of Scope (this prototype)

- Full WhatsApp bot build (after the prototype, per Project Planning milestones)
- Player-facing (Lena) flow — to follow once the trainer-facing core is validated
- Google Sheets pluggable import (team roster) and attendance write-back to Sheets — technical/architecture requirement tracked separately, to be pulled in at build stage, not derived from this research/flow work
- Bot-steering settings shown in this prototype (Screens 3 & 6) are visual exploration only — the underlying WhatsApp bot they configure is not built until the build phase
