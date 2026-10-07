import { describe, expect, it } from "vitest";
import { columnLetter } from "@/lib/sheet-cells";

describe("columnLetter", () => {
  it.each([
    [0, "A"],
    [25, "Z"],
    [26, "AA"],
    [27, "AB"],
    [51, "AZ"],
    [52, "BA"],
    [701, "ZZ"],
    [702, "AAA"],
  ])("%i -> %s", (index, letter) => {
    expect(columnLetter(index)).toBe(letter);
  });
});
