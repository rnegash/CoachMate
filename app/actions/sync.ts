"use server";

import { revalidatePath } from "next/cache";
import { syncAttendance } from "@/lib/attendance-sync";
import { syncRoster } from "@/lib/roster-sync";
import { attendanceSyncMessage, rosterSyncMessage } from "@/lib/sync-message";

export type SyncState = { ok: boolean; message: string } | null;

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Sync failed.");

// Roster first: attendance rows are only accepted for players on the roster.
export async function syncSheetsAction(): Promise<SyncState> {
  const parts: string[] = [];
  try {
    parts.push(...rosterSyncMessage(await syncRoster()));
  } catch (e) {
    return { ok: false, message: `Roster sync failed: ${errorMessage(e)}` };
  }

  try {
    parts.push(...attendanceSyncMessage(await syncAttendance()));
  } catch (e) {
    revalidatePath("/", "layout");
    return { ok: false, message: `${parts.join(" ")} Attendance sync failed: ${errorMessage(e)}` };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: parts.join(" ") };
}
