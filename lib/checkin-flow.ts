// Pure BotMatcher side of the WhatsApp check-in conversation: what a
// player's message means given the pending draft, the fixed reply texts,
// and the Claude request/response shape. No API, DB, phone or roster data.
//
// Flow: message -> AI picks one of the player's active goals (or asks the
// player to pick) -> "share with your coach?" -> YES saves a check-in,
// NO discards it. Only YES-confirmed, goal-linked check-ins are stored;
// the draft in between is temporary (CLAUDE.md, BotMatcher section).
// All reply texts are templated, not AI-generated: no Art. 50 label.
import { z } from "zod";
import { escapeTagText } from "@/lib/goal-mentor-input";

export const CHECKIN_TEXT_MAX = 1000;

export type FlowGoal = { id: string; text: string };
export type FlowDraft = { goalId: string | null };

export type Step =
  | { kind: "no_goals" }
  | { kind: "too_long" }
  | { kind: "save" }
  | { kind: "discard" }
  | { kind: "set_goal"; goalId: string }
  | { kind: "repeat_pick" }
  | { kind: "new"; replacesDraft: boolean };

const YES = new Set(["yes", "y"]);
const NO = new Set(["no", "n"]);

/** What to do with a message. `draft` is the player's unexpired draft, if any. */
export function nextStep(message: string, goals: FlowGoal[], draft: FlowDraft | null): Step {
  const text = message.trim();
  const word = text.replace(/[.!]+$/, "").toLowerCase();

  if (draft) {
    if (NO.has(word)) return { kind: "discard" };
    if (YES.has(word)) return draft.goalId ? { kind: "save" } : { kind: "repeat_pick" };
    if (/^\d+$/.test(word)) {
      const goal = goals[Number(word) - 1];
      if (goal) return { kind: "set_goal", goalId: goal.id };
    }
  }
  if (goals.length === 0) return { kind: "no_goals" };
  if (text.length > CHECKIN_TEXT_MAX) return { kind: "too_long" };
  return { kind: "new", replacesDraft: draft !== null };
}

/** Normalised text to store: trimmed, inner whitespace kept (players write line breaks). */
export function checkinText(message: string): string {
  return message.trim();
}

const goalList = (goals: FlowGoal[]) => goals.map((g, i) => `${i + 1}) ${g.text}`).join("\n");

const REPLACED = "(Your previous update wasn't shared and has been discarded.)\n\n";

/** Ask whether to share the drafted update for `goal`. */
export function askShare(goal: FlowGoal, goals: FlowGoal[], replacesDraft = false): string {
  const lines = [
    `${replacesDraft ? REPLACED : ""}This sounds like your goal: "${goal.text}"`,
    "",
    "Share this update with your coach? Reply YES to share or NO to discard.",
  ];
  if (goals.length > 1) {
    lines.push("", "If it's about a different goal, reply its number:", goalList(goals));
  }
  return lines.join("\n");
}

/** Ask which goal the drafted update is about. */
export function askPick(goals: FlowGoal[], replacesDraft = false): string {
  return [
    `${replacesDraft ? REPLACED : ""}Which of your goals is this update about? Reply with its number:`,
    goalList(goals),
    "",
    "Or reply NO to discard it. If it isn't about a goal, it won't be shared: it's held for up to 24 hours, then deleted within the next day.",
  ].join("\n");
}

export const SAVED = "Shared with your coach. Thanks!";
export const DISCARDED = "Discarded. Nothing was saved.";
export const NO_GOALS =
  "You don't have an active goal yet, so nothing was saved. Goals are set together with your coach.";
export const TOO_LONG = `That's a bit long. Please keep updates under ${CHECKIN_TEXT_MAX} characters. Nothing was saved.`;
export const UNAVAILABLE = "Sorry, I can't process updates right now. Nothing was saved; please try again later.";

/** The single user message for the check-in matcher: goal texts and the player's message only. */
export function buildMatcherMessage(goals: FlowGoal[], message: string): string {
  return [
    "<goals>",
    ...goals.map((g, i) => `${i + 1}. ${escapeTagText(g.text)}`),
    "</goals>",
    `<message>${escapeTagText(message)}</message>`,
  ].join("\n");
}

export const MatchSchema = z.object({ goal_number: z.number().int().nullable() });

/** The matched goal, or null when the model's number is missing or out of range. */
export function matchedGoal(goals: FlowGoal[], goalNumber: number | null): FlowGoal | null {
  return goalNumber === null ? null : (goals[goalNumber - 1] ?? null);
}
