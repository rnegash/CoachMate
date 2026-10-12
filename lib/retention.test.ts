import { describe, expect, it } from "vitest";
import { draftExpiry, isCronAuthorized, purgeCutoff } from "@/lib/retention";

describe("purgeCutoff", () => {
  it("is exactly 7 days before now", () => {
    expect(purgeCutoff(new Date("2026-10-08T03:00:00.000Z"))).toBe("2026-10-01T03:00:00.000Z");
  });

  it("crosses month boundaries", () => {
    expect(purgeCutoff(new Date("2026-11-03T00:00:00.000Z"))).toBe("2026-10-27T00:00:00.000Z");
  });
});

describe("draftExpiry", () => {
  it("is exactly 24 hours after now", () => {
    expect(draftExpiry(new Date("2026-10-31T23:30:00.000Z"))).toBe("2026-11-01T23:30:00.000Z");
  });
});

describe("isCronAuthorized", () => {
  it("accepts the matching bearer token", () => {
    expect(isCronAuthorized("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("rejects a wrong, missing or malformed header", () => {
    expect(isCronAuthorized("Bearer nope", "s3cret")).toBe(false);
    expect(isCronAuthorized(null, "s3cret")).toBe(false);
    expect(isCronAuthorized("s3cret", "s3cret")).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
