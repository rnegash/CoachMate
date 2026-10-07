import "server-only";
import {
  ATTENDANCE_TAB,
  attendanceIdColumn,
  findSessionColumns,
  playerRows,
} from "@/lib/attendance-sheet";
import { attendanceSpreadsheetId } from "@/lib/attendance-sync";
import { PLAYER_ID_FORMAT } from "@/lib/roster-sheet";
import { readColumns, readHeaderRow, sheetsClient, writeCells } from "@/lib/sheets";
import { markWrites, type MarkChange } from "@/lib/take-attendance";

// Attendance write-back (slice 5). The app never creates Sheet columns or
// rows: sessions come from the Sheet's columns via the sync, and a player
// needs their row in the Attendance tab.
// Positions are looked up live on every call, never from the synced copy.

type Api = ReturnType<typeof sheetsClient>;

async function readLayout(api: Api, spreadsheetId: string) {
  const header = await readHeaderRow(api, spreadsheetId, ATTENDANCE_TAB, "UNFORMATTED_VALUE");
  const idCol = attendanceIdColumn(header);
  if (idCol < 0) throw new Error(`The "${ATTENDANCE_TAB}" tab has no "player_id" column.`);
  return { idCol, sessions: findSessionColumns(header, idCol).sessions };
}

/** Writes the changed marks into the session's column. The caller syncs afterwards. */
export async function saveMarks(id: string, changes: MarkChange[]) {
  for (const c of changes) {
    if (!PLAYER_ID_FORMAT.test(c.player_id) || ![true, false, null].includes(c.present)) {
      throw new Error("Invalid attendance data.");
    }
  }

  const spreadsheetId = attendanceSpreadsheetId();
  const api = sheetsClient("write");
  const { idCol, sessions } = await readLayout(api, spreadsheetId);
  const session = sessions.find((s) => s.id === id);
  if (!session) {
    throw new Error(`This session's column is no longer in the ${ATTENDANCE_TAB} Sheet. Nothing was saved.`);
  }
  const { columns } = await readColumns(api, spreadsheetId, ATTENDANCE_TAB, [idCol]);
  const { writes, missing } = markWrites(
    ATTENDANCE_TAB,
    session.index,
    playerRows(columns.get(idCol) ?? []),
    changes,
  );

  await writeCells(api, spreadsheetId, writes);
  return { saved: writes.length, missing };
}
