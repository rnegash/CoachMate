// The server runs in UTC on Vercel; show times in the team's local zone.
const TIME_ZONE = "Europe/Berlin";

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// "Week of 5–11 Oct" (Monday to Sunday, in the team's time zone)
export function weekLabel(now: Date): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
  const date = new Date(`${today}T00:00:00Z`);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(d);
  const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
  const start = sameMonth ? fmt(monday, { day: "numeric" }) : fmt(monday, { day: "numeric", month: "short" });
  return `Week of ${start}–${fmt(sunday, { day: "numeric", month: "short" })}`;
}

// "Tue 7 Oct" for a date-only "YYYY-MM-DD" value.
export function formatSessionDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
