import "server-only";
import { PLAYER_ID_FORMAT } from "@/lib/roster-sync";
import { columnLetter, readColumns, readHeaderRow, sheetsClient } from "@/lib/sheets";
import { supabaseAdmin } from "@/lib/supabase";

const ATTENDANCE_TAB = "Attendance";
const ID_HEADER = "player_id";

export type AttendanceSyncResult = {
  sessions: number;
  marks: number;
  skipped: string[];
};

type Session = { id: string; session_date: string; label: string | null; sheet_column: string };
type Mark = { player_id: string; session_id: string; present: boolean };

// Google Sheets date serial number -> "YYYY-MM-DD" (day 0 = 1899-12-30).
function serialToIsoDate(serial: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// A session column header is a date, optionally followed by a label:
// "2026-10-07" (typed or as a date cell) or "2026-10-07 Extra skills session".
// Anything else (player_id, name, notes…) is not a session column.
function parseSessionHeader(value: string | number | boolean) {
  if (typeof value === "number") return { session_date: serialToIsoDate(value), label: null };
  const m = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s+(.+))?$/);
  if (!m || Number.isNaN(Date.parse(m[1]))) return null;
  return { session_date: m[1], label: m[2]?.replace(/\s+/g, " ") ?? null };
}

// Read unformatted so checkboxes / TRUE / FALSE arrive as booleans,
// regardless of the Sheet's locale (a Swedish Sheet displays SANT/FALSKT).
function parseMark(value: string | number | boolean | undefined): boolean | null | "invalid" {
  if (value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toUpperCase();
  if (s === "") return null;
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;
  return "invalid";
}

async function readAttendanceSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ATTENDANCE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ATTENDANCE_SPREADSHEET_ID");
  const api = sheetsClient();

  const header = await readHeaderRow(api, spreadsheetId, ATTENDANCE_TAB, "UNFORMATTED_VALUE");
  const idCol = header.findIndex((h) => String(h).trim().toLowerCase() === ID_HEADER);
  if (idCol < 0) {
    throw new Error(`The "${ATTENDANCE_TAB}" tab needs a "${ID_HEADER}" header column in row 1.`);
  }

  const skipped: string[] = [];
  const sessions: (Session & { index: number })[] = [];
  const seenSessions = new Set<string>();
  header.forEach((h, index) => {
    if (index === idCol) return;
    const parsed = parseSessionHeader(h);
    if (!parsed) return;
    const id = parsed.label ? `${parsed.session_date} ${parsed.label}` : parsed.session_date;
    const sheet_column = columnLetter(index);
    if (seenSessions.has(id)) {
      skipped.push(`column ${sheet_column} (duplicate session "${id}")`);
      return;
    }
    seenSessions.add(id);
    sessions.push({ id, ...parsed, sheet_column, index });
  });

  // Only the player_id column and session columns are fetched.
  const { columns, rowCount } = await readColumns(
    api,
    spreadsheetId,
    ATTENDANCE_TAB,
    [idCol, ...sessions.map((s) => s.index)],
    "UNFORMATTED_VALUE",
  );

  const rows: { sheetRow: number; playerId: string; marks: Mark[] }[] = [];
  for (let r = 0; r < rowCount; r++) {
    const sheetRow = r + 2;
    const playerId = String(columns.get(idCol)?.[r] ?? "").trim();
    const marks: Mark[] = [];
    for (const s of sessions) {
      const mark = parseMark(columns.get(s.index)?.[r]);
      if (mark === "invalid") {
        skipped.push(`cell ${s.sheet_column}${sheetRow} (not TRUE/FALSE, treated as not counted)`);
      } else if (mark !== null) {
        marks.push({ player_id: playerId, session_id: s.id, present: mark });
      }
    }
    if (!playerId) {
      if (marks.length > 0) skipped.push(`row ${sheetRow} (missing ${ID_HEADER})`);
      continue;
    }
    rows.push({ sheetRow, playerId, marks });
  }

  return {
    sessions: sessions.map(({ id, session_date, label, sheet_column }) => ({
      id,
      session_date,
      label,
      sheet_column,
    })),
    rows,
    skipped,
  };
}

// PostgREST caps a response at 1000 rows by default; a term of marks
// (~40 players x ~50 sessions) exceeds that, so page through.
async function selectAllMarkKeys() {
  const pageSize = 1000;
  const all: { player_id: string; session_id: string }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin()
      .from("attendance_marks")
      .select("player_id, session_id")
      .order("session_id")
      .order("player_id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < pageSize) return all;
  }
}

export async function syncAttendance(): Promise<AttendanceSyncResult> {
  const { sessions, rows, skipped } = await readAttendanceSheet();
  const db = supabaseAdmin();

  const { data: existingSessions, error: sessionsError } = await db
    .from("attendance_sessions")
    .select("id");
  if (sessionsError) throw new Error(sessionsError.message);
  // Guard: a misread tab must not wipe the synced history.
  if (sessions.length === 0 && (existingSessions ?? []).length > 0) {
    throw new Error(`No session columns found in the "${ATTENDANCE_TAB}" tab. Nothing was changed.`);
  }

  const { data: players, error: playersError } = await db.from("players").select("id");
  if (playersError) throw new Error(playersError.message);
  const known = new Set((players ?? []).map((p) => p.id as string));

  const marks: Mark[] = [];
  const seenPlayers = new Set<string>();
  for (const row of rows) {
    if (!PLAYER_ID_FORMAT.test(row.playerId)) {
      skipped.push(`row ${row.sheetRow} (${ID_HEADER} must look like P001)`);
    } else if (!known.has(row.playerId)) {
      skipped.push(`row ${row.sheetRow} (${ID_HEADER} not in the roster)`);
    } else if (seenPlayers.has(row.playerId)) {
      skipped.push(`row ${row.sheetRow} (duplicate ${ID_HEADER})`);
    } else {
      seenPlayers.add(row.playerId);
      marks.push(...row.marks);
    }
  }

  // Sessions: upsert what's in the Sheet, drop columns that no longer exist
  // (their marks cascade).
  if (sessions.length > 0) {
    const { error } = await db.from("attendance_sessions").upsert(sessions);
    if (error) throw new Error(error.message);
  }
  const inSheet = new Set(sessions.map((s) => s.id));
  const goneSessions = (existingSessions ?? [])
    .map((s) => s.id as string)
    .filter((id) => !inSheet.has(id));
  if (goneSessions.length > 0) {
    const { error } = await db.from("attendance_sessions").delete().in("id", goneSessions);
    if (error) throw new Error(error.message);
  }

  // Marks: upsert current ones, delete marks whose cell is now blank.
  if (marks.length > 0) {
    const { error } = await db.from("attendance_marks").upsert(marks);
    if (error) throw new Error(error.message);
  }
  const existingMarks = await selectAllMarkKeys();
  const current = new Set(marks.map((m) => `${m.player_id}|${m.session_id}`));
  const staleBySession = new Map<string, string[]>();
  for (const m of existingMarks) {
    if (current.has(`${m.player_id}|${m.session_id}`)) continue;
    const list = staleBySession.get(m.session_id) ?? [];
    list.push(m.player_id);
    staleBySession.set(m.session_id, list);
  }
  for (const [sessionId, playerIds] of staleBySession) {
    const { error } = await db
      .from("attendance_marks")
      .delete()
      .eq("session_id", sessionId)
      .in("player_id", playerIds);
    if (error) throw new Error(error.message);
  }

  const { error: logError } = await db.from("sheet_syncs").insert({
    source: "attendance",
    rows_synced: seenPlayers.size,
    rows_skipped: skipped.length,
  });
  if (logError) throw new Error(logError.message);

  return { sessions: sessions.length, marks: marks.length, skipped };
}
