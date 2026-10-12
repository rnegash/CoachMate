import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AttendanceStrip } from "@/components/AttendanceStrip";
import { GoalList } from "@/components/GoalList";
import { getPlayerAttendance } from "@/lib/attendance";
import { attendanceSummary, sessionLabel } from "@/lib/attendance-marks";
import { whatsappStatusLine } from "@/lib/checkin-display";
import { listPlayerCheckins, whatsappStatus } from "@/lib/checkins";
import { formatDate } from "@/lib/format";
import { listPlayerGoals } from "@/lib/goals";
import { getPlayer } from "@/lib/players";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-space-2 rounded-lg border border-border bg-surface-raised p-space-4">
      <h2 className="text-title">{title}</h2>
      {children}
    </section>
  );
}

const STRIP_WINDOW = 8;

export default async function PlayerDetailPage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const [player, attendance, goals, checkins, whatsapp] = await Promise.all([
    getPlayer(id),
    getPlayerAttendance(id),
    listPlayerGoals(id),
    listPlayerCheckins(id),
    whatsappStatus(id),
  ]);
  if (!player) notFound();

  const recent = attendance.slice(-STRIP_WINDOW);
  const headline = attendanceSummary(recent, STRIP_WINDOW);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-space-6 px-space-4 py-space-6">
      <AppHeader
        back={{ href: "/", label: "Back to Briefing" }}
        title={player.name}
        subtitle={player.jersey_number ? `#${player.jersey_number}` : undefined}
      />
      {player.removed_at && (
        <p className="rounded-lg bg-surface-sunken p-space-4 text-body text-ink-muted">
          Not on the current roster since {formatDate(player.removed_at)}.
        </p>
      )}
      <Section title="Attendance">
        {headline ? (
          <AttendanceStrip
            headline={headline}
            marks={recent.map((m) => ({
              key: m.session_id,
              present: m.present,
              label: sessionLabel(m),
            }))}
          />
        ) : (
          <p className="text-body text-ink-muted">No counted sessions yet.</p>
        )}
      </Section>
      <Section title="Goals">
        <p className="text-label font-normal text-ink-muted">{whatsappStatusLine(whatsapp)}</p>
        <GoalList
          playerId={player.id}
          active={goals.active}
          completed={goals.completed}
          checkins={checkins}
        />
      </Section>
    </main>
  );
}
