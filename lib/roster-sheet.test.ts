import { describe, expect, it } from "vitest";
import {
  normalizePhone,
  PLAYER_ID_FORMAT,
  parseRosterRows,
  rosterColumnIndex,
  staleContactIds,
} from "@/lib/roster-sheet";
import type { CellValue, Columns } from "@/lib/sheet-cells";

// Build readColumns()-shaped input from data rows (row 2 down), columns in header order.
function sheet(rows: CellValue[][]): { columns: Columns; rowCount: number } {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const columns: Columns = new Map();
  for (let c = 0; c < width; c++) columns.set(c, rows.map((r) => r[c] ?? ""));
  return { columns, rowCount: rows.length };
}

const IDX = { id: 0, name: 1, jersey: 2, phone: -1 };
const IDX_PHONE = { id: 0, name: 1, jersey: -1, phone: 2 };

describe("PLAYER_ID_FORMAT", () => {
  it("accepts opaque P-number ids", () => {
    for (const id of ["P1", "P001", "P999999"]) expect(PLAYER_ID_FORMAT.test(id)).toBe(true);
  });

  it("rejects anything that could identify a player", () => {
    for (const id of ["p001", "AB", "Anna", "P", "P0000001", "7", " P001", "P001x"]) {
      expect(PLAYER_ID_FORMAT.test(id)).toBe(false);
    }
  });
});

describe("rosterColumnIndex", () => {
  it("finds columns case- and whitespace-insensitively in any order", () => {
    expect(rosterColumnIndex(["Name", " PLAYER_ID ", "phone", "Jersey"])).toEqual({ id: 1, name: 0, jersey: 3, phone: 2 });
  });

  it("reports missing columns as -1", () => {
    expect(rosterColumnIndex(["player_id"])).toEqual({ id: 0, name: -1, jersey: -1, phone: -1 });
  });
});

describe("parseRosterRows", () => {
  it("parses valid rows and trims cells", () => {
    const { columns, rowCount } = sheet([
      ["P001", " Anna Berg ", "7"],
      ["P002", "Mia Lind", ""],
    ]);
    expect(parseRosterRows(columns, rowCount, IDX)).toEqual({
      rows: [
        { id: "P001", name: "Anna Berg", jersey_number: "7" },
        { id: "P002", name: "Mia Lind", jersey_number: null },
      ],
      skipped: [],
      presentIds: new Set(["P001", "P002"]),
      contacts: [],
      phoneIssues: [],
    });
  });

  it("stringifies numeric jersey cells", () => {
    const { columns, rowCount } = sheet([["P001", "Anna", 7]]);
    expect(parseRosterRows(columns, rowCount, IDX).rows[0].jersey_number).toBe("7");
  });

  it("ignores fully blank rows without reporting them", () => {
    const { columns, rowCount } = sheet([["P001", "Anna", "7"], ["", "", ""], ["P002", "Mia", ""]]);
    const result = parseRosterRows(columns, rowCount, IDX);
    expect(result.rows.map((r) => r.id)).toEqual(["P001", "P002"]);
    expect(result.skipped).toEqual([]);
  });

  it("skips bad rows with their Sheet row number and reason", () => {
    const { columns, rowCount } = sheet([
      ["", "No Id", ""], // row 2
      ["Anna", "Anna", ""], // row 3
      ["P003", "", "9"], // row 4
      ["P004", "Jonas", ""], // row 5
      ["P004", "Jonas again", ""], // row 6
    ]);
    const result = parseRosterRows(columns, rowCount, IDX);
    expect(result.rows).toEqual([{ id: "P004", name: "Jonas", jersey_number: null }]);
    expect(result.skipped).toEqual([
      { row: 2, reason: "missing player_id" },
      { row: 3, reason: "player_id must look like P001" },
      { row: 4, reason: "missing name" },
      { row: 6, reason: "duplicate player_id" },
    ]);
  });

  it("still counts a skipped row's id as present, so a slip doesn't remove the player", () => {
    const { columns, rowCount } = sheet([["P003", "", "9"]]);
    expect(parseRosterRows(columns, rowCount, IDX).presentIds).toEqual(new Set(["P003"]));
  });

  it("works without a jersey column", () => {
    const { columns, rowCount } = sheet([["P001", "Anna"]]);
    expect(parseRosterRows(columns, rowCount, { id: 0, name: 1, jersey: -1, phone: -1 }).rows).toEqual([
      { id: "P001", name: "Anna", jersey_number: null },
    ]);
  });
});

describe("normalizePhone", () => {
  it("strips separators and keeps E.164", () => {
    expect(normalizePhone("+49 176 1234-5678")).toBe("+4917612345678");
    expect(normalizePhone("+1 (415) 555.0100")).toBe("+14155550100");
    expect(normalizePhone("+4917612345678")).toBe("+4917612345678");
  });

  it("turns a leading 00 into +", () => {
    expect(normalizePhone("0049 176 12345678")).toBe("+4917612345678");
  });

  it("drops a (0) trunk prefix after the country code", () => {
    expect(normalizePhone("+49 (0)176 12345678")).toBe("+4917612345678");
  });

  it("rejects numbers without a country code or outside E.164", () => {
    for (const raw of ["0176 12345678", "4917612345678", "+0176123456", "+12345", "+491761234567890123", "call me", ""]) {
      expect(normalizePhone(raw)).toBeNull();
    }
  });
});

describe("parseRosterRows phone column", () => {
  it("collects valid phones as contacts, normalized", () => {
    const { columns, rowCount } = sheet([
      ["P001", "Anna", "+49 176 12345678"],
      ["P002", "Mia", ""],
    ]);
    const result = parseRosterRows(columns, rowCount, IDX_PHONE);
    expect(result.contacts).toEqual([{ player_id: "P001", phone: "+4917612345678" }]);
    expect(result.phoneIssues).toEqual([]);
  });

  it("still syncs a row with an invalid phone and warns without the number", () => {
    const { columns, rowCount } = sheet([["P001", "Anna", "0176 12345678"]]);
    const result = parseRosterRows(columns, rowCount, IDX_PHONE);
    expect(result.rows.map((r) => r.id)).toEqual(["P001"]);
    expect(result.skipped).toEqual([]);
    expect(result.contacts).toEqual([]);
    expect(result.phoneIssues).toEqual([{ row: 2, reason: "phone not in international format" }]);
    expect(JSON.stringify(result.phoneIssues)).not.toContain("12345678");
  });

  it("keeps neither player when two share a phone, and warns for both rows", () => {
    const { columns, rowCount } = sheet([
      ["P001", "Anna", "+4917612345678"], // row 2
      ["P002", "Mia", "bad"], // row 3
      ["P003", "Jonas", "0049 176 12345678"], // row 4
      ["P004", "Lea", "+14155550100"], // row 5
    ]);
    const result = parseRosterRows(columns, rowCount, IDX_PHONE);
    expect(result.rows).toHaveLength(4);
    expect(result.contacts).toEqual([{ player_id: "P004", phone: "+14155550100" }]);
    expect(result.phoneIssues).toEqual([
      { row: 2, reason: "duplicate phone" },
      { row: 3, reason: "phone not in international format" },
      { row: 4, reason: "duplicate phone" },
    ]);
  });

  it("ignores the phone of a skipped row", () => {
    const { columns, rowCount } = sheet([["P001", "", "+4917612345678"]]);
    const result = parseRosterRows(columns, rowCount, IDX_PHONE);
    expect(result.contacts).toEqual([]);
    expect(result.phoneIssues).toEqual([]);
  });
});

describe("staleContactIds", () => {
  const c = (player_id: string, phone: string) => ({ player_id, phone });

  it("keeps unchanged contacts", () => {
    expect(staleContactIds([c("P001", "+4917612345678")], [c("P001", "+4917612345678")])).toEqual([]);
  });

  it("marks removed, cleared and changed contacts", () => {
    expect(
      staleContactIds(
        [c("P001", "+4917612345678"), c("P002", "+4917600000000"), c("P003", "+14155550100")],
        [c("P002", "+4917611111111"), c("P003", "+14155550100")],
      ),
    ).toEqual(["P001", "P002"]);
  });

  it("marks both sides of a phone swap, so the upsert can't clash", () => {
    expect(
      staleContactIds(
        [c("P001", "+4917612345678"), c("P002", "+14155550100")],
        [c("P001", "+14155550100"), c("P002", "+4917612345678")],
      ),
    ).toEqual(["P001", "P002"]);
  });
});
