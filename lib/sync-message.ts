// Status text for the Sync button — pure formatting over sync results.
import type { AttendanceSyncResult } from "@/lib/attendance-sync";
import type { RosterSyncResult } from "@/lib/roster-sync";

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function rosterSyncMessage(r: RosterSyncResult): string[] {
  const parts = [`Roster: ${plural(r.synced, "player")}.`];
  if (r.removed > 0) parts.push(`${r.removed} no longer in the Sheet.`);
  if (r.skipped.length > 0) {
    parts.push(`Skipped ${r.skipped.map((s) => `row ${s.row} (${s.reason})`).join(", ")}.`);
  }
  return parts;
}

export function attendanceSyncMessage(a: AttendanceSyncResult): string[] {
  const parts = [`Attendance: ${plural(a.sessions, "session")}, ${plural(a.marks, "mark")}.`];
  if (a.skipped.length > 0) parts.push(`Skipped ${a.skipped.join(", ")}.`);
  return parts;
}
