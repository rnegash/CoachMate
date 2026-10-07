import { describe, expect, it } from "vitest";
import { goneSessionIds, staleMarksBySession } from "@/lib/attendance-diff";

const k = (player_id: string, session_id: string) => ({ player_id, session_id });

describe("goneSessionIds", () => {
  it("returns synced sessions whose column was removed from the Sheet", () => {
    expect(
      goneSessionIds(["2026-09-30", "2026-10-07", "2026-10-07 Extra"], [{ id: "2026-10-07" }, { id: "2026-10-14" }]),
    ).toEqual(["2026-09-30", "2026-10-07 Extra"]);
  });

  it("returns nothing when every synced session is still in the Sheet", () => {
    expect(goneSessionIds(["2026-10-07"], [{ id: "2026-10-07" }, { id: "2026-10-14" }])).toEqual([]);
  });

  it("treats a relabelled extra session as a different session", () => {
    expect(goneSessionIds(["2026-10-07 Extra"], [{ id: "2026-10-07 Extra skills session" }])).toEqual([
      "2026-10-07 Extra",
    ]);
  });

  it("returns every synced session for an empty Sheet (the caller guards against this)", () => {
    expect(goneSessionIds(["2026-10-07"], [])).toEqual(["2026-10-07"]);
  });
});

describe("staleMarksBySession", () => {
  it("deletes nothing when the Sheet still has every mark", () => {
    const marks = [k("P001", "2026-10-07"), k("P002", "2026-10-07")];
    expect(staleMarksBySession(marks, [...marks])).toEqual(new Map());
  });

  it("finds marks whose cell was cleared, grouped by session", () => {
    const existing = [
      k("P001", "2026-10-07"),
      k("P002", "2026-10-07"),
      k("P003", "2026-10-07"),
      k("P001", "2026-10-14"),
    ];
    const current = [k("P002", "2026-10-07")];
    expect(staleMarksBySession(existing, current)).toEqual(
      new Map([
        ["2026-10-07", ["P001", "P003"]],
        ["2026-10-14", ["P001"]],
      ]),
    );
  });

  it("matches on player and session together, not either alone", () => {
    // P001 still has a mark on 10-07 and P002 on 10-14, but not these pairs.
    const existing = [k("P001", "2026-10-14"), k("P002", "2026-10-07")];
    const current = [k("P001", "2026-10-07"), k("P002", "2026-10-14")];
    expect(staleMarksBySession(existing, current)).toEqual(
      new Map([
        ["2026-10-14", ["P001"]],
        ["2026-10-07", ["P002"]],
      ]),
    );
  });

  it("ignores new marks that aren't synced yet", () => {
    expect(staleMarksBySession([], [k("P001", "2026-10-07")])).toEqual(new Map());
  });

  it("treats every mark of a player whose row was skipped as stale", () => {
    // Intended: the Sheet is the source of truth and the sync never writes to
    // it. If P002's row is skipped (e.g. a mistyped player_id), their synced
    // copy is dropped and comes back on the next sync once the row is fixed.
    const existing = [k("P001", "2026-10-07"), k("P002", "2026-10-07"), k("P002", "2026-10-14")];
    const current = [k("P001", "2026-10-07")];
    expect(staleMarksBySession(existing, current)).toEqual(
      new Map([
        ["2026-10-07", ["P002"]],
        ["2026-10-14", ["P002"]],
      ]),
    );
  });
});
