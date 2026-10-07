// Pure helpers over attendance marks — no DB access, safe to unit-test and
// to import from client components.
import { formatSessionDate } from "@/lib/format";

export type AttendanceMark = {
  session_id: string;
  session_date: string;
  label: string | null;
  present: boolean;
};

// Oldest first; sessions on the same date keep a stable order by id.
export function compareMarksByDate(a: AttendanceMark, b: AttendanceMark) {
  return a.session_date.localeCompare(b.session_date) || a.session_id.localeCompare(b.session_id);
}

/**
 * Neutral, factual count over the last `window` counted sessions, e.g.
 * "Absent 2 of last 6 counted sessions" or, with `count: "present"`,
 * "Present at 4 of last 6 counted sessions". Not-counted sessions are
 * skipped, not treated as absences. Returns null when nothing is counted yet.
 */
export function attendanceSummary(
  marks: AttendanceMark[],
  window: number,
  count: "absent" | "present" = "absent",
): string | null {
  const recent = marks.slice(-window);
  const n = recent.length;
  if (n === 0) return null;
  const present = recent.filter((m) => m.present).length;
  if (n === 1) return present ? "Present at the last counted session" : "Absent at the last counted session";
  if (present === n) return `Present at all of the last ${n} counted sessions`;
  if (count === "present") return `Present at ${present} of last ${n} counted sessions`;
  return `Absent ${n - present} of last ${n} counted sessions`;
}

// "Tue 7 Oct" or "Tue 7 Oct · Extra skills session"
export function sessionLabel(mark: Pick<AttendanceMark, "session_date" | "label">): string {
  return [formatSessionDate(mark.session_date), mark.label].filter(Boolean).join(" · ");
}
