"use server";

import { askAssistantCoach, type CoachResponse } from "@/lib/assistant-coach";
import { checkHistory } from "@/lib/assistant-coach-input";

/** One chat turn. The browser holds the session; nothing is stored here. */
export async function askCoachAction(history: unknown): Promise<CoachResponse> {
  const checked = checkHistory(history);
  if (!checked.ok) return checked;
  return askAssistantCoach(checked.turns);
}
