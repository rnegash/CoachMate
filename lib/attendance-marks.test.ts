import { describe, expect, it } from "vitest";
import {
  attendanceSummary,
  compareMarksByDate,
  sessionLabel,
  type AttendanceMark,
} from "@/lib/attendance-marks";

const mark = (session_date: string, present: boolean, label: string | null = null): AttendanceMark => ({
  session_id: label ? `${session_date} ${label}` : session_date,
  session_date,
  label,
  present,
});

describe("compareMarksByDate", () => {
  it("sorts oldest first", () => {
    const sorted = [mark("2026-10-07", true), mark("2026-09-30", false), mark("2026-10-14", true)].sort(
      compareMarksByDate,
    );
    expect(sorted.map((m) => m.session_date)).toEqual(["2026-09-30", "2026-10-07", "2026-10-14"]);
  });

  it("orders same-date sessions by id", () => {
    const sorted = [mark("2026-10-07", true, "Extra"), mark("2026-10-07", true)].sort(compareMarksByDate);
    expect(sorted.map((m) => m.session_id)).toEqual(["2026-10-07", "2026-10-07 Extra"]);
  });
});

describe("attendanceSummary", () => {
  const four = [
    mark("2026-09-16", true),
    mark("2026-09-23", false),
    mark("2026-09-30", true),
    mark("2026-10-07", false),
  ];

  it("returns null when nothing is counted", () => {
    expect(attendanceSummary([], 6)).toBeNull();
  });

  it("phrases a single session on its own", () => {
    expect(attendanceSummary([mark("2026-10-07", true)], 6)).toBe("Present at the last counted session");
    expect(attendanceSummary([mark("2026-10-07", false)], 6)).toBe("Absent at the last counted session");
  });

  it("counts absences by default", () => {
    expect(attendanceSummary(four, 6)).toBe("Absent 2 of last 4 counted sessions");
  });

  it("counts presences when asked", () => {
    expect(attendanceSummary(four, 6, "present")).toBe("Present at 2 of last 4 counted sessions");
  });

  it("says 'all' when every session was attended", () => {
    const all = four.map((m) => ({ ...m, present: true }));
    expect(attendanceSummary(all, 6)).toBe("Present at all of the last 4 counted sessions");
    expect(attendanceSummary(all, 6, "present")).toBe("Present at all of the last 4 counted sessions");
  });

  it("only looks at the most recent `window` marks", () => {
    // Last two of `four`: present, absent.
    expect(attendanceSummary(four, 2)).toBe("Absent 1 of last 2 counted sessions");
  });

  it("never uses evaluative wording", () => {
    const texts = [attendanceSummary(four, 6), attendanceSummary(four, 6, "present")];
    for (const t of texts) expect(t).not.toMatch(/risk|urgent|priority|demotiv|concern/i);
  });
});

describe("sessionLabel", () => {
  it("formats the date alone for a regular session", () => {
    expect(sessionLabel({ session_date: "2026-10-07", label: null })).toBe("Wed 7 Oct");
  });

  it("appends the label for an extra session", () => {
    expect(sessionLabel({ session_date: "2026-10-07", label: "Extra skills session" })).toBe(
      "Wed 7 Oct · Extra skills session",
    );
  });
});
