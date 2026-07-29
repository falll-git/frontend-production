import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const configuredBackendDirectory = process.env.E2E_BACKEND_DIR?.trim();
const e2eRunId = process.env.E2E_TEST_RUN_ID || randomUUID();
const e2eUserAgentMarker =
  process.env.E2E_TEST_USER_AGENT || `RuwangArsipE2E/${e2eRunId}`;
process.env.E2E_TEST_RUN_ID = e2eRunId;
process.env.E2E_TEST_USER_AGENT = e2eUserAgentMarker;

function parseBooleanFlag(value: string | undefined, label: string) {
  const normalized = String(value || "false").trim().toLowerCase();
  if (!['true', 'false'].includes(normalized)) {
    throw new Error(`${label} hanya menerima true atau false.`);
  }
  return normalized === "true";
}

function parsePositiveInteger(
  value: string | undefined,
  label: string,
  fallback: number,
) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} wajib berupa bilangan bulat positif.`);
  }
  return parsed;
}

const reuseFrontendBuild = parseBooleanFlag(
  process.env.E2E_REUSE_FRONTEND_BUILD,
  "E2E_REUSE_FRONTEND_BUILD",
);
const e2eAuthRateLimitMax = parsePositiveInteger(
  process.env.E2E_AUTH_RATE_LIMIT_MAX,
  "E2E_AUTH_RATE_LIMIT_MAX",
  250,
);

function assertReusableFrontendBuild() {
  if (!reuseFrontendBuild) return;

  const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
  if (
    !fs.existsSync(buildIdPath) ||
    !fs.readFileSync(buildIdPath, "utf8").trim()
  ) {
    throw new Error(
      "E2E_REUSE_FRONTEND_BUILD=true tetapi build production .next/BUILD_ID tidak tersedia.",
    );
  }
}

function assertLoopbackUrl(value: string, label: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} harus berupa URL valid.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLoopback =
    hostname === "localhost" ||
    hostname === "[::1]" ||
    hostname.startsWith("127.");

  if (!isLoopback || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} wajib memakai HTTP(S) loopback untuk managed E2E.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} tidak boleh memuat credential.`);
  }

  return parsed;
}

function resolveUrlPort(parsed: URL) {
  return Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
}

function resolveManagedBackendDirectory() {
  if (!configuredBackendDirectory) return null;

  const directory = fs.realpathSync(path.resolve(configuredBackendDirectory));
  const manifestPath = path.join(directory, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    name?: string;
    scripts?: Record<string, string>;
  };

  if (manifest.name !== "be-ruwang-arsip" || !manifest.scripts?.start) {
    throw new Error(
      "E2E_BACKEND_DIR tidak menunjuk repository backend Ruwang Arsip yang valid.",
    );
  }

  return directory;
}

const managedBackendDirectory = resolveManagedBackendDirectory();
assertReusableFrontendBuild();
const backendHealthUrl =
  process.env.E2E_BACKEND_HEALTH_URL || "http://127.0.0.1:7111/health";
const frontendTarget = assertLoopbackUrl(baseURL, "PLAYWRIGHT_BASE_URL");
const backendTarget = managedBackendDirectory
  ? assertLoopbackUrl(backendHealthUrl, "E2E_BACKEND_HEALTH_URL")
  : null;

const webServers = [
  ...(managedBackendDirectory
    ? [
        {
          name: "backend",
          command: "npm run start",
          cwd: managedBackendDirectory,
          url: backendHealthUrl,
          reuseExistingServer: false,
          timeout: 60_000,
          stdout: "pipe" as const,
          stderr: "pipe" as const,
          env: {
            ...process.env,
            AUTH_RATE_LIMIT_MAX: String(e2eAuthRateLimitMax),
            CORS_ORIGIN: frontendTarget.origin,
            FRONTEND_URL: frontendTarget.origin,
            NODE_ENV: process.env.E2E_BACKEND_NODE_ENV || "development",
            PORT: String(resolveUrlPort(backendTarget!)),
            RATE_LIMIT_STORE: "memory",
          },
          gracefulShutdown: {
            signal: "SIGTERM" as const,
            timeout: 5_000,
          },
        },
      ]
    : []),
  {
    name: "frontend",
    command: reuseFrontendBuild ? "npm run start" : "npm run test:e2e:server",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(resolveUrlPort(frontendTarget)),
    },
    gracefulShutdown: {
      signal: "SIGTERM" as const,
      timeout: 5_000,
    },
  },
];

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: Number(process.env.PLAYWRIGHT_WORKERS || 1),
  // Login may intentionally wait for the one-minute API limiter window to
  // reset before reloading the dashboard. Keep the per-test budget above that
  // recovery path so a healthy reload is not reported as a timeout.
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    },
  },
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [
    {
      name: "public-desktop",
      testMatch: /(?:public|visual-public|accessibility-public)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        userAgent: `${devices["Desktop Chrome"].userAgent} ${e2eUserAgentMarker}`,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "public-mobile",
      testMatch: /(?:public|visual-public|accessibility-public)\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        userAgent: `${devices["Pixel 7"].userAgent} ${e2eUserAgentMarker}`,
      },
    },
    {
      name: "authenticated-desktop",
      testMatch:
        /(?:dashboard|accessibility|route-accessibility|dynamic-route-accessibility|filter-controls|visual-dashboard)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        userAgent: `${devices["Desktop Chrome"].userAgent} ${e2eUserAgentMarker}`,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "authenticated-mobile",
      testMatch:
        /(?:dashboard|accessibility|route-accessibility|dynamic-route-accessibility|filter-controls|visual-dashboard)\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        userAgent: `${devices["Pixel 7"].userAgent} ${e2eUserAgentMarker}`,
      },
    },
    {
      name: "authenticated-tablet",
      testMatch: /filter-controls\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        userAgent: `${devices["Desktop Chrome"].userAgent} ${e2eUserAgentMarker}`,
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
  webServer: webServers,
});
