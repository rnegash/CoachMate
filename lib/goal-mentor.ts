import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { loadSystemPrompt } from "@/lib/ai-prompt";
import {
  buildUserMessage,
  limitResult,
  nameRemover,
  removeName,
  MentorResultSchema,
  type MentorResult,
} from "@/lib/goal-mentor-input";

// Goal Mentor (Claude API). Spec: documentation/AI goal mentor/goal-mentor.technical-spec.md
// Receives only the draft text and the player's other goal texts: no name,
// no player ID, no attendance (CLAUDE.md, Goal Mentor section).

// Sonnet 5.5 at low effort with thinking off: Haiku 4.5 ignored the
// output rules (no suggestions, repeated names) in testing on 2026-10-07.
const MODEL = "claude-sonnet-5-5";

let systemPrompt: Promise<string> | undefined;

let client: Anthropic | undefined;

export type MentorResponse =
  | { ok: true; result: MentorResult }
  | { ok: false; message: string };

const UNAVAILABLE =
  "No feedback available right now. Try again, or save the goal as it is.";

/**
 * `playerName` never goes to the API. It is stripped from the draft and the
 * other goal texts before sending (a coach may have typed it), and from the
 * response as a safety net.
 */
export async function getGoalFeedback(
  today: string,
  draft: string,
  otherGoals: string[],
  playerName: string,
): Promise<MentorResponse> {
  const clean = nameRemover(playerName);
  try {
    systemPrompt ??= loadSystemPrompt("AI goal mentor", "goal-mentor.prompt.md");
    client ??= new Anthropic();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      // Fixed prompt + sport reference (~5.5k tokens): cached across requests.
      system: [
        {
          type: "text",
          text: await systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: buildUserMessage(today, clean(draft), otherGoals.map(clean)),
        },
      ],
      thinking: { type: "between_tools" },
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(MentorResultSchema),
      },
      // Server-side refusal fallback (Claude API only).
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason !== "end_turn" || !response.parsed_output) {
      return { ok: false, message: UNAVAILABLE };
    }
    return {
      ok: true,
      result: removeName(limitResult(response.parsed_output), playerName),
    };
  } catch (e) {
    systemPrompt = undefined; // a missing prompt file shouldn't stick until restart
    // Log only the error type and status: messages could echo request content.
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    console.error(
      "Goal Mentor request failed:",
      e instanceof Error ? e.name : typeof e,
      status ?? "",
    );
    return { ok: false, message: UNAVAILABLE };
  }
}
