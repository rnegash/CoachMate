// Pure display helpers for shared check-ins on Player Detail. Wording is
// neutral and factual only (CLAUDE.md phrasing rule).
import { formatDate } from "@/lib/format";

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
