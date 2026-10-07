// Pure diffs between what's synced in Supabase and what's in the Sheet now —
// decides what the attendance sync deletes. No DB access.

type MarkKey = { player_id: string; session_id: string };

/** Synced session ids whose column is no longer in the Sheet. */
export function goneSessionIds(existingIds: string[], sheetSessions: { id: string }[]): string[] {
  const inSheet = new Set(sheetSessions.map((s) => s.id));
  return existingIds.filter((id) => !inSheet.has(id));
}

/**
 * Synced marks with no counterpart in the Sheet (blank cell, or the player's
 * row was skipped), grouped as session id -> player ids so each session is
 * one delete call.
 */
export function staleMarksBySession(existing: MarkKey[], current: MarkKey[]): Map<string, string[]> {
  const key = (m: MarkKey) => `${m.player_id}|${m.session_id}`;
  const keep = new Set(current.map(key));
  const stale = new Map<string, string[]>();
  for (const m of existing) {
    if (keep.has(key(m))) continue;
    const list = stale.get(m.session_id) ?? [];
    list.push(m.player_id);
    stale.set(m.session_id, list);
  }
  return stale;
}
