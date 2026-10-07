import "server-only";
import { compareMarksByDate, type AttendanceMark } from "@/lib/attendance-marks";
import { supabaseAdmin } from "@/lib/supabase";

type MarkRow = {
  player_id: string;
  present: boolean;
  attendance_sessions: { id: string; session_date: string; label: string | null };
};

function toMark(row: MarkRow): AttendanceMark {
  return {
    session_id: row.attendance_sessions.id,
    session_date: row.attendance_sessions.session_date,
    label: row.attendance_sessions.label,
    present: row.present,
  };
}

const MARK_SELECT = "player_id, present, attendance_sessions!inner(id, session_date, label)";

/** Every counted session (present/absent) for one player, oldest first. */
export async function getPlayerAttendance(playerId: string): Promise<AttendanceMark[]> {
  const { data, error } = await supabaseAdmin()
    .from("attendance_marks")
    .select(MARK_SELECT)
    .eq("player_id", playerId)
    .returns<MarkRow[]>();
  if (error) throw new Error(error.message);
  return data.map(toMark).sort(compareMarksByDate);
}

/**
 * Counted marks per player across the team's most recent sessions, oldest
 * first. Bounded to recent sessions to keep the Briefing query small.
 */
export async function getRecentAttendanceByPlayer(
  sessionLimit = 16,
): Promise<Map<string, AttendanceMark[]>> {
  const db = supabaseAdmin();
  const { data: sessions, error: sessionsError } = await db
    .from("attendance_sessions")
    .select("id")
    .order("session_date", { ascending: false })
    .limit(sessionLimit);
  if (sessionsError) throw new Error(sessionsError.message);

  const byPlayer = new Map<string, AttendanceMark[]>();
  if (sessions.length === 0) return byPlayer;

  const { data, error } = await db
    .from("attendance_marks")
    .select(MARK_SELECT)
    .in("session_id", sessions.map((s) => s.id))
    .returns<MarkRow[]>();
  if (error) throw new Error(error.message);

  for (const row of data) {
    const list = byPlayer.get(row.player_id) ?? [];
    list.push(toMark(row));
    byPlayer.set(row.player_id, list);
  }
  for (const list of byPlayer.values()) list.sort(compareMarksByDate);
  return byPlayer;
}

