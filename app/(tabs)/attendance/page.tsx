import { connection } from "next/server";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { SessionRow } from "@/components/SessionRow";
import { SyncPanel } from "@/components/SyncPanel";
import { listSessions, type SessionSummary } from "@/lib/attendance";
import { olderSync } from "@/lib/briefing";
import { formatDateTime, formatSessionDate, localIsoDate } from "@/lib/format";
import { lastSyncAt } from "@/lib/players";
import { sessionCountsText, splitSessions } from "@/lib/take-attendance";

function SessionGroup({ title, sessions, today }: { title: string; sessions: SessionSummary[]; today?: boolean }) {
  if (sessions.length === 0) return null;
  return (
    <section className="flex flex-col gap-space-2" aria-label={title}>
      <h2 className="text-label text-ink-muted">{title}</h2>
      <ul className="flex flex-col gap-space-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <SessionRow
              href={`/attendance/${encodeURIComponent(s.id)}`}
              title={formatSessionDate(s.session_date)}
              tag={s.label}
              meta={sessionCountsText(s.counts)}
              today={today}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function AttendancePage() {
  await connection();
  const todayDate = localIsoDate(new Date());
  const [sessions, rosterSync, attendanceSync] = await Promise.all([
    listSessions(todayDate),
    lastSyncAt("roster"),
    lastSyncAt("attendance"),
  ]);
  const { today, upcoming, past } = splitSessions(sessions, todayDate);
  const lastSynced = olderSync(rosterSync, attendanceSync);

  return (
    <>
      <AppHeader title="Attendance" />
      <SyncPanel lastSynced={lastSynced ? formatDateTime(lastSynced) : null} />
      <p className="text-caption text-ink-muted">
        Sessions are the date columns in the Attendance Sheet. For an extra session, add its column there, then
        sync.
      </p>
      {sessions.length === 0 ? (
        <EmptyState
          headline="No sessions yet"
          support="Add a date column per session to the Attendance Sheet, then sync."
        />
      ) : (
        <>
          <SessionGroup title="Today" sessions={today} today />
          <SessionGroup title="Upcoming" sessions={upcoming} />
          <SessionGroup title="Past" sessions={past} />
        </>
      )}
    </>
  );
}
