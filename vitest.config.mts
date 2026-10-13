import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Unit tests for pure helpers only — no component rendering, no end-to-end.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // Date tests are written for a team in Berlin (UTC+1/+2).
    env: { COACHMATE_TIME_ZONE: "Europe/Berlin" },
  },
});
