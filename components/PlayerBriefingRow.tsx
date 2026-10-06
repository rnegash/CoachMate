import Link from "next/link";
import { ChevronRight } from "@/components/icons";

export type Signal = {
  text: string;
  /** Semibold attend-absent emphasis; the words must carry the meaning on their own. */
  emphasis?: boolean;
};

type Props = {
  href: string;
  name: string;
  jerseyNumber: string | null;
  /** Up to three short, factual lines (attendance, goal, check-in). */
  signals?: Signal[];
};

export function PlayerBriefingRow({ href, name, jerseyNumber, signals = [] }: Props) {
  return (
    <Link
      href={href}
      className="flex items-center gap-space-3 rounded-lg border border-border bg-surface-raised p-space-3 hover:border-border-strong"
    >
      <span
        className="flex size-control-md shrink-0 items-center justify-center rounded-sm bg-ink text-numeral text-surface"
        aria-label={jerseyNumber ? `Number ${jerseyNumber}` : "No number"}
      >
        {jerseyNumber ?? "–"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-title">{name}</span>
        {signals.slice(0, 3).map((s) => (
          <span
            key={s.text}
            className={s.emphasis ? "text-label text-attend-absent" : "text-label font-normal text-ink-muted"}
          >
            {s.text}
          </span>
        ))}
      </span>
      <ChevronRight size={20} className="shrink-0 text-ink-muted" />
    </Link>
  );
}
