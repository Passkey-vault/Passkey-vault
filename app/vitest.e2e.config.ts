import { defineConfig } from "vitest/config";

export default defineConfig({
  define: { global: "globalThis" },
  test: { include: ["e2e/**/*.e2e.ts"], testTimeout: 120_000 },
});
