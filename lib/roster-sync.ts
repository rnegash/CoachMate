import "server-only";
import {
  parseRosterRows,
  ROSTER_HEADERS,
  rosterColumnIndex,
  staleContactIds,
  type RosterContact,
  type RosterSkip,
} from "@/lib/roster-sheet";
import { readColumns, readHeaderRow, sheetsClient } from "@/lib/sheets";
import { supabaseAdmin } from "@/lib/supabase";

const ROSTER_TAB = "Roster";

export type RosterSyncResult = {
  synced: number;
  removed: number;
  skipped: RosterSkip[];
  /** Rows that synced but whose phone was not used (row + reason only). */
  phoneIssues: RosterSkip[];
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
    [idx.id, idx.name, idx.jersey, idx.phone].filter((i) => i >= 0),
  );
  return parseRosterRows(columns, rowCount, idx);
}

export async function syncRoster(): Promise<RosterSyncResult> {
  const { rows, skipped, presentIds, contacts, phoneIssues } = await readRosterSheet();
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

  // Check-in text (stored and draft), goals and phone numbers are deleted when their player
  // leaves the roster (CLAUDE.md, "Retention rule"). Covers every removed
  // player, not just this sync's, so players removed before this rule
  // existed are cleaned up too. Deleting goals would cascade to
  // goal_checkins, but check-ins are deleted explicitly so the rule
  // doesn't depend on that cascade.
  const { data: removed, error: removedError } = await db
    .from("players")
    .select("id")
    .not("removed_at", "is", null);
  if (removedError) throw new Error(removedError.message);
  const removedIds = (removed ?? []).map((p) => p.id as string);
  if (removedIds.length > 0) {
    for (const table of ["checkin_drafts", "goal_checkins", "goals", "player_contacts"]) {
      const { error } = await db.from(table).delete().in("player_id", removedIds);
      if (error) throw new Error(error.message);
    }
    // A returning player must send START again, agreeing to the current
    // wording; an earlier STOP timestamp is kept.
    const { error: consentError } = await db
      .from("whatsapp_consents")
      .update({ opted_in_at: null, consent_version: null, updated_at: now })
      .in("player_id", removedIds);
    if (consentError) throw new Error(consentError.message);
  }

  await replaceContacts(db, contacts, now);

  const { error: logError } = await db.from("sheet_syncs").insert({
    source: "roster",
    synced_at: now,
    rows_synced: rows.length,
    rows_skipped: skipped.length,
  });
  if (logError) throw new Error(logError.message);

  return { synced: rows.length, removed: toRemove.length, skipped, phoneIssues };
}

// Mirrors the Sheet's phone column into player_contacts: stale rows (no
// valid phone now, changed phone, removed player) are deleted first, with
// their opt-in reset, then the current ones upserted. Like the rest of the roster copy, a skipped
// Sheet row loses its contact until the row is fixed and synced again.
async function replaceContacts(
  db: ReturnType<typeof supabaseAdmin>,
  contacts: RosterContact[],
  now: string,
) {
  const { data: existing, error: existingError } = await db
    .from("player_contacts")
    .select("player_id, phone")
    .returns<RosterContact[]>();
  if (existingError) throw new Error(existingError.message);

  const stale = staleContactIds(existing ?? [], contacts);
  if (stale.length > 0) {
    const { error } = await db.from("player_contacts").delete().in("player_id", stale);
    if (error) throw new Error(error.message);

    // Consent belongs to the number that sent START: a changed or removed
    // phone must opt in again, and its pending draft must not be confirmable
    // from the new number. An earlier STOP (opted_out_at) stays, so its
    // 7-day deletion still runs (CLAUDE.md, "Consent / opt-in").
    const { error: consentError } = await db
      .from("whatsapp_consents")
      .update({ opted_in_at: null, consent_version: null, updated_at: now })
      .in("player_id", stale);
    if (consentError) throw new Error(consentError.message);
    const { error: draftError } = await db.from("checkin_drafts").delete().in("player_id", stale);
    if (draftError) throw new Error(draftError.message);
  }

  if (contacts.length > 0) {
    const { error } = await db
      .from("player_contacts")
      .upsert(contacts.map((c) => ({ ...c, updated_at: now })));
    if (error) throw new Error(error.message);
  }
}
