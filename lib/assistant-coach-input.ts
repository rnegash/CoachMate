// Pure parts of the Assistant Coach integration: checking the chat history
// the browser sends. No API, file or DB access.
// Spec: documentation/AI assistant coach/assistant-coach.technical-spec.md

export const COACH_MESSAGE_MAX = 2000;
/** Coach messages per session (spec section 6: the whole history is resent each turn). */
export const MAX_COACH_MESSAGES = 20;
// Replies are capped at 1024 output tokens; this only rejects tampered history.
const REPLY_MAX = 8000;

export const SESSION_FULL = `This chat has reached ${MAX_COACH_MESSAGES} messages. Start a new chat to continue.`;
const UNREADABLE = "The conversation couldn't be read. Start a new chat.";

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type HistoryCheck = { ok: true; turns: ChatTurn[] } | { ok: false; message: string };

/**
 * The server keeps no session (CLAUDE.md: single session, no stored history),
 * so the browser sends the whole conversation each turn. Checks that it
 * alternates, starts and ends with the coach, and stays within the limits.
 */
export function checkHistory(input: unknown): HistoryCheck {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, message: "Write a message first." };
  const turns: ChatTurn[] = [];
  for (const [i, t] of input.entries()) {
    const role = i % 2 === 0 ? "user" : "assistant";
    if (typeof t !== "object" || t === null || t.role !== role || typeof t.text !== "string") {
      return { ok: false, message: UNREADABLE };
    }
    const text = t.text.trim();
    if (!text || text.length > (role === "user" ? COACH_MESSAGE_MAX : REPLY_MAX)) {
      return {
        ok: false,
        message: role === "user" ? `Write a message of up to ${COACH_MESSAGE_MAX} characters.` : UNREADABLE,
      };
    }
    turns.push({ role, text });
  }
  if (turns.at(-1)!.role !== "user") return { ok: false, message: "Write a message first." };
  if (turns.filter((t) => t.role === "user").length > MAX_COACH_MESSAGES) {
    return { ok: false, message: SESSION_FULL };
  }
  return { ok: true, turns };
}
