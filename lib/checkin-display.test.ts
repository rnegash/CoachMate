import { describe, expect, it } from "vitest";
import { checkinCountLine, splitLatest } from "@/lib/checkin-display";

const at = (iso: string) => ({ created_at: iso });

describe("checkinCountLine", () => {
  it("returns null with no check-ins", () => {
    expect(checkinCountLine([])).toBeNull();
  });

  it("uses the singular for one check-in", () => {
    expect(checkinCountLine([at("2026-10-06T12:00:00Z")])).toBe("1 check-in · on 6 Oct 2026");
  });

  it("counts and dates the newest (first) check-in", () => {
    expect(checkinCountLine([at("2026-10-06T12:00:00Z"), at("2026-10-01T12:00:00Z")])).toBe(
      "2 check-ins · last on 6 Oct 2026",
    );
  });

  it("uses the Berlin date", () => {
    // 22:30 UTC on 6 Oct is 7 Oct in Berlin.
    expect(checkinCountLine([at("2026-10-06T22:30:00Z")])).toBe("1 check-in · on 7 Oct 2026");
  });
});

describe("splitLatest", () => {
  it("shows everything when there are three or fewer", () => {
    expect(splitLatest([1, 2, 3])).toEqual({ shown: [1, 2, 3], earlier: [] });
  });

  it("collapses everything after the latest three", () => {
    expect(splitLatest([1, 2, 3, 4, 5])).toEqual({ shown: [1, 2, 3], earlier: [4, 5] });
  });
});
