// Pure helpers behind the Attendance screens — no API or DB access.
import { columnLetter } from "@/lib/sheet-cells";

/** true = present, false = absent, null = unmarked (blank cell, not counted). */
export type MarkState = boolean | null;
export type MarkChange = { player_id: string; present: MarkState };

/** Players whose mark differs from what was loaded — only these are written. */
export function markChanges(
  initial: Record<string, MarkState>,
  current: Record<string, MarkState>,
): MarkChange[] {
  return Object.keys(current)
    .filter((id) => (initial[id] ?? null) !== current[id])
    .map((id) => ({ player_id: id, present: current[id] }));
}

export function unmarkedCount(marks: Record<string, MarkState>): number {
  return Object.values(marks).filter((m) => m === null).length;
}

/** Marks every unmarked player present; existing absences stay. */
export function markRestPresent(marks: Record<string, MarkState>): Record<string, MarkState> {
  return Object.fromEntries(Object.entries(marks).map(([id, m]) => [id, m ?? true]));
}

/** Tapping the selected option clears it; tapping the other one switches. */
export function toggleMark(current: MarkState, tapped: boolean): MarkState {
  return current === tapped ? null : tapped;
}

export type CellWrite = { range: string; values: [[boolean | ""]] };

/**
 * A1 cell writes for the changed marks. Players without a row in the
 * Attendance tab can't be written and are returned as `missing`.
 */
export function markWrites(
  tab: string,
  columnIndex: number,
  rows: Map<string, number>,
  changes: MarkChange[],
): { writes: CellWrite[]; missing: string[] } {
  const col = columnLetter(columnIndex);
  const writes: CellWrite[] = [];
  const missing: string[] = [];
  for (const c of changes) {
    const row = rows.get(c.player_id);
    if (row === undefined) missing.push(c.player_id);
    else writes.push({ range: `'${tab}'!${col}${row}`, values: [[c.present ?? ""]] });
  }
  return { writes, missing };
}

export type SessionCounts = { present: number; absent: number };

/** "5 present · 2 absent", or "Not taken yet" when nobody is marked. */
export function sessionCountsText({ present, absent }: SessionCounts): string {
  if (present === 0 && absent === 0) return "Not taken yet";
  return `${present} present · ${absent} absent`;
}

export function countBySession(marks: { session_id: string; present: boolean }[]): Map<string, SessionCounts> {
  const counts = new Map<string, SessionCounts>();
  for (const m of marks) {
    const c = counts.get(m.session_id) ?? { present: 0, absent: 0 };
    if (m.present) c.present++;
    else c.absent++;
    counts.set(m.session_id, c);
  }
  return counts;
}

type Dated = { id: string; session_date: string };

/**
 * Splits sessions around `today` ("YYYY-MM-DD"): today's (an extra session
 * can share the date), past newest first, upcoming soonest first. Same-date
 * sessions keep a stable order by id.
 */
export function splitSessions<T extends Dated>(sessions: T[], today: string) {
  const asc = [...sessions].sort(
    (a, b) => a.session_date.localeCompare(b.session_date) || a.id.localeCompare(b.id),
  );
  return {
    today: asc.filter((s) => s.session_date === today),
    upcoming: asc.filter((s) => s.session_date > today),
    past: asc.filter((s) => s.session_date < today).reverse(),
  };
}
