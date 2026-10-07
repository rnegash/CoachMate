import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

export type Goal = {
  id: string;
  text: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

const GOAL_COLUMNS = "id, text, status, created_at, updated_at, completed_at";

/** A player's goals: active ones most recently updated first, completed ones most recently completed first. */
export async function listPlayerGoals(playerId: string) {
  const { data, error } = await supabaseAdmin()
    .from("goals")
    .select(GOAL_COLUMNS)
    .eq("player_id", playerId)
    .order("updated_at", { ascending: false })
    .returns<Goal[]>();
  if (error) throw new Error(error.message);
  return {
    active: data.filter((g) => g.status === "active"),
    completed: data
      .filter((g) => g.status === "completed")
      .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
  };
}

export async function activeGoalTexts(playerId: string): Promise<string[]> {
  return (await listPlayerGoals(playerId)).active.map((g) => g.text);
}

export async function createGoal(playerId: string, text: string) {
  const { error } = await supabaseAdmin().from("goals").insert({ player_id: playerId, text });
  if (error) throw new Error(error.message);
}

export async function completeGoal(playerId: string, goalId: string) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("goals")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", goalId)
    .eq("player_id", playerId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
}
