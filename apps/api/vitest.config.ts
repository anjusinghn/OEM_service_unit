import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    root: resolve(__dirname),
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"]
    }
  }
})
