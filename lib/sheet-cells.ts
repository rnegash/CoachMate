// Pure Sheet helpers shared by the sync parsers — no API access.

export type CellValue = string | number | boolean;

/** Column index -> cells from row 2 down, as returned by readColumns(). */
export type Columns = Map<number, CellValue[]>;

// 0 -> "A", 25 -> "Z", 26 -> "AA"
export function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
