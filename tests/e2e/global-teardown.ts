import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

type CleanupDelegate = {
  deleteMany: (args: {
    where: { user_agent: { contains: string } };
  }) => Promise<unknown>;
};

type CleanupPrismaClient = {
  system_activity_logs: CleanupDelegate;
  debtor_activity_logs: CleanupDelegate;
  legal_activity_logs: CleanupDelegate;
  refresh_tokens: CleanupDelegate;
  $disconnect: () => Promise<void>;
};

export default async function globalTeardown() {
  const backendDirectoryValue = process.env.E2E_BACKEND_DIR?.trim();
  const userAgentMarker = process.env.E2E_TEST_USER_AGENT?.trim();
  if (!backendDirectoryValue || !userAgentMarker) return;
  if (!userAgentMarker.startsWith("RuwangArsipE2E/")) {
    throw new Error("E2E teardown ditolak: penanda User-Agent tidak valid.");
  }

  const backendDirectory = fs.realpathSync(path.resolve(backendDirectoryValue));
  const originalWorkingDirectory = process.cwd();
  const require = createRequire(path.join(backendDirectory, "package.json"));
  let prisma: CleanupPrismaClient | undefined;
  try {
    process.chdir(backendDirectory);
    const { loadEnv } = require(path.join(
      backendDirectory,
      "src/config/env.js",
    ));
    loadEnv();
    const loadedPrisma = require(
      path.join(backendDirectory, "src/config/prisma.js"),
    ) as CleanupPrismaClient;
    prisma = loadedPrisma;
    const { assertSafeIntegrationDatabase } = require(path.join(
      backendDirectory,
      "src/integration/support/integration-test-helpers.js",
    ));
    assertSafeIntegrationDatabase("Frontend E2E global teardown");

    await new Promise((resolve) => setTimeout(resolve, 100));
    await Promise.all([
      loadedPrisma.system_activity_logs.deleteMany({
        where: { user_agent: { contains: userAgentMarker } },
      }),
      loadedPrisma.debtor_activity_logs.deleteMany({
        where: { user_agent: { contains: userAgentMarker } },
      }),
      loadedPrisma.legal_activity_logs.deleteMany({
        where: { user_agent: { contains: userAgentMarker } },
      }),
      loadedPrisma.refresh_tokens.deleteMany({
        where: { user_agent: { contains: userAgentMarker } },
      }),
    ]);
  } finally {
    try {
      await prisma?.$disconnect();
    } finally {
      process.chdir(originalWorkingDirectory);
    }
  }
}
