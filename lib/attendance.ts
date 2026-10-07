import "server-only";
import { compareMarksByDate, type AttendanceMark } from "@/lib/attendance-marks";
import { supabaseAdmin } from "@/lib/supabase";
import { countBySession, type SessionCounts } from "@/lib/take-attendance";

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


export type SessionSummary = {
  id: string;
  session_date: string;
  label: string | null;
  counts: SessionCounts;
};

/**
 * The most recent sessions up to and including `today` ("YYYY-MM-DD") plus
 * the next few planned ones, with mark counts. Order is up to the caller.
 */
export async function listSessions(today: string, pastLimit = 20, upcomingLimit = 5): Promise<SessionSummary[]> {
  const db = supabaseAdmin();
  const columns = "id, session_date, label";
  const [past, upcoming] = await Promise.all([
    db.from("attendance_sessions").select(columns).lte("session_date", today)
      .order("session_date", { ascending: false }).limit(pastLimit),
    db.from("attendance_sessions").select(columns).gt("session_date", today)
      .order("session_date", { ascending: true }).limit(upcomingLimit),
  ]);
  if (past.error) throw new Error(past.error.message);
  if (upcoming.error) throw new Error(upcoming.error.message);
  const sessions = [...past.data, ...upcoming.data];
  if (sessions.length === 0) return [];

  // ~40 players x 25 sessions stays around PostgREST's 1000-row cap.
  const { data: marks, error: marksError } = await db
    .from("attendance_marks")
    .select("session_id, present")
    .in("session_id", sessions.map((s) => s.id));
  if (marksError) throw new Error(marksError.message);

  const counts = countBySession(marks);
  return sessions.map((s) => ({ ...s, counts: counts.get(s.id) ?? { present: 0, absent: 0 } }));
}

export async function getSession(id: string) {
  const { data, error } = await supabaseAdmin()
    .from("attendance_sessions")
    .select("id, session_date, label")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; session_date: string; label: string | null } | null;
}

/** player_id -> present/absent for one session; unmarked players are absent from the map. */
export async function getSessionMarks(sessionId: string): Promise<Map<string, boolean>> {
  const { data, error } = await supabaseAdmin()
    .from("attendance_marks")
    .select("player_id, present")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return new Map(data.map((m) => [m.player_id as string, m.present as boolean]));
}
