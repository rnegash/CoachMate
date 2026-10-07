import { describe, expect, it } from "vitest";
import { isTabActive, safeRedirectPath } from "@/lib/navigation";

describe("isTabActive", () => {
  it("matches the root tab only on '/'", () => {
    expect(isTabActive("/", "/")).toBe(true);
    expect(isTabActive("/", "/attendance")).toBe(false);
  });

  it("matches a tab and its sub-routes", () => {
    expect(isTabActive("/attendance", "/attendance")).toBe(true);
    expect(isTabActive("/attendance", "/attendance/2026-10-07")).toBe(true);
  });

  it("does not match a route that merely shares a prefix", () => {
    expect(isTabActive("/coach", "/coaching")).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("keeps same-site relative paths", () => {
    expect(safeRedirectPath("/players/P001")).toBe("/players/P001");
    expect(safeRedirectPath("/attendance?x=1")).toBe("/attendance?x=1");
  });

  it("falls back to '/' for anything that could leave the site", () => {
    for (const from of ["", "https://evil.example", "//evil.example", "/\\evil.example", "players"]) {
      expect(safeRedirectPath(from)).toBe("/");
    }
  });
});
