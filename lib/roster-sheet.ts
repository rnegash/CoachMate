// Pure parsing of the Roster tab — no API or DB access.
import type { CellValue, Columns } from "@/lib/sheet-cells";

export const ROSTER_HEADERS = { id: "player_id", name: "name", jersey: "jersey" } as const;
// player_id reaches the Claude API later, so it must be opaque: "P" + digits
// (e.g. P001). Anything else (initials, names, jersey-based keys) is rejected.
// Mirrored by the players_id_format check in the migration.
export const PLAYER_ID_FORMAT = /^P\d{1,6}$/;

export type RosterRow = { id: string; name: string; jersey_number: string | null };
export type RosterSkip = { row: number; reason: string };
export type RosterColumnIndex = { id: number; name: number; jersey: number };

/** Locates the roster columns in row 1 (case-insensitive); -1 for a missing column. */
export function rosterColumnIndex(header: CellValue[]): RosterColumnIndex {
  const names = header.map((h) => String(h).trim().toLowerCase());
  return {
    id: names.indexOf(ROSTER_HEADERS.id),
    name: names.indexOf(ROSTER_HEADERS.name),
    jersey: names.indexOf(ROSTER_HEADERS.jersey),
  };
}

export function parseRosterRows(columns: Columns, rowCount: number, idx: RosterColumnIndex) {
  const cell = (col: number, row: number) =>
    col < 0 ? "" : String(columns.get(col)?.[row] ?? "").trim();

  const rows: RosterRow[] = [];
  const skipped: RosterSkip[] = [];
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
    if (!id) skipped.push({ row: sheetRow, reason: `missing ${ROSTER_HEADERS.id}` });
    else if (!PLAYER_ID_FORMAT.test(id)) skipped.push({ row: sheetRow, reason: `${ROSTER_HEADERS.id} must look like P001` });
    else if (!name) skipped.push({ row: sheetRow, reason: `missing ${ROSTER_HEADERS.name}` });
    else if (seen.has(id)) skipped.push({ row: sheetRow, reason: `duplicate ${ROSTER_HEADERS.id}` });
    else {
      seen.add(id);
      rows.push({ id, name, jersey_number: jersey || null });
    }
  }
  return { rows, skipped, presentIds };
}
