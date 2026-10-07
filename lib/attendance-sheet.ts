// Pure parsing of the Attendance tab — no API or DB access.
import { PLAYER_ID_FORMAT } from "@/lib/roster-sheet";
import { columnLetter, type CellValue, type Columns } from "@/lib/sheet-cells";

export const ATTENDANCE_TAB = "Attendance";
export const ATTENDANCE_ID_HEADER = "player_id";

export type Session = { id: string; session_date: string; label: string | null; sheet_column: string };
export type SessionColumn = Session & { index: number };
export type Mark = { player_id: string; session_id: string; present: boolean };
export type AttendanceRow = { sheetRow: number; playerId: string; marks: Mark[] };

// Google Sheets date serial number -> "YYYY-MM-DD" (day 0 = 1899-12-30).
export function serialToIsoDate(serial: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Collapses whitespace in an extra-session label; blank means no label. */
export function normalizeLabel(label: string | null | undefined): string | null {
  const l = label?.trim().replace(/\s+/g, " ");
  return l ? l : null;
}

/** Session id as stored: "2026-10-07" or "2026-10-07 Extra skills session". */
export function sessionId(session_date: string, label: string | null): string {
  return label ? `${session_date} ${label}` : session_date;
}

// A session column header is a date, optionally followed by a label:
// "2026-10-07" (typed or as a date cell) or "2026-10-07 Extra skills session".
// Anything else (player_id, name, notes…) is not a session column.
export function parseSessionHeader(value: CellValue) {
  if (typeof value === "number") return { session_date: serialToIsoDate(value), label: null };
  const m = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s+(.+))?$/);
  if (!m || Number.isNaN(Date.parse(m[1]))) return null;
  return { session_date: m[1], label: normalizeLabel(m[2]) };
}

// Read unformatted so checkboxes / TRUE / FALSE arrive as booleans,
// regardless of the Sheet's locale (a Swedish Sheet displays SANT/FALSKT).
export function parseMark(value: CellValue | undefined): boolean | null | "invalid" {
  if (value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toUpperCase();
  if (s === "") return null;
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;
  return "invalid";
}

/** Index of the player_id column in row 1 (case-insensitive), or -1. */
export function attendanceIdColumn(header: CellValue[]): number {
  return header.findIndex((h) => String(h).trim().toLowerCase() === ATTENDANCE_ID_HEADER);
}

/** Session columns from row 1, left to right; repeated sessions are skipped. */
export function findSessionColumns(header: CellValue[], idCol: number) {
  const skipped: string[] = [];
  const sessions: SessionColumn[] = [];
  const seen = new Set<string>();
  header.forEach((h, index) => {
    if (index === idCol) return;
    const parsed = parseSessionHeader(h);
    if (!parsed) return;
    const id = sessionId(parsed.session_date, parsed.label);
    const sheet_column = columnLetter(index);
    if (seen.has(id)) {
      skipped.push(`column ${sheet_column} (duplicate session "${id}")`);
      return;
    }
    seen.add(id);
    sessions.push({ id, ...parsed, sheet_column, index });
  });
  return { sessions, skipped };
}

/** player_id -> Sheet row number (first occurrence wins, like the sync). */
export function playerRows(idCells: CellValue[]): Map<string, number> {
  const rows = new Map<string, number>();
  idCells.forEach((cell, r) => {
    const id = String(cell ?? "").trim();
    if (id && !rows.has(id)) rows.set(id, r + 2);
  });
  return rows;
}

/** One row per player_id with its counted marks; blank cells are not counted. */
export function parseAttendanceRows(
  columns: Columns,
  rowCount: number,
  idCol: number,
  sessions: SessionColumn[],
) {
  const skipped: string[] = [];
  const rows: AttendanceRow[] = [];
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
      if (marks.length > 0) skipped.push(`row ${sheetRow} (missing ${ATTENDANCE_ID_HEADER})`);
      continue;
    }
    rows.push({ sheetRow, playerId, marks });
  }
  return { rows, skipped };
}

/** Keeps rows whose player_id is well-formed, on the roster, and not repeated. */
export function acceptAttendanceRows(rows: AttendanceRow[], rosterIds: Set<string>) {
  const marks: Mark[] = [];
  const skipped: string[] = [];
  const players = new Set<string>();
  for (const row of rows) {
    if (!PLAYER_ID_FORMAT.test(row.playerId)) {
      skipped.push(`row ${row.sheetRow} (${ATTENDANCE_ID_HEADER} must look like P001)`);
    } else if (!rosterIds.has(row.playerId)) {
      skipped.push(`row ${row.sheetRow} (${ATTENDANCE_ID_HEADER} not in the roster)`);
    } else if (players.has(row.playerId)) {
      skipped.push(`row ${row.sheetRow} (duplicate ${ATTENDANCE_ID_HEADER})`);
    } else {
      players.add(row.playerId);
      marks.push(...row.marks);
    }
  }
  return { marks, skipped, players };
}
