import { connection } from "next/server";
import { AppHeader } from "@/components/AppHeader";
import { BriefingList, type BriefingPlayer } from "@/components/BriefingList";
import { SyncPanel } from "@/components/SyncPanel";
import { attendanceSummary, getRecentAttendanceByPlayer } from "@/lib/attendance";
import { formatDateTime, weekLabel } from "@/lib/format";
import { lastSyncAt, listRosterPlayers } from "@/lib/players";

const BRIEFING_WINDOW = 4;

export default async function BriefingPage() {
  await connection();
  const [players, attendance, rosterSync, attendanceSync] = await Promise.all([
    listRosterPlayers(),
    getRecentAttendanceByPlayer(),
    lastSyncAt("roster"),
    lastSyncAt("attendance"),
  ]);

  // Show the older of the two, so the time never overstates freshness.
  const lastSynced =
    rosterSync && attendanceSync ? (rosterSync < attendanceSync ? rosterSync : attendanceSync) : null;

  const rows: BriefingPlayer[] = players.map((p) => {
    const summary = attendanceSummary(attendance.get(p.id) ?? [], BRIEFING_WINDOW, "present");
    return { ...p, signals: summary ? [{ text: summary }] : [] };
  });

  return (
    <>
      <AppHeader title="Briefing" subtitle={weekLabel(new Date())} />
      <SyncPanel lastSynced={lastSynced ? formatDateTime(lastSynced) : null} />
      <BriefingList players={rows} />
    </>
  );
}
