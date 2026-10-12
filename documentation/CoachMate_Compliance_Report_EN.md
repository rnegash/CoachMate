# CoachMate – Compliance Report

**1. Project Overview**
CoachMate is a prototype tool that helps a volunteer coach set SMART goals, track attendance, and get AI-assisted coaching support for a ~40-person recreational ultimate frisbee team.

**2. Data Processing**

- Roster/attendance (real names, jersey numbers) lives in Google Sheets, pulled periodically into Supabase
- Only pseudonymous player ID + free-text signals reach the Claude API (Goal Mentor, Assistant Coach)
- Player check-in text (own words, sometimes naming third parties) is persisted with player ID + goal ID, only after the player confirms sharing each update with the coach; unconfirmed drafts are held up to 24 h, then deleted
- Player phone numbers are copied from the Roster Sheet into a separate table read only by the WhatsApp delivery component
  **3. Risk Assessment**
- 🟡 GoalCheckins raw-text storage (third-party mentions) + WhatsApp check-in → BotDelivery (phone number + free text, US processing via Twilio) — retention rule and per-update sharing consent built (2026-10-08); third parties' own rights over being named still open
- 🟡 BotMatcher/BotDelivery split enforced in code only: both use the Supabase service-role key in one deployment — accepted for the pilot (2026-10-08); separate deployments with scoped keys would be needed for real isolation
- 🟡 Twilio, WhatsApp (Meta) and Anthropic keep their own copies of messages outside CoachMate's deletion rules — disclosed in the consent text (2026-10-08); Twilio message redaction to be checked
- 🟡 Sheets sync, AI API calls, consent wording — mitigations designed but not fully enforced/documented
- 🟢 Bot Settings, AI suggestion storage, goal-list access — access-controlled or non-PII
  **4. GDPR Status: Partially fulfilled**
- Pseudonymization and system-level data separation are designed and mostly followed
- Open: DPA/SCCs with the Claude API provider and Twilio not yet confirmed
- Done (2026-10-08): retention/deletion rule for check-in text (roster removal; 7 days after STOP; drafts after 24 h), consent wording covering stored text, AI processing and US processing — wording not yet reviewed outside the team
  **5. Transparency Status (EU AI Act Art. 50)**
- Goal Mentor suggestions and Assistant Coach responses are already labeled "AI-generated" in the prototype
- No unlabeled AI content reaches players directly (advice-giving removed from scope)
- All WhatsApp bot messages (consent text, goal question, share confirmation) are templated, not freely generated, so intentionally unlabeled — re-evaluate if that changes. The consent text discloses that an AI reads each message to match it to a goal
  **6. Measures Still Needed**
- Review the WhatsApp consent wording (`lib/bot-consent.ts`) before the first real player opts in
- Confirm DPA/SCCs with the Claude API provider and Twilio
- Check whether Twilio message redaction is available on the account and enable it
- Evaluate the static no-names caption during pilot test #1 (active name-pattern detection deferred; the player's own name is already removed server-side from Goal Mentor requests and saved goals)
