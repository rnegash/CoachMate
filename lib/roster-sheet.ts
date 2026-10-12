// Pure parsing of the Roster tab — no API or DB access.
import type { CellValue, Columns } from "@/lib/sheet-cells";

export const ROSTER_HEADERS = { id: "player_id", name: "name", jersey: "jersey", phone: "phone" } as const;
// player_id reaches the Claude API later, so it must be opaque: "P" + digits
// (e.g. P001). Anything else (initials, names, jersey-based keys) is rejected.
// Mirrored by the players_id_format check in the migration.
export const PLAYER_ID_FORMAT = /^P\d{1,6}$/;

// E.164 with a leading "+". Mirrored by the player_contacts_phone_e164 check
// in the migration.
export const PHONE_FORMAT = /^\+[1-9]\d{6,14}$/;

export type RosterRow = { id: string; name: string; jersey_number: string | null };
export type RosterSkip = { row: number; reason: string };
/** A phone number for a synced player; goes to player_contacts, never players. */
export type RosterContact = { player_id: string; phone: string };
export type RosterColumnIndex = { id: number; name: number; jersey: number; phone: number };

/**
 * Normalizes a phone cell to E.164 ("+4917612345678"), or null if it can't.
 * Strips spaces, dashes, dots and parentheses (dropping a "(0)" trunk
 * prefix, as in "+49 (0)176 ..."), and turns a leading "00" into "+".
 * Numbers without a country code are not guessed.
 */
export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/\(0\)/g, "").replace(/[\s\-.()]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  return PHONE_FORMAT.test(s) ? s : null;
}

/**
 * Player ids whose stored contact must be deleted before upserting `next`:
 * no valid phone now, a changed phone, or a phone that now belongs to
 * another player (deleting first avoids a unique-phone clash on upsert).
 */
export function staleContactIds(existing: RosterContact[], next: RosterContact[]): string[] {
  const nextByPlayer = new Map(next.map((c) => [c.player_id, c.phone]));
  return existing
    .filter((c) => nextByPlayer.get(c.player_id) !== c.phone)
    .map((c) => c.player_id);
}

/** Locates the roster columns in row 1 (case-insensitive); -1 for a missing column. */
export function rosterColumnIndex(header: CellValue[]): RosterColumnIndex {
  const names = header.map((h) => String(h).trim().toLowerCase());
  return {
    id: names.indexOf(ROSTER_HEADERS.id),
    name: names.indexOf(ROSTER_HEADERS.name),
    jersey: names.indexOf(ROSTER_HEADERS.jersey),
    phone: names.indexOf(ROSTER_HEADERS.phone),
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
  // Phone problems don't skip the row: the player still syncs, just without
  // a contact. Warnings carry only row + reason, never the number itself.
  const phoneIssues: RosterSkip[] = [];
  const phoneRows = new Map<string, { row: number; player_id: string }[]>();
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
      const rawPhone = cell(idx.phone, r);
      if (rawPhone) {
        const phone = normalizePhone(rawPhone);
        if (!phone) phoneIssues.push({ row: sheetRow, reason: "phone not in international format" });
        else phoneRows.set(phone, [...(phoneRows.get(phone) ?? []), { row: sheetRow, player_id: id }]);
      }
    }
  }

  // A phone shared by two players can't be routed to either: keep neither.
  const contacts: RosterContact[] = [];
  for (const [phone, owners] of phoneRows) {
    if (owners.length === 1) contacts.push({ player_id: owners[0].player_id, phone });
    else for (const o of owners) phoneIssues.push({ row: o.row, reason: "duplicate phone" });
  }
  phoneIssues.sort((a, b) => a.row - b.row);
  return { rows, skipped, presentIds, contacts, phoneIssues };
}
