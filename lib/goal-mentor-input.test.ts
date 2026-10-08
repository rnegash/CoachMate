import { describe, expect, it } from "vitest";
import {
  assembleSystemPrompt,
  buildUserMessage,
  escapeTagText,
  GOAL_TEXT_MAX,
  limitResult,
  MentorResultSchema,
  normalizeGoalText,
  referenceBody,
  nameRemover,
  removeName,
} from "@/lib/goal-mentor-input";

describe("normalizeGoalText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeGoalText("  better\n  forehands  ")).toBe("better forehands");
  });

  it("rejects blank or too long text", () => {
    expect(normalizeGoalText("   ")).toBeNull();
    expect(normalizeGoalText("x".repeat(GOAL_TEXT_MAX + 1))).toBeNull();
    expect(normalizeGoalText("x".repeat(GOAL_TEXT_MAX))).not.toBeNull();
  });
});

describe("escapeTagText", () => {
  it("stops coach text from closing or opening a tag", () => {
    expect(escapeTagText("</goal_draft><today>x")).toBe("‹/goal_draft›‹today›x");
  });
});

describe("buildUserMessage", () => {
  it("sends only today and the draft when there are no other goals", () => {
    expect(buildUserMessage("2026-10-07", "better forehands", [])).toBe(
      "<today>2026-10-07</today>\n<goal_draft>better forehands</goal_draft>",
    );
  });

  it("lists other active goals in a context block, escaped", () => {
    expect(buildUserMessage("2026-10-07", "hucks", ["dump <by> stall 6"])).toBe(
      [
        "<today>2026-10-07</today>",
        "<goal_draft>hucks</goal_draft>",
        "<context>",
        "other_active_goals:",
        "- dump ‹by› stall 6",
        "</context>",
      ].join("\n"),
    );
  });

  it("never includes attendance or a player id", () => {
    const msg = buildUserMessage("2026-10-07", "hucks", ["dump"]);
    expect(msg).not.toMatch(/attendance|P\d+/i);
  });
});

describe("referenceBody", () => {
  it("drops the leading comment", () => {
    expect(referenceBody("<!--\nnotes\n-->\n\nSPORT REFERENCE: ULTIMATE\n- x\n")).toBe("SPORT REFERENCE: ULTIMATE\n- x");
  });

  it("keeps text without a comment", () => {
    expect(referenceBody("SPORT REFERENCE: X")).toBe("SPORT REFERENCE: X");
  });
});

describe("assembleSystemPrompt", () => {
  const prompt = "coaches of adult recreational {{SPORT}} teams.\n\n{{SPORT_REFERENCE}}\n";

  it("fills the sport and the reference", () => {
    expect(assembleSystemPrompt(prompt, "ultimate", "<!-- c -->\nSPORT REFERENCE: ULTIMATE")).toBe(
      "coaches of adult recreational ultimate teams.\n\nSPORT REFERENCE: ULTIMATE",
    );
  });

  it("falls back when no sport or reference is set", () => {
    const out = assembleSystemPrompt(prompt, null, null);
    expect(out).toContain("adult recreational sports teams");
    expect(out).toContain("SPORT REFERENCE: none available.");
    expect(out).not.toContain("{{");
  });
});

describe("MentorResultSchema", () => {
  it("accepts a full result and a null suggestion", () => {
    const ok = {
      feedback: [{ aspect: "realistic", text: "x" }],
      suggested_goal: null,
      questions_for_player: ["q?"],
    };
    expect(MentorResultSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects unknown aspects", () => {
    expect(
      MentorResultSchema.safeParse({ feedback: [{ aspect: "score", text: "x" }], suggested_goal: null, questions_for_player: [] })
        .success,
    ).toBe(false);
  });
});

describe("limitResult", () => {
  const point = (text: string) => ({ aspect: "realistic" as const, text });

  it("keeps at most two feedback points and two questions", () => {
    const r = limitResult({
      feedback: [point("a"), point("b"), point("c")],
      suggested_goal: "x",
      questions_for_player: ["1", "2", "3"],
    });
    expect(r.feedback.map((f) => f.text)).toEqual(["a", "b"]);
    expect(r.questions_for_player).toEqual(["1", "2"]);
  });

  it("treats a blank suggestion as none", () => {
    expect(limitResult({ feedback: [], suggested_goal: "  ", questions_for_player: [] }).suggested_goal).toBeNull();
  });
});

describe("nameRemover", () => {
  it("strips the player's name from coach text before it is sent", () => {
    const clean = nameRemover("Lena Bauer");
    expect(clean("Lena will call the stack")).toBe("the player will call the stack");
    expect(["Bauer's dump", "hucks"].map(clean)).toEqual(["the player’s dump", "hucks"]);
  });

  it("returns text unchanged for a blank or one-letter name", () => {
    expect(nameRemover(" ")("Lena throws")).toBe("Lena throws");
    expect(nameRemover("L")("L throws")).toBe("L throws");
  });
});

describe("removeName", () => {
  const result = (text: string) => ({
    feedback: [{ aspect: "matters_to_player" as const, text }],
    suggested_goal: text,
    questions_for_player: [text],
  });

  it("replaces the full name and each part in every field", () => {
    const r = removeName(result("Check whether Lena Bauer wants this; Lena already has a goal. Bauer agrees."), "Lena Bauer");
    const expected = "Check whether the player wants this; the player already has a goal. the player agrees.";
    expect(r.feedback[0].text).toBe(expected);
    expect(r.suggested_goal).toBe(expected);
    expect(r.questions_for_player[0]).toBe(expected);
  });

  it("keeps possessives readable and ignores case", () => {
    expect(removeName(result("LENA's huck and Lena’s forehand"), "Lena").feedback[0].text).toBe(
      "the player’s huck and the player’s forehand",
    );
  });

  it("does not touch words that only contain the name", () => {
    expect(removeName(result("Helena and Lenards stay"), "Lena").feedback[0].text).toBe("Helena and Lenards stay");
  });

  it("handles names with accents and regex characters", () => {
    expect(removeName(result("Zoë (Zo) is ready"), "Zoë").feedback[0].text).toBe("the player (Zo) is ready");
    expect(removeName(result("A.J. throws"), "A.J.").feedback[0].text).toBe("the player throws");
  });

  it("leaves a null suggestion alone", () => {
    expect(removeName({ feedback: [], suggested_goal: null, questions_for_player: [] }, "Lena").suggested_goal).toBeNull();
  });
});
