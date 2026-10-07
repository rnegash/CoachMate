import { describe, expect, it } from "vitest";
import {
  countBySession,
  markChanges,
  markRestPresent,
  markWrites,
  sessionCountsText,
  splitSessions,
  toggleMark,
  unmarkedCount,
} from "@/lib/take-attendance";

describe("toggleMark", () => {
  it("sets an unmarked player", () => {
    expect(toggleMark(null, true)).toBe(true);
    expect(toggleMark(null, false)).toBe(false);
  });

  it("switches between present and absent", () => {
    expect(toggleMark(true, false)).toBe(false);
    expect(toggleMark(false, true)).toBe(true);
  });

  it("clears when the selected option is tapped again", () => {
    expect(toggleMark(true, true)).toBeNull();
    expect(toggleMark(false, false)).toBeNull();
  });
});

describe("markChanges", () => {
  it("returns only players whose mark changed", () => {
    expect(
      markChanges({ P001: null, P002: true, P003: false }, { P001: true, P002: true, P003: null }),
    ).toEqual([
      { player_id: "P001", present: true },
      { player_id: "P003", present: null },
    ]);
  });

  it("treats a player missing from the initial marks as unmarked", () => {
    expect(markChanges({}, { P001: null, P002: false })).toEqual([{ player_id: "P002", present: false }]);
  });

  it("returns nothing when nothing changed", () => {
    expect(markChanges({ P001: true }, { P001: true })).toEqual([]);
  });
});

describe("unmarkedCount / markRestPresent", () => {
  const marks = { P001: null, P002: false, P003: true, P004: null };

  it("counts unmarked players", () => {
    expect(unmarkedCount(marks)).toBe(2);
    expect(unmarkedCount({})).toBe(0);
  });

  it("marks only the unmarked players present and keeps absences", () => {
    expect(markRestPresent(marks)).toEqual({ P001: true, P002: false, P003: true, P004: true });
  });
});

describe("markWrites", () => {
  const rows = new Map([
    ["P001", 2],
    ["P002", 5],
  ]);

  it("addresses each change by the player's row and the session column", () => {
    expect(
      markWrites("Attendance", 27, rows, [
        { player_id: "P001", present: true },
        { player_id: "P002", present: false },
      ]).writes,
    ).toEqual([
      { range: "'Attendance'!AB2", values: [[true]] },
      { range: "'Attendance'!AB5", values: [[false]] },
    ]);
  });

  it("clears the cell for an unmarked player", () => {
    expect(markWrites("Attendance", 2, rows, [{ player_id: "P001", present: null }]).writes).toEqual([
      { range: "'Attendance'!C2", values: [[""]] },
    ]);
  });

  it("reports players without a row instead of writing anywhere", () => {
    expect(markWrites("Attendance", 2, rows, [{ player_id: "P009", present: true }])).toEqual({
      writes: [],
      missing: ["P009"],
    });
  });
});

describe("countBySession / sessionCountsText", () => {
  it("counts present and absent per session", () => {
    const counts = countBySession([
      { session_id: "a", present: true },
      { session_id: "a", present: false },
      { session_id: "a", present: true },
      { session_id: "b", present: false },
    ]);
    expect(counts).toEqual(
      new Map([
        ["a", { present: 2, absent: 1 }],
        ["b", { present: 0, absent: 1 }],
      ]),
    );
  });

  it("phrases counts neutrally", () => {
    expect(sessionCountsText({ present: 5, absent: 2 })).toBe("5 present · 2 absent");
    expect(sessionCountsText({ present: 0, absent: 0 })).toBe("Not taken yet");
  });
});

describe("splitSessions", () => {
  const s = (id: string) => ({ id, session_date: id.slice(0, 10) });
  const sessions = [
    s("2026-10-14"),
    s("2026-09-30"),
    s("2026-10-07 Extra skills session"),
    s("2026-10-21"),
    s("2026-10-07"),
    s("2026-10-01"),
  ];

  it("puts today's sessions first, including an extra one on the same date", () => {
    expect(splitSessions(sessions, "2026-10-07").today.map((x) => x.id)).toEqual([
      "2026-10-07",
      "2026-10-07 Extra skills session",
    ]);
  });

  it("orders upcoming soonest first and past newest first", () => {
    const { upcoming, past } = splitSessions(sessions, "2026-10-07");
    expect(upcoming.map((x) => x.id)).toEqual(["2026-10-14", "2026-10-21"]);
    expect(past.map((x) => x.id)).toEqual(["2026-10-01", "2026-09-30"]);
  });

  it("leaves today empty on a day without a session", () => {
    const { today, upcoming, past } = splitSessions(sessions, "2026-10-10");
    expect(today).toEqual([]);
    expect(upcoming.map((x) => x.id)).toEqual(["2026-10-14", "2026-10-21"]);
    expect(past[0].id).toBe("2026-10-07 Extra skills session");
  });
});
