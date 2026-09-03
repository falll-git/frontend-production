import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/config/production-deployment.test.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
