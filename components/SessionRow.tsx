import Link from "next/link";
import { ChevronRight } from "@/components/icons";

type Props = {
  href: string;
  title: string;
  /** Extra-session label, shown as a tag. */
  tag?: string | null;
  meta: string;
  today?: boolean;
};

/** Sideline ListRow for a training session. */
export function SessionRow({ href, title, tag, meta, today = false }: Props) {
  return (
    <Link
      href={href}
      className={`flex min-h-16 items-center gap-space-3 rounded-lg px-space-4 py-space-3 ${
        today ? "border-2 border-accent bg-accent-tint" : "border border-border bg-surface-raised hover:border-border-strong"
      }`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        {today && <span className="text-caption font-semibold text-accent">Today</span>}
        <span className="text-title">
          {title}
          {tag && (
            <span className="ml-space-2 inline-block rounded-sm bg-surface-sunken px-space-2 align-[1px] text-caption font-semibold text-ink-muted">
              {tag}
            </span>
          )}
        </span>
        <span className="text-label font-normal text-ink-muted">{meta}</span>
      </span>
      <ChevronRight size={20} className={`shrink-0 ${today ? "text-accent" : "text-ink-muted"}`} />
    </Link>
  );
}
