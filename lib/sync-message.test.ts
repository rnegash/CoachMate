import { describe, expect, it } from "vitest";
import { attendanceSyncMessage, plural, rosterSyncMessage } from "@/lib/sync-message";

describe("plural", () => {
  it("adds an s except for exactly one", () => {
    expect(plural(0, "player")).toBe("0 players");
    expect(plural(1, "player")).toBe("1 player");
    expect(plural(2, "player")).toBe("2 players");
  });
});

describe("rosterSyncMessage", () => {
  it("reports only the count when nothing was removed or skipped", () => {
    expect(rosterSyncMessage({ synced: 1, removed: 0, skipped: [] })).toEqual(["Roster: 1 player."]);
  });

  it("lists removals and skipped rows", () => {
    expect(
      rosterSyncMessage({
        synced: 38,
        removed: 2,
        skipped: [
          { row: 4, reason: "missing name" },
          { row: 9, reason: "duplicate player_id" },
        ],
      }),
    ).toEqual([
      "Roster: 38 players.",
      "2 no longer in the Sheet.",
      "Skipped row 4 (missing name), row 9 (duplicate player_id).",
    ]);
  });
});

describe("attendanceSyncMessage", () => {
  it("reports sessions and marks", () => {
    expect(attendanceSyncMessage({ sessions: 1, marks: 20, skipped: [] })).toEqual([
      "Attendance: 1 session, 20 marks.",
    ]);
  });

  it("lists skipped cells", () => {
    expect(attendanceSyncMessage({ sessions: 3, marks: 1, skipped: ["cell C4 (x)", "row 7 (y)"] })).toEqual([
      "Attendance: 3 sessions, 1 mark.",
      "Skipped cell C4 (x), row 7 (y).",
    ]);
  });
});
