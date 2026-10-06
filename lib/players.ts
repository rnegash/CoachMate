import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

export type PlayerSummary = {
  id: string;
  name: string;
  jersey_number: string | null;
};

export type Player = PlayerSummary & { removed_at: string | null };

export async function listRosterPlayers(): Promise<PlayerSummary[]> {
  const { data, error } = await supabaseAdmin()
    .from("players")
    .select("id, name, jersey_number")
    .is("removed_at", null)
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getPlayer(id: string): Promise<Player | null> {
  const { data, error } = await supabaseAdmin()
    .from("players")
    .select("id, name, jersey_number, removed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function lastSyncAt(source: "roster" | "attendance"): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("sheet_syncs")
    .select("synced_at")
    .eq("source", source)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.synced_at ?? null;
}
