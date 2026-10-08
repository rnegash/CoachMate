import "server-only";
import { parseRosterRows, ROSTER_HEADERS, rosterColumnIndex, type RosterSkip } from "@/lib/roster-sheet";
import { readColumns, readHeaderRow, sheetsClient } from "@/lib/sheets";
import { supabaseAdmin } from "@/lib/supabase";

const ROSTER_TAB = "Roster";

export type RosterSyncResult = {
  synced: number;
  removed: number;
  skipped: RosterSkip[];
};

async function readRosterSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ROSTER_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ROSTER_SPREADSHEET_ID");
  const api = sheetsClient();

  const idx = rosterColumnIndex(await readHeaderRow(api, spreadsheetId, ROSTER_TAB));
  if (idx.id < 0 || idx.name < 0) {
    throw new Error(
      `The "${ROSTER_TAB}" tab needs "${ROSTER_HEADERS.id}" and "${ROSTER_HEADERS.name}" header columns in row 1.`,
    );
  }

  const { columns, rowCount } = await readColumns(
    api,
    spreadsheetId,
    ROSTER_TAB,
    [idx.id, idx.name, idx.jersey].filter((i) => i >= 0),
  );
  return parseRosterRows(columns, rowCount, idx);
}

export async function syncRoster(): Promise<RosterSyncResult> {
  const { rows, skipped, presentIds } = await readRosterSheet();
  // Guard: an empty read (wrong tab, cleared sheet) must not mark the
  // whole team as removed.
  if (rows.length === 0) {
    throw new Error(`No players found in the "${ROSTER_TAB}" tab. Nothing was changed.`);
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { error: upsertError } = await db
    .from("players")
    .upsert(rows.map((r) => ({ ...r, removed_at: null, updated_at: now })));
  if (upsertError) throw new Error(upsertError.message);

  const { data: active, error: activeError } = await db
    .from("players")
    .select("id")
    .is("removed_at", null);
  if (activeError) throw new Error(activeError.message);

  const toRemove = (active ?? [])
    .map((p) => p.id as string)
    .filter((id) => !presentIds.has(id));
  if (toRemove.length > 0) {
    const { error } = await db
      .from("players")
      .update({ removed_at: now, updated_at: now })
      .in("id", toRemove);
    if (error) throw new Error(error.message);
  }

  // Goals are deleted when their player leaves the roster (CLAUDE.md,
  // "Retention rule"). Covers every removed player, not just this sync's,
  // so players removed before this rule existed are cleaned up too.
  const { data: removed, error: removedError } = await db
    .from("players")
    .select("id")
    .not("removed_at", "is", null);
  if (removedError) throw new Error(removedError.message);
  const removedIds = (removed ?? []).map((p) => p.id as string);
  if (removedIds.length > 0) {
    const { error } = await db.from("goals").delete().in("player_id", removedIds);
    if (error) throw new Error(error.message);
  }

  const { error: logError } = await db.from("sheet_syncs").insert({
    source: "roster",
    synced_at: now,
    rows_synced: rows.length,
    rows_skipped: skipped.length,
  });
  if (logError) throw new Error(logError.message);

  return { synced: rows.length, removed: toRemove.length, skipped };
}
