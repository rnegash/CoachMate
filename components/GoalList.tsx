import Link from "next/link";
import { completeGoalAction } from "@/app/actions/goals";
import { Button } from "@/components/Button";
import { CheckinList } from "@/components/CheckinList";
import { formatDate } from "@/lib/format";
import type { Goal } from "@/lib/goals";

type Checkin = { id: string; text: string; created_at: string };

type Props = {
  playerId: string;
  active: Goal[];
  completed: Goal[];
  /** Shared check-ins per goal ID, newest first. */
  checkins: Map<string, Checkin[]>;
};

export function GoalList({ playerId, active, completed, checkins }: Props) {
  return (
    <div className="flex flex-col gap-space-3">
      {active.length === 0 ? (
        <p className="text-body text-ink-muted">No active goals.</p>
      ) : (
        <ul className="flex flex-col gap-space-2">
          {active.map((g) => (
            <li key={g.id} className="flex flex-col gap-space-2 rounded-lg border border-border bg-surface p-space-4">
              <p className="text-body font-semibold">{g.text}</p>
              <div className="flex items-center justify-between gap-space-3">
                <span className="text-caption text-ink-muted">Updated {formatDate(g.updated_at)}</span>
                <form action={completeGoalAction.bind(null, playerId, g.id)}>
                  <Button type="submit" className="min-h-control-sm px-space-3 text-label">
                    Mark completed
                  </Button>
                </form>
              </div>
              <CheckinList checkins={checkins.get(g.id) ?? []} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/players/${encodeURIComponent(playerId)}/goals/new`}
        className="inline-flex min-h-control-md items-center justify-center rounded-md bg-accent px-space-4 text-title text-on-accent hover:bg-accent-hover"
      >
        Add goal
      </Link>

      {completed.length > 0 && (
        <details className="group">
          <summary className="min-h-control-sm cursor-pointer py-space-2 text-label text-ink-muted">
            Completed goals ({completed.length})
          </summary>
          <ul className="flex flex-col gap-space-2">
            {completed.map((g) => (
              <li key={g.id} className="flex flex-col gap-space-1 rounded-lg border border-border p-space-3">
                <p className="text-body">{g.text}</p>
                <span className="text-caption text-ink-muted">
                  Completed {g.completed_at ? formatDate(g.completed_at) : ""}
                </span>
                <CheckinList checkins={checkins.get(g.id) ?? []} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Art. 50: static footnote instead of per-goal labels (CLAUDE.md). */}
      <p className="text-caption text-ink-muted">Goals may have been written with the help of AI.</p>
    </div>
  );
}
