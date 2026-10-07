import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Unit tests for pure helpers only — no component rendering, no end-to-end.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
