import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  assembleSystemPrompt,
  buildUserMessage,
  limitResult,
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
// Single-team app; there is no sport setting yet.
const SPORT = "ultimate";
const DOCS = path.join(process.cwd(), "documentation");

let systemPrompt: Promise<string> | undefined;

async function loadSystemPrompt(): Promise<string> {
  const prompt = await readFile(
    path.join(DOCS, "AI goal mentor", "goal-mentor.prompt.md"),
    "utf8",
  );
  const reference = await readFile(
    path.join(DOCS, "AI sport knowledge", `${SPORT}.md`),
    "utf8",
  ).catch(() => null);
  return assembleSystemPrompt(prompt, SPORT, reference);
}

let client: Anthropic | undefined;

export type MentorResponse =
  | { ok: true; result: MentorResult }
  | { ok: false; message: string };

const UNAVAILABLE =
  "No feedback available right now. Try again, or save the goal as it is.";

/**
 * `playerName` never goes to the API; it is only used to strip the name
 * from the response in case the model repeats one typed into the draft.
 */
export async function getGoalFeedback(
  today: string,
  draft: string,
  otherGoals: string[],
  playerName: string,
): Promise<MentorResponse> {
  try {
    systemPrompt ??= loadSystemPrompt();
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
        { role: "user", content: buildUserMessage(today, draft, otherGoals) },
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
