import { Check, Cross } from "@/components/icons";
import type { MarkState } from "@/lib/take-attendance";

type Props = {
  playerName: string;
  value: MarkState;
  /** Called with the option tapped; the caller decides set vs. clear. */
  onTap: (present: boolean) => void;
};

const OPTIONS = [
  { present: true, label: "Present", Icon: Check, on: "bg-accent text-on-accent" },
  { present: false, label: "Absent", Icon: Cross, on: "bg-attend-absent text-on-accent" },
] as const;

/** Sideline AttendanceToggle: starts unmarked; tapping the selected option clears it. */
export function AttendanceToggle({ playerName, value, onTap }: Props) {
  return (
    <div
      role="group"
      aria-label={`Attendance for ${playerName}`}
      className="flex shrink-0 overflow-hidden rounded-md border-[1.5px] border-border-strong"
    >
      {OPTIONS.map(({ present, label, Icon, on }, i) => {
        const selected = value === present;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={selected}
            onClick={() => onTap(present)}
            className={`flex min-h-control-md items-center gap-space-1 px-space-3 text-label focus-visible:-outline-offset-3 ${
              i > 0 ? "border-l-[1.5px] border-border-strong" : ""
            } ${
              selected ? on : "bg-surface-raised text-ink"
            }`}
          >
            {selected && <Icon />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
