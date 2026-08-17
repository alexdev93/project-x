import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // No test may reach Gemini or Postgres. Anything needing them mocks them;
    // leaving these unset means a leak fails loudly instead of billing quota.
    env: { GEMINI_API_KEY: "", DATABASE_URL: "" },
  },
});
