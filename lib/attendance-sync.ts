import "server-only";
import { goneSessionIds, staleMarksBySession } from "@/lib/attendance-diff";
import {
  acceptAttendanceRows,
  ATTENDANCE_ID_HEADER,
  attendanceIdColumn,
  findSessionColumns,
  parseAttendanceRows,
} from "@/lib/attendance-sheet";
import { readColumns, readHeaderRow, sheetsClient } from "@/lib/sheets";
import { supabaseAdmin } from "@/lib/supabase";

const ATTENDANCE_TAB = "Attendance";

export type AttendanceSyncResult = {
  sessions: number;
  marks: number;
  skipped: string[];
};

async function readAttendanceSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ATTENDANCE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ATTENDANCE_SPREADSHEET_ID");
  const api = sheetsClient();

  const header = await readHeaderRow(api, spreadsheetId, ATTENDANCE_TAB, "UNFORMATTED_VALUE");
  const idCol = attendanceIdColumn(header);
  if (idCol < 0) {
    throw new Error(`The "${ATTENDANCE_TAB}" tab needs a "${ATTENDANCE_ID_HEADER}" header column in row 1.`);
  }

  const { sessions, skipped: headerSkipped } = findSessionColumns(header, idCol);

  // Only the player_id column and session columns are fetched.
  const { columns, rowCount } = await readColumns(
    api,
    spreadsheetId,
    ATTENDANCE_TAB,
    [idCol, ...sessions.map((s) => s.index)],
    "UNFORMATTED_VALUE",
  );

  const { rows, skipped: rowSkipped } = parseAttendanceRows(columns, rowCount, idCol, sessions);

  return {
    sessions: sessions.map(({ id, session_date, label, sheet_column }) => ({
      id,
      session_date,
      label,
      sheet_column,
    })),
    rows,
    skipped: [...headerSkipped, ...rowSkipped],
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

  const accepted = acceptAttendanceRows(rows, known);
  const { marks, players: seenPlayers } = accepted;
  skipped.push(...accepted.skipped);

  // Sessions: upsert what's in the Sheet, drop columns that no longer exist
  // (their marks cascade).
  if (sessions.length > 0) {
    const { error } = await db.from("attendance_sessions").upsert(sessions);
    if (error) throw new Error(error.message);
  }
  const goneSessions = goneSessionIds(
    (existingSessions ?? []).map((s) => s.id as string),
    sessions,
  );
  if (goneSessions.length > 0) {
    const { error } = await db.from("attendance_sessions").delete().in("id", goneSessions);
    if (error) throw new Error(error.message);
  }

  // Marks: upsert current ones, delete marks whose cell is now blank.
  if (marks.length > 0) {
    const { error } = await db.from("attendance_marks").upsert(marks);
    if (error) throw new Error(error.message);
  }
  const staleBySession = staleMarksBySession(await selectAllMarkKeys(), marks);
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
