import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatSessionDate, weekLabel } from "@/lib/format";

describe("formatDateTime", () => {
  it("shows the time in Berlin, not UTC", () => {
    // 22:30 UTC on 6 Oct is 00:30 on 7 Oct in Berlin (CEST, UTC+2).
    expect(formatDateTime("2026-10-06T22:30:00Z")).toBe("7 Oct, 00:30");
  });
});

describe("formatDate", () => {
  it("includes the year", () => {
    expect(formatDate("2026-10-07T12:00:00Z")).toBe("7 Oct 2026");
  });
});

describe("formatSessionDate", () => {
  it("formats a date-only value without shifting the day", () => {
    expect(formatSessionDate("2026-10-07")).toBe("Wed 7 Oct");
  });
});

describe("weekLabel", () => {
  it("spans Monday to Sunday within one month", () => {
    expect(weekLabel(new Date("2026-10-07T12:00:00Z"))).toBe("Week of 5–11 Oct");
  });

  it("treats Sunday as the end of the week", () => {
    expect(weekLabel(new Date("2026-10-11T12:00:00Z"))).toBe("Week of 5–11 Oct");
  });

  it("names both months when the week crosses a month boundary", () => {
    expect(weekLabel(new Date("2026-10-01T12:00:00Z"))).toBe("Week of 28 Sept–4 Oct");
  });

  it("uses the Berlin date near midnight", () => {
    // Sunday 23:30 UTC is already Monday 01:30 in Berlin — the next week.
    expect(weekLabel(new Date("2026-10-11T23:30:00Z"))).toBe("Week of 12–18 Oct");
  });
});
