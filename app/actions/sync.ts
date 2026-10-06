"use server";

import { revalidatePath } from "next/cache";
import { syncAttendance } from "@/lib/attendance-sync";
import { syncRoster } from "@/lib/roster-sync";

export type SyncState = { ok: boolean; message: string } | null;

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Sync failed.");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Roster first: attendance rows are only accepted for players on the roster.
export async function syncSheetsAction(): Promise<SyncState> {
  const parts: string[] = [];
  try {
    const roster = await syncRoster();
    parts.push(`Roster: ${plural(roster.synced, "player")}.`);
    if (roster.removed > 0) parts.push(`${roster.removed} no longer in the Sheet.`);
    if (roster.skipped.length > 0) {
      parts.push(`Skipped ${roster.skipped.map((s) => `row ${s.row} (${s.reason})`).join(", ")}.`);
    }
  } catch (e) {
    return { ok: false, message: `Roster sync failed: ${errorMessage(e)}` };
  }

  try {
    const att = await syncAttendance();
    parts.push(`Attendance: ${plural(att.sessions, "session")}, ${plural(att.marks, "mark")}.`);
    if (att.skipped.length > 0) parts.push(`Skipped ${att.skipped.join(", ")}.`);
  } catch (e) {
    revalidatePath("/", "layout");
    return { ok: false, message: `${parts.join(" ")} Attendance sync failed: ${errorMessage(e)}` };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: parts.join(" ") };
}
