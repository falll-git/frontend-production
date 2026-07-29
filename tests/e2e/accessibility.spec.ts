import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { login } from "./support/auth";

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n"),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
});

test("dashboard utama lulus pemeriksaan WCAG otomatis", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Assalamualaikum/i }),
  ).toBeVisible();
  await expect(page.getByTestId("dashboard-widgets-ready")).toBeAttached();
  await page.waitForLoadState("networkidle");
  await expectNoAccessibilityViolations(page);
});

test("Pusat Log Aktivitas lulus pemeriksaan WCAG otomatis", async ({ page }) => {
  await page.goto("/dashboard/activity-centre");
  await expect(
    page.getByRole("heading", { name: "Pusat Log Aktivitas" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectNoAccessibilityViolations(page);
});
