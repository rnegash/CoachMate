import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// Coach-side reads for Player Detail: check-ins the player shared (YES-
// confirmed, goal-linked) and the player's WhatsApp opt-in state. Drafts
// are never read here: they are not shared until the player says YES.

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

export type WhatsappStatus =
  | { state: "not_joined" }
  | { state: "opted_in"; since: string }
  | { state: "opted_out"; since: string };

export async function whatsappStatus(playerId: string): Promise<WhatsappStatus> {
  const { data, error } = await supabaseAdmin()
    .from("whatsapp_consents")
    .select("opted_in_at, opted_out_at")
    .eq("player_id", playerId)
    .maybeSingle<{ opted_in_at: string | null; opted_out_at: string | null }>();
  if (error) throw new Error(error.message);
  if (data?.opted_out_at) return { state: "opted_out", since: data.opted_out_at };
  if (data?.opted_in_at) return { state: "opted_in", since: data.opted_in_at };
  return { state: "not_joined" };
}
