// Pure helpers behind the Briefing screen — no DB access.
import type { Signal } from "@/components/PlayerBriefingRow";
import { attendanceSummary, type AttendanceMark } from "@/lib/attendance-marks";
import type { PlayerSummary } from "@/lib/players";

export type BriefingPlayer = PlayerSummary & { signals: Signal[] };

/** Case-insensitive substring match on name; a blank query keeps everyone. */
export function filterByName<T extends { name: string }>(players: T[], query: string): T[] {
  const q = query.trim().toLocaleLowerCase();
  return q ? players.filter((p) => p.name.toLocaleLowerCase().includes(q)) : players;
}

/** The older of two ISO timestamps, so a shown time never overstates freshness. Null if either is missing. */
export function olderSync(a: string | null, b: string | null): string | null {
  if (!a || !b) return null;
  return a < b ? a : b;
}

export function briefingRows(
  players: PlayerSummary[],
  attendance: Map<string, AttendanceMark[]>,
  window: number,
): BriefingPlayer[] {
  return players.map((p) => {
    const summary = attendanceSummary(attendance.get(p.id) ?? [], window, "present");
    return { ...p, signals: summary ? [{ text: summary }] : [] };
  });
}
