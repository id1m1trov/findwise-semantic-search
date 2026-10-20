import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The real-model integration test loads MiniLM in beforeAll; on a fresh clone that includes
    // downloading it, which can exceed Vitest's 10 s default for hooks.
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
