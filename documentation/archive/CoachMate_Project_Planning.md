September 21, 2026 · @Rufael Negash

## Project Idea

- **Problem:** As a coach of a full ultimate frisbee team~40 members, ~20 avg. at training — memory alone can't track individual goals; most coaches (myself included) rarely pause to check whether a goal is specific enough in the middle of a busy training session, so goals can end up staying vague instead of being measurable.
- **Target group:** Myself, as coach of my own team — domain expert (how the team works, how the community looks like) and end user in one, real validation possible.
- **Value:**
  - Prioritization: agent surfaces weekly who might need a check in by using attendance data, player check ins and follow up on goal.
  - Coaching mentor: SMART goal suggestions & coaching tips, compensating for a lack of formal training.

## Project Charter

- **Project goal:** working prototype (goal-setting incl. SMART suggestions, attendance, weekly briefing), tested in 2 short user tests (weeks 2 & 3, 1–2 people each)
- **Start–End:** Sep 21 – Oct 26, 2026 (5 weeks)
- **Cost:** free-tier infrastructure (Vercel, Supabase, Twilio Sandbox); only variable cost: Claude API usage (< €20–30)

## PACE Roles

| Role             | Person                          | Responsibility                                            |
| ---------------- | ------------------------------- | --------------------------------------------------------- |
| P – Project Lead | Me                              | Overall responsibility for planning, decisions, outcome   |
| A – Approver     | Course instructor / mentor / me | Sign-off on milestones and final submission               |
| C – Contributor  | Pilot players (1–2 per test)    | Feedback, test data, requirements from a user perspective |
| E – Executor     | Me                              | Implementation: development, testing, deployment          |

## Milestones

| Week             | Phase                    | Status      | CoachMate work                                                                                                              |
| ---------------- | ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1 (Sep 21–27)    | Concept                  | Started     | Project setup, personas & customer journey, interviews & feedback                                                           |
| 2 (Sep 28–Oct 4) | Prompting                | Not started | Wireframes, clickable prototype, user test #1 (prototype), revision & build start, compliance review & interim presentation |
| 3 (Oct 5–11)     | Agent & Diligence        | Not started | Finish dashboard & attendance, WhatsApp integration, plan & build agent, user test #2 (agent)                               |
| 4 (Oct 12–18)    | Marketing & Presentation | Not started | Landing page concept, assets, build, presentation draft                                                                     |
| 5 (Oct 19–26)    | Wrap-up & Presentation   | Not started | Finalize prototype & agent, finalize landing page & presentation, buffer, final presentation                                |

## Opportunities & Risks

| Opportunities                                                        | Risks                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real access to target group & data from day 1                        | Agent tool-use is technically new to me — budget learning time                                                                                    |
| Existing React/TS/Node skills cover most of the stack                | Modularity can create unnecessary complexity — generalize only as far as needed                                                                   |
| Credible, if short, user tests with real users                       | Scope: agent's dual role (prioritization + mentor) — finish prioritization first                                                                  |
| Privacy architecture considered from the start                       | ID linkage across roster, attendance, app & WhatsApp enables re-identification if a system is compromised — keep access rights strictly separated |
| Next.js + Vercel + Supabase cuts infrastructure effort significantly | US data processing via Twilio (used for the WhatsApp Sandbox test phase) — GDPR aspect requires care with consent and data scope                  |

## Governance & Compliance

- **Pseudonymization:** the Claude API only ever sees free text (goal drafts and goal texts for the Goal Mentor; goal texts and the player's message for the check-in matcher) — never names, phone numbers, addresses, attendance or behavioral signals; the Goal Mentor gets no player ID either
- **Data separation:** roster/attendance sheets kept separate from sensitive data; Sheets permissions apply per file, not per tab
- **ID linkage (residual risk):** the same ID connects sheets, app & WhatsApp — access rights assigned strictly per system
- **Consent:** opt-in via WhatsApp keyword, clear consent message upfront, consent timestamped, revocable via "STOP"
- **Age assumption:** roster is adults only — no parental consent required
- **Security:** Twilio webhooks signature-verified; US data processing (test phase) documented openly
- **EU AI Act:** labeling requirement for AI content in force since Aug 2, 2026 — agent suggestions marked as AI-generated
- **GDPR:** no sensitive data without consent; pseudonymization & data minimization throughout
- **Bias & fairness:** agent recommendations spot-checked for systematic bias
- **Documentation:** decisions, prompts & tools logged continuously
- _Note: EU AI Act high-risk obligations (e.g. education, employment) are deferred to Dec 2027 — not relevant here_

##

CoachMate – Projektplanung – erster Entwurf (aktualisiert)

## Changelog

- **2026-10-12:** Goal Mentor input corrected throughout: goal text only, no player ID, no attendance or behavioral signals (Architecture decision 9). WhatsApp check-in is built and no longer deferred (flowcharts: `CoachMate_WhatsApp_Checkin_Flows.md`). Research Finding 1 reframed for the final presentation: refining happens in the moment, together with the player. Compliance items still open: DPA/SCCs, consent wording review, Twilio redaction, third-party rights.
