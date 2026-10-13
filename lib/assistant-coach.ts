import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { loadSystemPrompt } from "@/lib/ai-prompt";
import type { ChatTurn } from "@/lib/assistant-coach-input";

// Assistant Coach (Claude API). Spec: documentation/AI assistant coach/assistant-coach.technical-spec.md
// Stateless and without player context: it sees only what the coach typed in
// this session. No DB access, nothing is stored (CLAUDE.md, Assistant Coach).

// Haiku 5.5, the current Haiku (the spec's Haiku 4.5 is superseded). Thinking
// off and low effort: short conversational answers, low latency.
const MODEL = "claude-haiku-5-5";

let systemPrompt: Promise<string> | undefined;
let client: Anthropic | undefined;

export type CoachResponse = { ok: true; reply: string } | { ok: false; message: string };

const UNAVAILABLE = "No reply available right now. Try again.";

export async function askAssistantCoach(turns: ChatTurn[]): Promise<CoachResponse> {
  try {
    systemPrompt ??= loadSystemPrompt("AI assistant coach", "assistant-coach.prompt.md");
    client ??= new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // Fixed prompt + sport reference: cached across requests and turns.
      system: [{ type: "text", text: await systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: turns.map((t) => ({ role: t.role, content: t.text })),
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
    });
    const reply = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    // max_tokens: keep the partial answer rather than lose it.
    if (response.stop_reason === "refusal" || !reply) return { ok: false, message: UNAVAILABLE };
    return { ok: true, reply };
  } catch (e) {
    systemPrompt = undefined; // a missing prompt file shouldn't stick until restart
    // Log only the error type and status: messages could echo request content.
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    console.error("Assistant Coach request failed:", e instanceof Error ? e.name : typeof e, status ?? "");
    return { ok: false, message: UNAVAILABLE };
  }
}
