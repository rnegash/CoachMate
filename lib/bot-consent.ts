// Pure BotDelivery side of the WhatsApp bot: opt-in keywords and the fixed
// consent texts. No AI, no goal logic (CLAUDE.md, BotMatcher/BotDelivery).
// Every text here is templated, not AI-generated, so it carries no Art. 50
// label; changing any of them to generated text needs a labeling review.

/** Stored with each opt-in, so it's clear which wording a player agreed to. Bump when CONSENT_INVITE changes. */
export const CONSENT_VERSION = "2026-10-08";

export type Keyword = "start" | "stop";

/** START / STOP as the whole message, any case, ignoring surrounding spaces and a trailing "." or "!". */
export function parseKeyword(text: string): Keyword | null {
  const t = text.trim().replace(/[.!]+$/, "").toLowerCase();
  if (t === "start") return "start";
  if (t === "stop") return "stop";
  return null;
}

export const CONSENT_INVITE = [
  "Hi! This is CoachMate, the check-in bot of your team's coach. You can send me short updates on the goals you agreed with your coach.",
  "",
  "What happens to your messages:",
  "• An AI (Claude, by Anthropic) reads each message to find which of your goals it is about. It gets the message and your goal texts, not your name or number.",
  "• Nothing reaches your coach unless you confirm it: I ask \"share with your coach?\" every time. Only updates you answer YES to are saved and shown to your coach.",
  "• Until you answer, the message is held for up to 24 hours, then discarded and deleted within the next day. Messages that aren't about one of your goals are never shared.",
  "• CoachMate deletes saved updates within a day after you leave the team roster, or within a day after the 7 days following your STOP.",
  "• Messages pass through Twilio and WhatsApp (Meta). Twilio and Anthropic process them in the US. They may keep their own copies under their own retention rules, which CoachMate's deletion doesn't reach.",
  "",
  "Reply START to agree and begin. Reply STOP at any time to stop.",
].join("\n");

export const OPTED_IN =
  'You\'re in. Send me an update on one of your goals any time, e.g. "practised hucks for 20 minutes". I\'ll always ask before sharing anything with your coach. Reply STOP to stop.';

export const OPTED_OUT =
  "Stopped. You won't get any more messages from CoachMate. Your saved updates will be deleted within a day after the 7 days following your first STOP; reply START within those 7 days to keep them.";
