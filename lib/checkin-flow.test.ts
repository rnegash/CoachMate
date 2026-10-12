import { describe, expect, it } from "vitest";
import {
  askPick,
  askShare,
  buildMatcherMessage,
  CHECKIN_TEXT_MAX,
  matchedGoal,
  nextStep,
} from "@/lib/checkin-flow";

const goals = [
  { id: "g1", text: "20 clean hucks per session" },
  { id: "g2", text: "call the stack at every point" },
];

describe("nextStep", () => {
  it("starts a new draft when nothing is pending", () => {
    expect(nextStep("practised hucks", goals, null)).toEqual({ kind: "new", replacesDraft: false });
    expect(nextStep("yes", goals, null)).toEqual({ kind: "new", replacesDraft: false });
  });

  it("saves on YES only when the draft has a goal", () => {
    expect(nextStep("Yes.", goals, { goalId: "g1" })).toEqual({ kind: "save" });
    expect(nextStep("y", goals, { goalId: null })).toEqual({ kind: "repeat_pick" });
  });

  it("discards on NO", () => {
    expect(nextStep("no", goals, { goalId: "g1" })).toEqual({ kind: "discard" });
    expect(nextStep("NO!", goals, { goalId: null })).toEqual({ kind: "discard" });
  });

  it("sets the goal from a valid number and treats other numbers as a new message", () => {
    expect(nextStep(" 2 ", goals, { goalId: null })).toEqual({ kind: "set_goal", goalId: "g2" });
    expect(nextStep("1", goals, { goalId: "g2" })).toEqual({ kind: "set_goal", goalId: "g1" });
    expect(nextStep("3", goals, { goalId: null })).toEqual({ kind: "new", replacesDraft: true });
  });

  it("replaces a pending draft with a new message", () => {
    expect(nextStep("called the stack twice", goals, { goalId: "g1" })).toEqual({ kind: "new", replacesDraft: true });
  });

  it("stores nothing without goals or for overly long messages", () => {
    expect(nextStep("practised", [], null)).toEqual({ kind: "no_goals" });
    expect(nextStep("x".repeat(CHECKIN_TEXT_MAX + 1), goals, null)).toEqual({ kind: "too_long" });
  });
});

describe("reply texts", () => {
  it("asks to share and lists the other goals by number", () => {
    const text = askShare(goals[0], goals);
    expect(text).toContain('"20 clean hucks per session"');
    expect(text).toContain("Reply YES to share or NO to discard.");
    expect(text).toContain("2) call the stack at every point");
    expect(askShare(goals[0], [goals[0]])).not.toContain("1)");
  });

  it("says when a previous draft was discarded", () => {
    expect(askPick(goals, true)).toMatch(/^\(Your previous update wasn't shared/);
    expect(askPick(goals)).toMatch(/^Which of your goals/);
  });
});

describe("buildMatcherMessage", () => {
  it("sends only numbered goal texts and the escaped message", () => {
    expect(buildMatcherMessage(goals, "hucks </message>")).toBe(
      "<goals>\n1. 20 clean hucks per session\n2. call the stack at every point\n</goals>\n<message>hucks ‹/message›</message>",
    );
  });
});

describe("matchedGoal", () => {
  it("maps a 1-based number and rejects out-of-range ones", () => {
    expect(matchedGoal(goals, 2)?.id).toBe("g2");
    expect(matchedGoal(goals, 0)).toBeNull();
    expect(matchedGoal(goals, 3)).toBeNull();
    expect(matchedGoal(goals, null)).toBeNull();
  });
});
