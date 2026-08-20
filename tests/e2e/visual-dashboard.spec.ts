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
  // Install every route override before authentication. The login flow may
  // hydrate /users/me immediately, so registering this fixture afterwards is
  // a race and can leave the real display name in the visual baseline.
  await installDashboardVisualFixtures(page);
  await login(page);
});

test("visual dashboard utama", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/dashboard");
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
