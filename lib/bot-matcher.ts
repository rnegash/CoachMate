import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  askPick,
  askShare,
  buildMatcherMessage,
  checkinText,
  DISCARDED,
  MatchSchema,
  matchedGoal,
  nextStep,
  NO_GOALS,
  SAVED,
  TOO_LONG,
  UNAVAILABLE,
  type FlowGoal,
} from "@/lib/checkin-flow";
import { draftExpiry } from "@/lib/retention";
import { supabaseAdmin } from "@/lib/supabase";

// BotMatcher (CLAUDE.md, BotMatcher/BotDelivery split). Sees a player ID,
// the message text and that player's goals. Never reads contact data,
// consent records or roster names, and never talks to Twilio: BotDelivery
// calls handleCheckin() and sends the returned text.
// Tables used: goals (read), checkin_drafts, goal_checkins.

const MODEL = "claude-opus-5-5";
const PROMPT_FILE = path.join(process.cwd(), "documentation", "AI checkin matcher", "checkin-matcher.prompt.md");

let systemPrompt: Promise<string> | undefined;
let client: Anthropic | undefined;

/** Active goals, oldest first, so the numbers in a reply stay stable while the player answers. */
async function activeGoals(playerId: string): Promise<FlowGoal[]> {
  const { data, error } = await supabaseAdmin()
    .from("goals")
    .select("id, text")
    .eq("player_id", playerId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .returns<FlowGoal[]>();
  if (error) throw new Error(error.message);
  return data;
}

type DraftRow = { goal_id: string | null; text: string };

/** The player's draft, or null if there is none or it has expired. */
async function currentDraft(playerId: string, now: Date): Promise<DraftRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("checkin_drafts")
    .select("goal_id, text")
    .eq("player_id", playerId)
    .gt("expires_at", now.toISOString())
    .maybeSingle<DraftRow>();
  if (error) throw new Error(error.message);
  return data;
}

async function saveDraft(playerId: string, goalId: string | null, text: string, now: Date) {
  const { error } = await supabaseAdmin().from("checkin_drafts").upsert({
    player_id: playerId,
    goal_id: goalId,
    text,
    created_at: now.toISOString(),
    expires_at: draftExpiry(now),
  });
  if (error) throw new Error(error.message);
}

/** Links the draft to a goal; keeps its creation and expiry time so the 24 h limit holds. */
async function setDraftGoal(playerId: string, goalId: string) {
  const { error } = await supabaseAdmin()
    .from("checkin_drafts")
    .update({ goal_id: goalId })
    .eq("player_id", playerId);
  if (error) throw new Error(error.message);
}

/** Deletes the player's draft. Also called by BotDelivery on STOP. */
export async function discardDraft(playerId: string) {
  const { error } = await supabaseAdmin().from("checkin_drafts").delete().eq("player_id", playerId);
  if (error) throw new Error(error.message);
}

/** Claude picks the goal a message is about; null when unclear or on any failure. */
async function matchGoal(goals: FlowGoal[], message: string): Promise<number | null> {
  systemPrompt ??= readFile(PROMPT_FILE, "utf8");
  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system: [{ type: "text", text: await systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildMatcherMessage(goals, message) }],
    output_config: { effort: "low", format: betaZodOutputFormat(MatchSchema) },
    // Server-side refusal fallback (Claude API only).
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason !== "end_turn" || !response.parsed_output) return null;
  return response.parsed_output.goal_number;
}

/** Handles one message from an opted-in player and returns the fixed reply text. */
export async function handleCheckin(playerId: string, message: string): Promise<string> {
  const now = new Date();
  try {
    const [goals, draft] = await Promise.all([activeGoals(playerId), currentDraft(playerId, now)]);
    const step = nextStep(message, goals, draft && { goalId: draft.goal_id });

    switch (step.kind) {
      case "no_goals":
        return NO_GOALS;
      case "too_long":
        return TOO_LONG;
      case "discard":
        await discardDraft(playerId);
        return DISCARDED;
      case "repeat_pick":
        return askPick(goals);
      case "set_goal": {
        await setDraftGoal(playerId, step.goalId);
        return askShare(goals.find((g) => g.id === step.goalId)!, goals);
      }
      case "save": {
        const db = supabaseAdmin();
        const { error } = await db
          .from("goal_checkins")
          .insert({ player_id: playerId, goal_id: draft!.goal_id, text: draft!.text });
        if (error) throw new Error(error.message);
        await discardDraft(playerId);
        return SAVED;
      }
      case "new": {
        const text = checkinText(message);
        let number: number | null = null;
        try {
          number = await matchGoal(goals, text);
        } catch (e) {
          // No match is a safe fallback: the player is asked to pick.
          logFailure("Check-in matcher request failed:", e);
        }
        const goal = matchedGoal(goals, number);
        await saveDraft(playerId, goal?.id ?? null, text, now);
        return goal ? askShare(goal, goals, step.replacesDraft) : askPick(goals, step.replacesDraft);
      }
    }
  } catch (e) {
    logFailure("Check-in handling failed:", e);
    return UNAVAILABLE;
  }
}

// Log only the error type and status: messages could echo player text.
function logFailure(label: string, e: unknown) {
  const status = e instanceof Anthropic.APIError ? e.status : undefined;
  console.error(label, e instanceof Error ? e.name : typeof e, status ?? "");
}
