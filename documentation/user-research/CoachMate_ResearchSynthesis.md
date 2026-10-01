## Research Synthesis: CoachMate — Design-Relevant Insights

**Method:** Simulated interview (Alex Schneider) + Personas (Alex, Lena) + Customer Journey (Szenario B)
**Focus:** Insights that constrain or direct screen/flow design
**Date:** September 2026

### Executive Summary

CoachMate isn't resolving an existing but broken process — goal-tracking and structured coaching support don't currently exist at this team's scale; manual tracking was never viable for ~40 members. The tool needs to introduce this lightly, not replace something. Two AI-assisted functions are in scope for this prototype: (1) SMART-goal formulation support during/after informal conversations, and (2) a broader assistant Alex can consult for training planning, pedagogical cues, and content — separate from the goal/attendance data view. Whatever surfaces about attendance or engagement must read as neutral fact, not judgment, given the team's leisure-sport culture (per Alex: "reine Fakten, die Interpretation mach ich selbst").

### Key Themes

**Theme 1: Bandwidth problem, not a knowledge problem**
_Summary:_ Alex knows the components of a SMART goal but has no mental capacity to work through them mid-training or while packing up.
_Evidence:_ "Definitiv die Situation, nicht das Wissen... in dem Moment, wo ich mit 15 Leuten gleichzeitig auf dem Feld stehe... hab ich einfach nicht die mentale Kapazität, das Gespräch strukturiert zu Ende zu führen."
_Implication:_ Goal capture must happen in two decoupled steps: (1) fast, low-effort note during/after the moment, (2) optional structuring assist afterward — never both at once.

**Theme 2: No process exists today — this is bootstrapping, not fixing**
_Summary:_ At ~40 members, structured tracking was never attempted; goals currently exist only as verbal exchanges that fade.
_Evidence:_ "Beim nächsten Gespräch mit der Person nichts Greifbares da ist, worauf ich zurückkommen kann... Ohne was Schriftliches, Konkretes zum Draufschauen verpufft das Ganze einfach."
_Implication:_ Onboarding/first-use needs to feel like a low-cost starting point, not a migration from an existing (broken) system.

**Theme 3: AI suggestions must stay clearly optional and clearly labeled as AI**
_Summary:_ Alex wants suggestions he can accept, edit, or ignore with one click, and wants no ambiguity about origin.
_Evidence:_ "Ich will das letzte Wort haben... muss ich das mit einem Klick anpassen können... fänd's gut, wenn klar wäre, dass das ein KI-Vorschlag ist und nicht meine eigene Formulierung."
_Implication:_ Every AI-generated suggestion (goal phrasing, coaching tips, assistant-coach output) needs a visible AI label and an easy edit/dismiss path — this is also where **Art. 50 EU AI Act** (AI-content labeling) directly applies.

**Theme 4: Attendance/engagement data must read as neutral fact, never as judgment**
_Summary:_ The team is leisure-sport, not competitive; reduced engagement is a valid choice, not a problem to flag.
_Evidence:_ "Reine Fakten, die Interpretation mach ich selbst... nirgends den Eindruck erwecken, weniger Aktivität sei ein Problem, das behoben werden muss."
_Implication:_ Weekly briefing/dashboard copy and framing must avoid evaluative language ("demotiviert", "underperforming") — factual statements only (e.g. "3x abwesend, letzte Zielaktivität vor 2 Wochen").

**Theme 5: Must not become extra admin burden**
_Summary:_ Biggest hesitation is the tool adding post-training work rather than removing it.
_Evidence:_ "Am meisten Sorge hätte ich, dass es zu einer zusätzlichen Pflicht wird statt einer Erleichterung."
_Implication:_ Every added screen/step needs to justify its time cost; defaults and shortcuts matter more than completeness. As many steps as possible should be optional or completable later, rather than required up front.

**Theme 6: Two distinct AI functions, not one**
_Summary:_ Beyond SMART-goal suggestions tied to a specific player's data, Alex wants a separate, general-purpose assistant for training planning, pedagogical cues, and content — not tied to any one player.
_Implication:_ These likely need to live as two separate entry points/screens: a data-grounded mentor (goal/attendance context) vs. an open assistant-coach chat (general planning support).

### User Segments Identified

| Segment             | Characteristics                                                                                               | Needs                                                                                                                | Size                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Trainer (Alex-type) | Runs a large (~40) leisure-sport team solo, limited time/mental bandwidth, wants tools but not admin overhead | Fast capture, optional structuring, factual (non-judgmental) overview, on-demand coaching support                    | 1 (primary user of this prototype)                              |
| Player (Lena-type)  | Motivated, willing to put in effort — but needs to feel seen and see progress over time to stay engaged       | A visible, central place for her goal that keeps it present in her own training (not admin, but motivation/reminder) | Secondary — in scope per user stories, not yet placed in a flow |

### Insights → Opportunities

| Insight                                                   | Opportunity                                                     | Impact | Effort                           |
| --------------------------------------------------------- | --------------------------------------------------------------- | ------ | -------------------------------- |
| Goal capture must be decoupled from structuring           | Quick-note entry field, separate "refine with AI" step          | High   | Low                              |
| No existing process to migrate from                       | Minimal first-use flow, no setup burden                         | Med    | Low                              |
| AI output needs labeling + edit control                   | Consistent "AI suggestion" tag + inline edit on every AI output | High   | Low (EU AI Act Art. 50 relevant) |
| Attendance data must stay neutral                         | Fact-only phrasing library for briefing/dashboard copy          | High   | Low                              |
| Tool must not add admin burden                            | Optional-by-default steps everywhere completion isn't required  | High   | Med                              |
| Two distinct AI needs (goal mentor vs. general assistant) | Two separate entry points/screens                               | Med    | Med                              |

### Recommendations

1. **High priority** — Design goal capture as two decoupled steps (quick note → optional AI refine), per Theme 1 & 5.
2. **High priority** — Establish a consistent AI-label + edit/dismiss pattern before designing any individual AI screen, since it recurs across goal suggestions, weekly briefing, and the assistant coach (Theme 3, Art. 50 EU AI Act).
3. **Medium priority** — Separate the data-grounded goal/attendance mentor from the general-purpose assistant coach as two distinct navigation entry points (Theme 6).
4. **Lower priority** — Player-facing (Lena) flow can follow after the trainer-facing core is validated, since PACE roles show pilot players as Contributors, not primary build target for week 2.

### Questions for Further Research

- Should the assistant-coach chat have any memory/context of the specific team, or is it meant to be general knowledge only?
- Where does the pilot test (week 2, 1–2 people) sit — is it Alex only, or does it include a player?

### Out of Scope for This Document

- Technical/architecture requirements (e.g. pluggable Google Sheets import for team roster, attendance write-back to Sheets) are not derived from user research and are tracked in a separate document. To be pulled in at the screens/flows stage.

### Methodology Notes

Based on one simulated interview (fictional but persona-grounded), two personas, and one customer-journey scenario. No real usage data yet; findings should be treated as directional until validated in user test #1 (Week 2).
