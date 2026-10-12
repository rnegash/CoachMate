// Structural check for the BotMatcher/BotDelivery split (CLAUDE.md): each
// side's source must not reach the other side's data or logic.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Code only: comments may name the other side to explain the split.
const source = (file: string) =>
  readFileSync(path.join(__dirname, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("BotMatcher / BotDelivery boundary", () => {
  it("BotMatcher never touches phone, contact, consent, roster or Twilio data", () => {
    for (const file of ["bot-matcher.ts", "checkin-flow.ts"]) {
      const code = source(file);
      for (const forbidden of ["player_contacts", "whatsapp_consents", 'from("players")', "phone", "twilio", "bot-delivery", "bot-consent"]) {
        expect(code.toLowerCase(), `${file} mentions ${forbidden}`).not.toContain(forbidden.toLowerCase());
      }
    }
  });

  it("BotDelivery never touches goals, check-ins, the AI or the reply logic", () => {
    for (const file of ["bot-delivery.ts", "bot-consent.ts", "twilio.ts"]) {
      const code = source(file);
      for (const forbidden of ["@anthropic-ai", '"goals"', "goal_checkins", "checkin_drafts", "checkin-flow", "goal-mentor"]) {
        expect(code, `${file} mentions ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});
