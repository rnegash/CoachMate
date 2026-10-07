// Pure parts of the Goal Mentor integration: prompt assembly, the user
// message, and the response schema. No API, file or DB access.
// Spec: documentation/AI goal mentor/goal-mentor.technical-spec.md
import { z } from "zod";

export const GOAL_TEXT_MAX = 500;

/** Trims and collapses whitespace; null when nothing is left or it's too long. */
export function normalizeGoalText(text: string): string | null {
  const t = text.trim().replace(/\s+/g, " ");
  return t && t.length <= GOAL_TEXT_MAX ? t : null;
}

/** Coach text can't open or close a prompt tag. */
export function escapeTagText(text: string): string {
  return text.replace(/</g, "‹").replace(/>/g, "›");
}

/** Sport reference file -> the part sent to the model (drops the leading HTML comment). */
export function referenceBody(fileText: string): string {
  return fileText.replace(/^\s*<!--[\s\S]*?-->\s*/, "").trim();
}

const NO_REFERENCE =
  "SPORT REFERENCE: none available. Use general knowledge of the sport and say when a sport-specific point is uncertain.";

/** Fills {{SPORT}} and {{SPORT_REFERENCE}} in a prompt file (spec sections 2 and 2a). */
export function assembleSystemPrompt(prompt: string, sport: string | null, reference: string | null): string {
  const withSport = sport
    ? prompt.replaceAll("{{SPORT}}", sport)
    : prompt.replaceAll("adult recreational {{SPORT}} teams", "adult recreational sports teams");
  return withSport.replace("{{SPORT_REFERENCE}}", reference ? referenceBody(reference) : NO_REFERENCE).trim();
}

/** The single user message (spec section 3). No player ID, no attendance. */
export function buildUserMessage(today: string, draft: string, otherGoals: string[]): string {
  const lines = [`<today>${today}</today>`, `<goal_draft>${escapeTagText(draft)}</goal_draft>`];
  if (otherGoals.length > 0) {
    lines.push("<context>", "other_active_goals:", ...otherGoals.map((g) => `- ${escapeTagText(g)}`), "</context>");
  }
  return lines.join("\n");
}

export const ASPECTS = ["clear_and_checkable", "realistic", "matters_to_player"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_LABELS: Record<Aspect, string> = {
  clear_and_checkable: "Clear and checkable",
  realistic: "Realistic",
  matters_to_player: "Matters to the player",
};

// Spec section 5. No length limits in the schema: an extra item shouldn't
// fail the whole response, so limitResult() trims instead.
export const MentorResultSchema = z.object({
  feedback: z.array(z.object({ aspect: z.enum(ASPECTS), text: z.string() })),
  suggested_goal: z.string().nullable(),
  questions_for_player: z.array(z.string()),
});

export type MentorResult = z.infer<typeof MentorResultSchema>;

export const MAX_FEEDBACK = 2;
export const MAX_QUESTIONS = 2;

/** Keeps the first items the prompt allows; a blank suggestion counts as none. */
export function limitResult(r: MentorResult): MentorResult {
  return {
    feedback: r.feedback.slice(0, MAX_FEEDBACK),
    suggested_goal: r.suggested_goal?.trim() || null,
    questions_for_player: r.questions_for_player.slice(0, MAX_QUESTIONS),
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Safety net for the prompt's "never repeat a name" rule: replaces the
 * selected player's full name and each part of it (first name, surname) in
 * every field. Only this player's own name is known to the server.
 */
export function removeName(r: MentorResult, playerName: string): MentorResult {
  const parts = [playerName.trim(), ...playerName.trim().split(/\s+/)]
    .filter((p) => p.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (parts.length === 0) return r;
  const pattern = new RegExp(`(?<![\\p{L}])(?:${parts.map(escapeRegExp).join("|")})('s|’s)?(?![\\p{L}])`, "giu");
  const clean = (t: string) => t.replace(pattern, (_m, possessive?: string) => (possessive ? "the player’s" : "the player"));
  return {
    feedback: r.feedback.map((f) => ({ ...f, text: clean(f.text) })),
    suggested_goal: r.suggested_goal === null ? null : clean(r.suggested_goal),
    questions_for_player: r.questions_for_player.map(clean),
  };
}
