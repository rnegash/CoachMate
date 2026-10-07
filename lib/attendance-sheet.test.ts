import { describe, expect, it } from "vitest";
import {
  acceptAttendanceRows,
  attendanceIdColumn,
  findSessionColumns,
  normalizeLabel,
  parseAttendanceRows,
  parseMark,
  parseSessionHeader,
  playerRows,
  serialToIsoDate,
  sessionId,
  type AttendanceRow,
} from "@/lib/attendance-sheet";
import type { CellValue, Columns } from "@/lib/sheet-cells";

function sheet(rows: CellValue[][]): { columns: Columns; rowCount: number } {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const columns: Columns = new Map();
  for (let c = 0; c < width; c++) columns.set(c, rows.map((r) => r[c] ?? ""));
  return { columns, rowCount: rows.length };
}

describe("serialToIsoDate", () => {
  it("converts Sheets date serials", () => {
    expect(serialToIsoDate(0)).toBe("1899-12-30");
    expect(serialToIsoDate(46302)).toBe("2026-10-07");
  });

  it("drops a time-of-day fraction", () => {
    expect(serialToIsoDate(46302.75)).toBe("2026-10-07");
  });
});

describe("parseSessionHeader", () => {
  it("reads a typed date", () => {
    expect(parseSessionHeader("2026-10-07")).toEqual({ session_date: "2026-10-07", label: null });
  });

  it("reads a date cell (serial number)", () => {
    expect(parseSessionHeader(46302)).toEqual({ session_date: "2026-10-07", label: null });
  });

  it("reads a date with a label and collapses its whitespace", () => {
    expect(parseSessionHeader(" 2026-10-07   Extra  skills session ")).toEqual({
      session_date: "2026-10-07",
      label: "Extra skills session",
    });
  });

  it("ignores headers that aren't sessions", () => {
    for (const h of ["player_id", "name", "notes", "", "07.10.2026", "2026-10-7", "2026-13-45", true]) {
      expect(parseSessionHeader(h)).toBeNull();
    }
  });
});

describe("parseMark", () => {
  it("treats blank cells as not counted", () => {
    expect(parseMark(undefined)).toBeNull();
    expect(parseMark("")).toBeNull();
    expect(parseMark("   ")).toBeNull();
  });

  it("accepts booleans and TRUE/FALSE text in any case", () => {
    expect(parseMark(true)).toBe(true);
    expect(parseMark(false)).toBe(false);
    expect(parseMark(" true ")).toBe(true);
    expect(parseMark("False")).toBe(false);
  });

  it("flags anything else as invalid", () => {
    for (const v of ["x", "yes", "SANT", 1, 0]) expect(parseMark(v)).toBe("invalid");
  });
});

describe("attendanceIdColumn", () => {
  it("finds player_id case-insensitively", () => {
    expect(attendanceIdColumn(["name", " Player_ID ", "2026-10-07"])).toBe(1);
  });

  it("returns -1 when missing", () => {
    expect(attendanceIdColumn(["name", "2026-10-07"])).toBe(-1);
  });
});

describe("findSessionColumns", () => {
  it("returns session columns with their Sheet letter and index", () => {
    const { sessions, skipped } = findSessionColumns(
      ["player_id", "name", "2026-10-07", 46309, "2026-10-07 Extra skills session", "notes"],
      0,
    );
    expect(skipped).toEqual([]);
    expect(sessions).toEqual([
      { id: "2026-10-07", session_date: "2026-10-07", label: null, sheet_column: "C", index: 2 },
      { id: "2026-10-14", session_date: "2026-10-14", label: null, sheet_column: "D", index: 3 },
      {
        id: "2026-10-07 Extra skills session",
        session_date: "2026-10-07",
        label: "Extra skills session",
        sheet_column: "E",
        index: 4,
      },
    ]);
  });

  it("keeps the first of two identical sessions and reports the second", () => {
    const { sessions, skipped } = findSessionColumns(["player_id", "2026-10-07", 46302], 0);
    expect(sessions.map((s) => s.sheet_column)).toEqual(["B"]);
    expect(skipped).toEqual(['column C (duplicate session "2026-10-07")']);
  });
});

describe("parseAttendanceRows", () => {
  const { sessions } = findSessionColumns(["player_id", "2026-10-07", "2026-10-14"], 0);

  it("collects counted marks per player and leaves blanks out", () => {
    const { columns, rowCount } = sheet([
      ["P001", true, ""],
      [" P002 ", false, "TRUE"],
    ]);
    expect(parseAttendanceRows(columns, rowCount, 0, sessions)).toEqual({
      rows: [
        { sheetRow: 2, playerId: "P001", marks: [{ player_id: "P001", session_id: "2026-10-07", present: true }] },
        {
          sheetRow: 3,
          playerId: "P002",
          marks: [
            { player_id: "P002", session_id: "2026-10-07", present: false },
            { player_id: "P002", session_id: "2026-10-14", present: true },
          ],
        },
      ],
      skipped: [],
    });
  });

  it("reports invalid cells by address and doesn't count them", () => {
    const { columns, rowCount } = sheet([["P001", "x", true]]);
    const result = parseAttendanceRows(columns, rowCount, 0, sessions);
    expect(result.rows[0].marks).toEqual([{ player_id: "P001", session_id: "2026-10-14", present: true }]);
    expect(result.skipped).toEqual(["cell B2 (not TRUE/FALSE, treated as not counted)"]);
  });

  it("reports rows with marks but no player_id, and silently drops empty ones", () => {
    const { columns, rowCount } = sheet([
      ["", true, ""], // row 2: has a mark
      ["", "", ""], // row 3: empty
    ]);
    expect(parseAttendanceRows(columns, rowCount, 0, sessions)).toEqual({
      rows: [],
      skipped: ["row 2 (missing player_id)"],
    });
  });
});

describe("acceptAttendanceRows", () => {
  const row = (sheetRow: number, playerId: string): AttendanceRow => ({
    sheetRow,
    playerId,
    marks: [{ player_id: playerId, session_id: "2026-10-07", present: true }],
  });

  it("keeps rows for roster players and rejects the rest with reasons", () => {
    const result = acceptAttendanceRows(
      [row(2, "P001"), row(3, "Anna"), row(4, "P999"), row(5, "P001"), row(6, "P002")],
      new Set(["P001", "P002"]),
    );
    expect(result.players).toEqual(new Set(["P001", "P002"]));
    expect(result.marks.map((m) => m.player_id)).toEqual(["P001", "P002"]);
    expect(result.skipped).toEqual([
      "row 3 (player_id must look like P001)",
      "row 4 (player_id not in the roster)",
      "row 5 (duplicate player_id)",
    ]);
  });
});

describe("normalizeLabel / sessionId", () => {
  it("collapses whitespace and treats blank as no label", () => {
    expect(normalizeLabel("  Extra   skills ")).toBe("Extra skills");
    expect(normalizeLabel("   ")).toBeNull();
    expect(normalizeLabel(null)).toBeNull();
  });

  it("builds the same id the sync stores", () => {
    expect(sessionId("2026-10-07", null)).toBe("2026-10-07");
    expect(sessionId("2026-10-07", "Extra skills session")).toBe("2026-10-07 Extra skills session");
    const { sessions } = findSessionColumns(["player_id", "2026-10-07  Extra   skills session"], 0);
    expect(sessions[0].id).toBe(sessionId("2026-10-07", normalizeLabel(" Extra skills  session")));
  });
});

describe("playerRows", () => {
  it("maps player_id to its Sheet row, skipping blanks", () => {
    expect(playerRows(["P001", "", " P002 "])).toEqual(
      new Map([
        ["P001", 2],
        ["P002", 4],
      ]),
    );
  });

  it("keeps the first row for a duplicate id, like the sync", () => {
    expect(playerRows(["P001", "P001"]).get("P001")).toBe(2);
  });
});
