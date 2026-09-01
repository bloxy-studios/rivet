import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "apps/*/lib/**/*.test.ts",
      "apps/*/vercel/**/*.test.ts",
    ],
    environment: "node",
    // DB-backed suites boot in-process PGlite instances; serial file execution
    // keeps memory bounded and runs deterministic in CI.
    fileParallelism: false,
  },
});
