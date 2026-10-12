// Pure helpers for the check-in retention purge (CLAUDE.md, "Retention
// rule") — no API or DB access.
import { timingSafeEqual } from "node:crypto";

/** Days between STOP and deletion of the player's stored check-ins. */
export const STOP_GRACE_DAYS = 7;

/** ISO timestamp: check-ins of players who sent STOP at or before this are purged. */
export function purgeCutoff(now: Date): string {
  return new Date(now.getTime() - STOP_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Hours a check-in draft waits for the player's YES/NO before it is deleted. */
export const DRAFT_TTL_HOURS = 24;

/** ISO timestamp for checkin_drafts.expires_at: now + 24 h. */
export function draftExpiry(now: Date): string {
  return new Date(now.getTime() + DRAFT_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * True only for `Authorization: Bearer <secret>` with a non-empty secret.
 * Fails closed when the secret is unset.
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
