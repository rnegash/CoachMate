import { Check, Cross } from "@/components/icons";

export type StripMark = { key: string; present: boolean; label: string };

type Props = {
  /** Factual headline, e.g. "Absent 3 of last 6 counted sessions" — the primary source. */
  headline: string;
  /** Oldest first, at most eight. */
  marks: StripMark[];
};

export function AttendanceStrip({ headline, marks }: Props) {
  return (
    <div className="flex flex-col gap-space-3">
      <p className="text-body font-semibold">{headline}</p>
      <ol className="flex gap-space-2" aria-label="Recent sessions, oldest first">
        {marks.slice(-8).map((m) => (
          <li
            key={m.key}
            title={`${m.label}: ${m.present ? "Present" : "Absent"}`}
            className={`flex h-10 flex-1 items-center justify-center rounded-md text-on-accent ${
              m.present ? "bg-accent" : "bg-attend-absent"
            }`}
          >
            {m.present ? <Check /> : <Cross />}
            <span className="sr-only">
              {m.label}: {m.present ? "Present" : "Absent"}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex gap-space-4 text-label font-normal text-ink-muted" aria-hidden="true">
        <span className="flex items-center gap-space-1">
          <i className="size-3 rounded-sm bg-accent" />
          Present
        </span>
        <span className="flex items-center gap-space-1">
          <i className="size-3 rounded-sm bg-attend-absent" />
          Absent
        </span>
      </div>
    </div>
  );
}
