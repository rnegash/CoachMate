import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// Coach-side reads for Player Detail: check-ins the player shared (YES-
// confirmed, goal-linked). Drafts are never read here: they are not shared
// until the player says YES. The player's WhatsApp opt-in/STOP state is not
// shown to the coach either (decided 2026-10-12, CLAUDE.md).

export type GoalCheckin = { id: string; goal_id: string; text: string; created_at: string };

/** Shared check-ins per goal ID, newest first. */
export async function listPlayerCheckins(playerId: string): Promise<Map<string, GoalCheckin[]>> {
  const { data, error } = await supabaseAdmin()
    .from("goal_checkins")
    .select("id, goal_id, text, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .returns<GoalCheckin[]>();
  if (error) throw new Error(error.message);
  const byGoal = new Map<string, GoalCheckin[]>();
  for (const c of data) byGoal.set(c.goal_id, [...(byGoal.get(c.goal_id) ?? []), c]);
  return byGoal;
}
