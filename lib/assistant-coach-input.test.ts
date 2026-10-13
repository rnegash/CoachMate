import { describe, expect, it } from "vitest";
import { checkHistory, COACH_MESSAGE_MAX, MAX_COACH_MESSAGES, SESSION_FULL } from "@/lib/assistant-coach-input";

const user = (text: string) => ({ role: "user", text });
const assistant = (text: string) => ({ role: "assistant", text });

describe("checkHistory", () => {
  it("accepts an alternating history ending with the coach, trimmed", () => {
    expect(checkHistory([user(" How long should warm-ups be? "), assistant("What are they for?"), user("Fewer injuries")])).toEqual({
      ok: true,
      turns: [
        { role: "user", text: "How long should warm-ups be?" },
        { role: "assistant", text: "What are they for?" },
        { role: "user", text: "Fewer injuries" },
      ],
    });
  });

  it("rejects an empty or non-array history", () => {
    expect(checkHistory([]).ok).toBe(false);
    expect(checkHistory("hi").ok).toBe(false);
    expect(checkHistory(null).ok).toBe(false);
  });

  it("rejects a history that doesn't alternate or doesn't start with the coach", () => {
    expect(checkHistory([assistant("Hi"), user("Hello")]).ok).toBe(false);
    expect(checkHistory([user("a"), user("b")]).ok).toBe(false);
  });

  it("rejects a history ending with a reply", () => {
    expect(checkHistory([user("a"), assistant("b")]).ok).toBe(false);
  });

  it("rejects blank, non-string and overlong messages", () => {
    expect(checkHistory([user("   ")]).ok).toBe(false);
    expect(checkHistory([{ role: "user", text: 3 }]).ok).toBe(false);
    expect(checkHistory([user("x".repeat(COACH_MESSAGE_MAX + 1))]).ok).toBe(false);
    expect(checkHistory([user("x".repeat(COACH_MESSAGE_MAX))]).ok).toBe(true);
  });

  it("caps the number of coach messages per session", () => {
    const turns = (n: number) => Array.from({ length: n * 2 - 1 }, (_, i) => (i % 2 ? assistant("r") : user("q")));
    expect(checkHistory(turns(MAX_COACH_MESSAGES)).ok).toBe(true);
    expect(checkHistory(turns(MAX_COACH_MESSAGES + 1))).toEqual({ ok: false, message: SESSION_FULL });
  });
});
