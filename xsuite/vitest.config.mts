// eslint-disable-next-line import/no-unresolved
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    target: "es2022",
  },
  test: {
    typecheck: {
      enabled: true,
    },
    coverage: {
      enabled: true,
      include: ["src/**/*.ts"],
      provider: "istanbul",
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
        "./src/data/": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
    pool: "forks",
  },
});
