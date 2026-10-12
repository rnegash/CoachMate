import { describe, expect, it } from "vitest";
import { CONSENT_INVITE, parseKeyword } from "@/lib/bot-consent";

describe("parseKeyword", () => {
  it("reads START and STOP as the whole message only", () => {
    expect(parseKeyword(" Stop! ")).toBe("stop");
    expect(parseKeyword("START")).toBe("start");
    expect(parseKeyword("stop by after training")).toBeNull();
  });
});

describe("CONSENT_INVITE", () => {
  it("states what is stored, the AI, the US processing and how to stop", () => {
    for (const phrase of ["Claude", "YES", "24 hours", "7 days following your STOP", "US", "own copies", "START"]) {
      expect(CONSENT_INVITE).toContain(phrase);
    }
  });
});
