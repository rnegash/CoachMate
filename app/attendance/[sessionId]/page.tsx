import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { TakeAttendanceForm } from "@/components/TakeAttendanceForm";
import { getSession, getSessionMarks } from "@/lib/attendance";
import { formatSessionDate } from "@/lib/format";
import { listRosterPlayers } from "@/lib/players";

// Session ids contain spaces (extra-session labels); tolerate a stray "%".
function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export default async function TakeAttendancePage({ params }: PageProps<"/attendance/[sessionId]">) {
  const id = safeDecode((await params).sessionId);
  const [session, players, marks] = await Promise.all([getSession(id), listRosterPlayers(), getSessionMarks(id)]);
  if (!session) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-space-4 px-space-4 pt-space-6">
      <AppHeader
        back={{ href: "/attendance", label: "Back to Attendance" }}
        title={formatSessionDate(session.session_date)}
        subtitle={session.label ?? undefined}
      />
      {players.length === 0 ? (
        <EmptyState headline="No players yet" support="Sync the roster from Google Sheets to take attendance." />
      ) : (
        <TakeAttendanceForm
          key={id}
          sessionId={id}
          players={players}
          initial={Object.fromEntries(players.map((p) => [p.id, marks.get(p.id) ?? null]))}
        />
      )}
    </main>
  );
}
