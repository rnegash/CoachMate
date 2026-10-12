// Pure display helpers for shared check-ins and WhatsApp status on Player
// Detail. Wording is neutral and factual only (CLAUDE.md phrasing rule).
import { formatDate } from "@/lib/format";
import { STOP_GRACE_DAYS } from "@/lib/retention";

/** Number of check-ins shown per goal before the rest are collapsed. */
export const VISIBLE_CHECKINS = 3;

/**
 * "2 check-ins · last on 6 Oct 2026", or null when there are none (the UI
 * then shows nothing). Expects newest first.
 */
export function checkinCountLine(checkins: { created_at: string }[]): string | null {
  if (checkins.length === 0) return null;
  const last = formatDate(checkins[0].created_at);
  return checkins.length === 1 ? `1 check-in · on ${last}` : `${checkins.length} check-ins · last on ${last}`;
}

/** Splits a newest-first list into the visible head and the collapsed rest. */
export function splitLatest<T>(items: T[], visible = VISIBLE_CHECKINS): { shown: T[]; earlier: T[] } {
  return { shown: items.slice(0, visible), earlier: items.slice(visible) };
}

/** Same shape as WhatsappStatus in lib/checkins.ts (kept structural: that module is server-only). */
export type WhatsappStatusInput =
  | { state: "not_joined" }
  | { state: "opted_in"; since: string }
  | { state: "opted_out"; since: string };

export function whatsappStatusLine(status: WhatsappStatusInput): string {
  switch (status.state) {
    case "opted_in":
      return `WhatsApp check-ins: on since ${formatDate(status.since)}`;
    case "opted_out":
      return `WhatsApp check-ins: stopped on ${formatDate(status.since)} (shared updates are deleted ${STOP_GRACE_DAYS}–${STOP_GRACE_DAYS + 1} days later)`;
    case "not_joined":
      return "WhatsApp check-ins: not joined";
  }
}
