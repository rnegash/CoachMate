import Link from "next/link";
import { ArrowLeft } from "@/components/icons";

type Props = {
  title: string;
  subtitle?: string;
  /** Drill-in screens: back link instead of a top-level title. */
  back?: { href: string; label: string };
  /** One trailing screen-level action. */
  action?: React.ReactNode;
};

export function AppHeader({ title, subtitle, back, action }: Props) {
  return (
    <header className="flex min-h-[72px] items-center gap-space-3 rounded-lg border border-border bg-surface-raised px-space-4 py-space-3">
      {back && (
        <Link
          href={back.href}
          aria-label={back.label}
          className="-ml-space-2 flex size-control-md shrink-0 items-center justify-center rounded-md text-ink hover:bg-surface-sunken"
        >
          <ArrowLeft size={24} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className={back ? "truncate text-[20px] leading-[28px] font-bold" : "text-heading"}>
          {title}
        </h1>
        {subtitle && <p className="text-body text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
