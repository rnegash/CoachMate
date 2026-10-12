"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { localIsoDate } from "@/lib/format";
import { getGoalFeedback, type MentorResponse } from "@/lib/goal-mentor";
import { GOAL_TEXT_MAX, goalTextForStorage, normalizeGoalText } from "@/lib/goal-mentor-input";
import { activeGoalTexts, completeGoal, createGoal } from "@/lib/goals";
import { getPlayer } from "@/lib/players";
import { PLAYER_ID_FORMAT } from "@/lib/roster-sheet";

const playerPath = (playerId: string) => `/players/${encodeURIComponent(playerId)}`;

function checkPlayerId(playerId: string) {
  if (!PLAYER_ID_FORMAT.test(playerId)) throw new Error("Unknown player.");
}

const TEXT_ERROR = `Write a goal of up to ${GOAL_TEXT_MAX} characters.`;

export async function goalFeedbackAction(playerId: string, draft: string): Promise<MentorResponse> {
  checkPlayerId(playerId);
  const text = normalizeGoalText(draft);
  if (!text) return { ok: false, message: TEXT_ERROR };
  const [player, otherGoals] = await Promise.all([getPlayer(playerId), activeGoalTexts(playerId)]);
  if (!player) return { ok: false, message: "Unknown player." };
  return getGoalFeedback(localIsoDate(new Date()), text, otherGoals, player.name);
}

/** Saves the goal and returns to Player Detail; returns an error message otherwise. */
export async function saveGoalAction(playerId: string, draft: string): Promise<string> {
  checkPlayerId(playerId);
  if (!normalizeGoalText(draft)) return TEXT_ERROR;
  try {
    const player = await getPlayer(playerId);
    if (!player) return "Unknown player.";
    // Stored without the player's own name (see goalTextForStorage).
    await createGoal(playerId, goalTextForStorage(draft, player.name)!);
  } catch {
    return "Saving failed. Try again.";
  }
  revalidatePath(playerPath(playerId));
  redirect(playerPath(playerId));
}

export async function completeGoalAction(playerId: string, goalId: string) {
  checkPlayerId(playerId);
  await completeGoal(playerId, goalId);
  revalidatePath(playerPath(playerId));
}
