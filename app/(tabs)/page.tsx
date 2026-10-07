import { connection } from "next/server";
import { AppHeader } from "@/components/AppHeader";
import { BriefingList } from "@/components/BriefingList";
import { SyncPanel } from "@/components/SyncPanel";
import { getRecentAttendanceByPlayer } from "@/lib/attendance";
import { briefingRows, olderSync } from "@/lib/briefing";
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

  const lastSynced = olderSync(rosterSync, attendanceSync);
  const rows = briefingRows(players, attendance, BRIEFING_WINDOW);

  return (
    <>
      <AppHeader title="Briefing" subtitle={weekLabel(new Date())} />
      <SyncPanel lastSynced={lastSynced ? formatDateTime(lastSynced) : null} />
      <BriefingList players={rows} />
    </>
  );
}
