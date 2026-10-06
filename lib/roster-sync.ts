import "server-only";
import { readColumns, readHeaderRow, sheetsClient } from "@/lib/sheets";
import { supabaseAdmin } from "@/lib/supabase";

const ROSTER_TAB = "Roster";
const HEADERS = { id: "player_id", name: "name", jersey: "jersey" } as const;
// player_id reaches the Claude API later, so it must be opaque: "P" + digits
// (e.g. P001). Anything else (initials, names, jersey-based keys) is rejected.
// Mirrored by the players_id_format check in the migration.
export const PLAYER_ID_FORMAT = /^P\d{1,6}$/;

export type RosterSyncResult = {
  synced: number;
  removed: number;
  skipped: { row: number; reason: string }[];
};

type RosterRow = { id: string; name: string; jersey_number: string | null };

async function readRosterSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ROSTER_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ROSTER_SPREADSHEET_ID");
  const api = sheetsClient();

  const header = (await readHeaderRow(api, spreadsheetId, ROSTER_TAB)).map((h) =>
    String(h).trim().toLowerCase(),
  );
  const idx = {
    id: header.indexOf(HEADERS.id),
    name: header.indexOf(HEADERS.name),
    jersey: header.indexOf(HEADERS.jersey),
  };
  if (idx.id < 0 || idx.name < 0) {
    throw new Error(
      `The "${ROSTER_TAB}" tab needs "${HEADERS.id}" and "${HEADERS.name}" header columns in row 1.`,
    );
  }

  const { columns, rowCount } = await readColumns(
    api,
    spreadsheetId,
    ROSTER_TAB,
    [idx.id, idx.name, idx.jersey].filter((i) => i >= 0),
  );
  const cell = (col: number, row: number) =>
    col < 0 ? "" : String(columns.get(col)?.[row] ?? "").trim();

  const rows: RosterRow[] = [];
  const skipped: RosterSyncResult["skipped"] = [];
  const seen = new Set<string>();
  // Every player_id present in the Sheet, including rows skipped for a
  // missing name: a data-entry slip must not mark a player as removed.
  const presentIds = new Set<string>();
  for (let r = 0; r < rowCount; r++) {
    const sheetRow = r + 2;
    const id = cell(idx.id, r);
    const name = cell(idx.name, r);
    const jersey = cell(idx.jersey, r);
    if (!id && !name && !jersey) continue;
    if (id) presentIds.add(id);
    if (!id) skipped.push({ row: sheetRow, reason: `missing ${HEADERS.id}` });
    else if (!PLAYER_ID_FORMAT.test(id)) skipped.push({ row: sheetRow, reason: `${HEADERS.id} must look like P001` });
    else if (!name) skipped.push({ row: sheetRow, reason: `missing ${HEADERS.name}` });
    else if (seen.has(id)) skipped.push({ row: sheetRow, reason: `duplicate ${HEADERS.id}` });
    else {
      seen.add(id);
      rows.push({ id, name, jersey_number: jersey || null });
    }
  }
  return { rows, skipped, presentIds };
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

  const { error: logError } = await db.from("sheet_syncs").insert({
    source: "roster",
    synced_at: now,
    rows_synced: rows.length,
    rows_skipped: skipped.length,
  });
  if (logError) throw new Error(logError.message);

  return { synced: rows.length, removed: toRemove.length, skipped };
}
