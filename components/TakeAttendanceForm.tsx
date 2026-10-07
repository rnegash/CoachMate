"use client";

import { useEffect, useState, useTransition } from "react";
import { saveMarksAction, type SaveState } from "@/app/actions/attendance";
import { AttendanceToggle } from "@/components/AttendanceToggle";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { SearchField } from "@/components/SearchField";
import { filterByName } from "@/lib/briefing";
import type { PlayerSummary } from "@/lib/players";
import {
  markChanges,
  markRestPresent,
  toggleMark,
  unmarkedCount,
  type MarkState,
} from "@/lib/take-attendance";

type Props = {
  sessionId: string;
  players: PlayerSummary[];
  /** Saved marks per player_id; null = unmarked. */
  initial: Record<string, MarkState>;
};

export function TakeAttendanceForm({ sessionId, players, initial }: Props) {
  const [saved, setSaved] = useState(initial);
  const [marks, setMarks] = useState(initial);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SaveState>(null);
  const [pending, startTransition] = useTransition();

  const changes = markChanges(saved, marks);
  const unmarked = unmarkedCount(marks);
  const visible = filterByName(players, query);
  const nameOf = new Map(players.map((p) => [p.id, p.name]));

  // Progress mustn't be lost silently if the page is left mid-training.
  const dirty = changes.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    // In-app links (e.g. the back arrow) navigate client-side, which
    // beforeunload doesn't see. Capture phase runs before next/link.
    const guardLinks = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("a[href]")) return;
      if (!window.confirm("Leave without saving? The marks you changed aren't saved yet.")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLinks, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLinks, true);
    };
  }, [dirty]);

  function save() {
    const submitted = marks;
    startTransition(async () => {
      const res = await saveMarksAction(sessionId, changes);
      setResult(res);
      // Everything except unwritable players now matches the Sheet.
      if (res?.written) {
        const missing = new Set(res.missing);
        setSaved((prev) =>
          Object.fromEntries(
            Object.entries(submitted).map(([id, m]) => [id, missing.has(id) ? (prev[id] ?? null) : m]),
          ),
        );
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-space-4">
      <SearchField label="Search players" placeholder="Search by name" value={query} onChange={setQuery} />

      <div className="flex items-center justify-between gap-space-3">
        <p className="text-caption text-ink-muted" aria-live="polite">
          {unmarked === 0 ? "All marked" : `${unmarked} unmarked`}
        </p>
        {unmarked > 0 && (
          <button
            type="button"
            onClick={() => setMarks(markRestPresent)}
            className="min-h-control-sm px-space-2 text-label text-accent"
          >
            {unmarked === players.length ? "Mark all present" : "Mark rest present"}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          headline="No players match"
          support={`Nobody on the roster matches “${query.trim()}”.`}
          action={<Button onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-space-2">
          {visible.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-space-3 rounded-lg border border-border bg-surface-raised p-space-3"
            >
              <span className="min-w-0 flex-1 truncate text-title">{p.name}</span>
              <AttendanceToggle
                playerName={p.name}
                value={marks[p.id] ?? null}
                onTap={(present) => setMarks((m) => ({ ...m, [p.id]: toggleMark(m[p.id] ?? null, present) }))}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-0 -mx-space-4 mt-auto flex flex-col gap-space-2 border-t border-border bg-surface px-space-4 pt-space-3 pb-[max(var(--spacing-space-4),env(safe-area-inset-bottom))]">
        {result && (
          <div role="status" className={`text-caption ${result.ok ? "text-ink-muted" : "text-danger"}`}>
            <p>{result.message}</p>
            {result.missing.length > 0 && (
              <p>
                Not saved — no row in the Attendance Sheet:{" "}
                {result.missing.map((id) => nameOf.get(id) ?? id).join(", ")}. Add their row in the Sheet first.
              </p>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={save}
          disabled={pending || !dirty}
          className="min-h-control-lg"
        >
          {pending ? "Saving…" : dirty ? `Save attendance (${changes.length})` : "All changes saved"}
        </Button>
      </div>
    </div>
  );
}
