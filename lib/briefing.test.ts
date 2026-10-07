import { describe, expect, it } from "vitest";
import type { AttendanceMark } from "@/lib/attendance-marks";
import { briefingRows, filterByName, olderSync } from "@/lib/briefing";

const players = [
  { id: "P001", name: "Anna Berg", jersey_number: "7" },
  { id: "P002", name: "Jonas Åberg", jersey_number: null },
  { id: "P003", name: "Mia Lind", jersey_number: "12" },
];

describe("filterByName", () => {
  it("keeps everyone for a blank query", () => {
    expect(filterByName(players, "")).toBe(players);
    expect(filterByName(players, "   ")).toBe(players);
  });

  it("matches a substring case-insensitively", () => {
    expect(filterByName(players, "ANNA").map((p) => p.id)).toEqual(["P001"]);
    expect(filterByName(players, "berg").map((p) => p.id)).toEqual([
      "P001",
      "P002",
    ]);
  });

  it("matches non-ASCII letters", () => {
    expect(filterByName(players, "åb").map((p) => p.id)).toEqual(["P002"]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(filterByName(players, "  mia ").map((p) => p.id)).toEqual(["P003"]);
  });

  it("returns an empty list when nobody matches", () => {
    expect(filterByName(players, "zzz")).toEqual([]);
  });
});

describe("olderSync", () => {
  it("returns the older timestamp", () => {
    expect(olderSync("2026-10-07T10:00:00Z", "2026-10-06T10:00:00Z")).toBe(
      "2026-10-06T10:00:00Z",
    );
    expect(olderSync("2026-10-05T10:00:00Z", "2026-10-06T10:00:00Z")).toBe(
      "2026-10-05T10:00:00Z",
    );
  });

  it("returns null when either source has never synced", () => {
    expect(olderSync(null, "2026-10-06T10:00:00Z")).toBeNull();
    expect(olderSync("2026-10-06T10:00:00Z", null)).toBeNull();
    expect(olderSync(null, null)).toBeNull();
  });
});

describe("briefingRows", () => {
  const m = (session_date: string, present: boolean): AttendanceMark => ({
    session_id: session_date,
    session_date,
    label: null,
    present,
  });

  it("adds a present-count signal per player and keeps roster order", () => {
    const attendance = new Map([
      ["P001", [m("2026-09-30", true), m("2026-10-07", false)]],
      ["P003", [m("2026-10-07", true)]],
    ]);
    const rows = briefingRows(players, attendance, 4);
    expect(rows.map((r) => r.id)).toEqual(["P001", "P002", "P003"]);
    expect(rows[0].signals).toEqual([
      { text: "Present at 1 of last 2 counted sessions" },
    ]);
    expect(rows[2].signals).toEqual([
      { text: "Present at the last counted session" },
    ]);
  });

  it("gives no signal to a player without counted sessions", () => {
    const rows = briefingRows(players, new Map(), 4);
    expect(rows.every((r) => r.signals.length === 0)).toBe(true);
  });
});
