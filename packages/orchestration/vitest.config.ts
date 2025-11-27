import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@kaz/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
      "@kaz/signal-trust": fileURLToPath(new URL("../signal-trust/src/index.ts", import.meta.url))
    }
  },
  test: {
    name: "orchestration",
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/index.ts"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
})
