# CoachMate – Compliance Report

**1. Project Overview**
CoachMate is a prototype tool that helps a volunteer coach set SMART goals, track attendance, and get AI-assisted coaching support for a ~40-person recreational ultimate frisbee team.

**2. Data Processing**

- Roster/attendance (real names, jersey numbers) lives in Google Sheets, pulled periodically into Supabase
- Only pseudonymous player ID + free-text signals reach the Claude API (Goal Mentor, Assistant Coach)
- Player check-in text (own words, sometimes naming third parties) is persisted alongside the check-in signal
  **3. Risk Assessment**
- 🔴 GoalCheckins raw-text storage (third-party mentions, no retention rule yet) + WhatsApp check-in → BotDelivery (phone number + free text, US processing via Twilio)
- 🟡 Sheets sync, AI API calls, consent wording — mitigations designed but not fully enforced/documented
- 🟢 Bot Settings, AI suggestion storage, goal-list access — access-controlled or non-PII
  **4. GDPR Status: Partially fulfilled**
- Pseudonymization and system-level data separation are designed and mostly followed
- Open: DPA/SCCs with the Claude API provider and Twilio not yet confirmed
- Open: no retention/deletion rule for check-in text; consent wording doesn't yet cover storing that text
  **5. Transparency Status (EU AI Act Art. 50)**
- Goal Mentor suggestions and Assistant Coach responses are already labeled "AI-generated" in the prototype
- No unlabeled AI content reaches players directly (advice-giving removed from scope)
- Templated check-in clarifying question intentionally unlabeled (fixed text, not freely generated) — re-evaluate if that changes
  **6. Measures Still Needed**
- Define retention/deletion rule for check-in text; update WhatsApp consent wording to cover it
- Confirm DPA/SCCs with the Claude API provider and Twilio
- Add client-side name-pattern warnings before free text (goal notes, assistant chat) is sent to the API
