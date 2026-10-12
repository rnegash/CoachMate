import "server-only";
import { purgeCutoff } from "@/lib/retention";
import { supabaseAdmin } from "@/lib/supabase";

export type RetentionPurgeResult = { deleted: number; draftsExpired: number };

/**
 * Scheduled part of the retention rule (CLAUDE.md, "Retention rule"):
 *  - deletes the stored check-ins of every player whose STOP is at least
 *    7 days old. A START within the grace period clears opted_out_at, so
 *    that player's check-ins are kept. Whole rows; no redaction step.
 *  - deletes check-in drafts whose expires_at has passed.
 * Roster-removal deletion runs in the roster sync instead.
 */
export async function purgeRetention(now: Date = new Date()): Promise<RetentionPurgeResult> {
  return {
    deleted: await purgeOptedOutCheckins(now),
    draftsExpired: await purgeExpiredDrafts(now),
  };
}

/** Deletes goal_checkins of players opted out for 7+ days. Returns rows deleted. */
export async function purgeOptedOutCheckins(now: Date = new Date()): Promise<number> {
  const db = supabaseAdmin();
  const { data: optedOut, error: consentError } = await db
    .from("whatsapp_consents")
    .select("player_id")
    .not("opted_out_at", "is", null)
    .lte("opted_out_at", purgeCutoff(now));
  if (consentError) throw new Error(consentError.message);

  const playerIds = (optedOut ?? []).map((c) => c.player_id as string);
  if (playerIds.length === 0) return 0;

  const { error, count } = await db
    .from("goal_checkins")
    .delete({ count: "exact" })
    .in("player_id", playerIds);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Deletes checkin_drafts whose expires_at is at or before now. Returns rows deleted. */
export async function purgeExpiredDrafts(now: Date = new Date()): Promise<number> {
  const { error, count } = await supabaseAdmin()
    .from("checkin_drafts")
    .delete({ count: "exact" })
    .lte("expires_at", now.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}
