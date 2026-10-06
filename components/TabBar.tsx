"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chat, CheckSquare, ListIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Briefing", Icon: ListIcon },
  { href: "/attendance", label: "Attendance", Icon: CheckSquare },
  { href: "/coach", label: "Coach", Icon: Chat },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map(({ href, label, Icon }) => {
          const current = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-space-1 border-t-[3px] text-caption ${
                  current
                    ? "border-accent font-bold text-accent"
                    : "border-transparent text-ink-muted"
                }`}
              >
                <Icon size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
