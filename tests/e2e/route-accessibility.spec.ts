import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { login } from "./support/auth";
import { trackApiRateLimit } from "./support/rate-limit";
import { discoverStaticDashboardRoutes } from "./support/routes";

const routes = discoverStaticDashboardRoutes();

test.use({ video: "off" });

test("seluruh route dashboard statis lulus accessibility otomatis", async ({
  page,
}, testInfo) => {
  test.setTimeout(12 * 60_000);
  expect(routes.length).toBeGreaterThan(50);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  const rateLimitBudget = trackApiRateLimit(page);
  const failures: Array<{
    route: string;
    violations: Array<{ id: string; help: string; targets: string[] }>;
  }> = [];

  for (const route of routes) {
    try {
      await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(750);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      if (results.violations.length > 0) {
        failures.push({
          route,
          violations: results.violations.map((violation) => ({
            id: violation.id,
            help: violation.help,
            targets: violation.nodes.flatMap((node) =>
              node.target.map((target) => String(target)),
            ),
          })),
        });
      }
    } catch (error) {
      failures.push({
        route,
        violations: [
          {
            id: "route-load",
            help: error instanceof Error ? error.message : "Route gagal dimuat",
            targets: [],
          },
        ],
      });
    }

    await rateLimitBudget.waitForCapacity();
  }

  await rateLimitBudget.waitForCapacity(100);
  rateLimitBudget.dispose();

  if (failures.length > 0) {
    await testInfo.attach("a11y-failures", {
      body: JSON.stringify(failures, null, 2),
      contentType: "application/json",
    });
  }

  expect(
    failures,
    failures
      .flatMap((failure) => [
        `Route: ${failure.route}`,
        ...failure.violations.map(
          (violation) =>
            `${violation.id}: ${violation.help} [${violation.targets.join(", ")}]`,
        ),
      ])
      .join("\n"),
  ).toEqual([]);
});
