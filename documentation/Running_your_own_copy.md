# Running your own copy

When you deploy CoachMate for your team, you decide what player data goes in and where it is processed. Under the GDPR that makes you (or your club) the **controller** of that data. This page lists what that involves and what the app already does for you. It is a checklist, not legal advice.

## Before players' data goes in

- **Processors.** Your copy sends data to these services. Check that each one's data processing agreement (DPA) covers your account, and note how it handles transfers outside the EU (e.g. Standard Contractual Clauses):
  - Supabase (database: roster, attendance, goals, check-ins, phone numbers)
  - Vercel (hosting; server logs)
  - Google (Sheets: roster and attendance)
  - Anthropic (Claude API: goal texts, check-in messages, Assistant Coach chat; no names or phone numbers by design)
  - Twilio and Meta/WhatsApp, only if you use check-ins (phone numbers and messages; processed in the US)
- **Adults only.** The app has no parental consent handling. Don't add minors to the roster.
- **Tell your players.** Let them know their name and attendance are kept in the Sheet and the app, and who sees them.

## WhatsApp check-ins

- **Consent text.** Players opt in by replying START to the text in [`lib/bot-consent.ts`](../lib/bot-consent.ts). Read it for your context before the first real player joins. If you change it, bump `CONSENT_VERSION` so it's recorded which wording each player agreed to.
- **What the app deletes.** Saved updates are deleted within a day of a player's removal from the roster, and 7–8 days after they send STOP. Unconfirmed drafts go after 24 hours. These rules cover your Supabase only: Twilio, Meta and Anthropic keep their own copies under their own retention rules (the consent text says so).
- **Third parties.** A player's update can name someone else. That text stays until the authoring player's data is deleted; there is no separate process for the person named.

## AI labeling (EU AI Act, Art. 50)

Already in the app, and don't remove them:

- Every Goal Mentor suggestion and Assistant Coach reply shows an "AI-generated" label.
- The Assistant Coach shows a permanent notice that its replies are written by AI.
- The Goals section shows "Goals may have been written with the help of AI."

Open: Art. 50(2) asks providers of AI systems to mark generated text in a machine-readable way. The app doesn't do this yet, and whether it applies to a self-hosted copy hasn't been checked.

## Keeping names out of the AI

Free-text fields that reach the AI carry a note asking not to type names or contact details. The server also removes the selected player's own name from Goal Mentor requests and saved goals. Other names are not detected, so the note is the main safeguard.

## Further reading

- [`CLAUDE.md`](../CLAUDE.md): every data-flow and compliance rule, with the date it was decided
- [Compliance Report](CoachMate_Compliance_Report_EN.md): status of the original deployment and open measures
