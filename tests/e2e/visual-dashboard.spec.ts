import { expect, test } from "@playwright/test";

import { login } from "./support/auth";
import { installDashboardVisualFixtures } from "./support/dashboard-visual";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "ruang-arsip.dashboard.sidebar-open",
      "0",
    );
  });
  await login(page);
});

test("visual dashboard utama", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installDashboardVisualFixtures(page);

  const dashboardDataPaths = [
    "/api/v1/legal/reports/third-party-documents",
    "/api/v1/legal/reports/third-party-deposit-funds",
    "/api/v1/debtor-reports/npf",
    "/api/v1/debtor-reports/marketing-activity",
    "/api/v1/storage-usage/summary",
  ];
  const dashboardDataReady = Promise.all(
    dashboardDataPaths.map((pathname) =>
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === pathname && response.ok(),
        { timeout: 30_000 },
      ),
    ),
  );

  await page.goto("/dashboard");
  await dashboardDataReady;
  await expect(
    page.getByRole("heading", { name: "Assalamualaikum, Admin Visual!" }),
  ).toBeVisible();
  await expect(page.getByText("DEBITUR CONTOH").first()).toBeVisible();
  await expect(page.getByTestId("dashboard-widgets-ready")).toBeAttached({
    timeout: 30_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () => {
      const firstHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      await page.waitForTimeout(250);
      const secondHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      return firstHeight === secondHeight;
    })
    .toBe(true);

  await expect(page).toHaveScreenshot("dashboard.png", {
    fullPage: true,
    mask: [
      page.getByTestId("dashboard-clock"),
      page.getByTestId("dashboard-copyright"),
    ],
  });
});
