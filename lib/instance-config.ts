// Settings for one self-hosted copy of CoachMate, read from environment
// variables (see .env.example). Server-side only: nothing here is
// NEXT_PUBLIC_, so client components must not depend on it.

/**
 * COACHMATE_SPORT names the sport reference file
 * (documentation/AI sport knowledge/<sport>.md) and the sport in the AI
 * prompts. It becomes part of the system prompt, so only a short slug is
 * accepted (spec: reject values with line breaks or instructions).
 * Null when unset or invalid: the prompts then say "sports teams" and use
 * no reference.
 */
export function parseSport(value: string | undefined): string | null {
  const v = value?.trim().toLowerCase() ?? "";
  return /^[a-z][a-z0-9-]{0,39}$/.test(v) ? v : null;
}

/** The sport as written in prompt text: "field-hockey" -> "field hockey". */
export const sportName = (sport: string) => sport.replaceAll("-", " ");

/**
 * COACHMATE_TIME_ZONE: an IANA zone such as "Europe/Berlin". Decides what
 * "today" and "this week" mean and how times are shown. Falls back to UTC
 * when unset or not a zone the runtime knows.
 */
export function parseTimeZone(value: string | undefined): string {
  const v = value?.trim();
  if (!v) return "UTC";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: v }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
