"use server";

import { revalidatePath } from "next/cache";
import { syncAttendance } from "@/lib/attendance-sync";
import { saveMarks } from "@/lib/attendance-write";
import type { MarkChange } from "@/lib/take-attendance";

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export type SaveState = {
  ok: boolean;
  /** Whether the changes reached the Sheet (even if the app's refresh failed). */
  written: boolean;
  message: string;
  /** player_ids that have no row in the Attendance tab, so weren't saved. */
  missing: string[];
} | null;

export async function saveMarksAction(sessionId: string, changes: MarkChange[]): Promise<SaveState> {
  let result: Awaited<ReturnType<typeof saveMarks>>;
  try {
    result = await saveMarks(sessionId, changes);
  } catch (e) {
    return { ok: false, written: false, message: errorMessage(e, "Saving failed. Nothing was changed."), missing: [] };
  }

  // The Sheet is already updated at this point; only the app's copy may lag.
  try {
    await syncAttendance();
  } catch (e) {
    return {
      ok: false,
      written: true,
      message: `Saved to the Sheet, but refreshing the app failed: ${errorMessage(e, "sync error")} Use Sync now on the Briefing.`,
      missing: result.missing,
    };
  }
  revalidatePath("/", "layout");
  return {
    ok: result.missing.length === 0,
    written: true,
    message: result.saved === 1 ? "Saved 1 change." : `Saved ${result.saved} changes.`,
    missing: result.missing,
  };
}
