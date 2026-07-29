import { expect, type Page } from "@playwright/test";

import { trackApiRateLimit } from "./rate-limit";

export async function login(page: Page) {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "E2E_USERNAME dan E2E_PASSWORD wajib diisi untuk pengujian dashboard.",
    );
  }

  const rateLimitBudget = trackApiRateLimit(page);

  try {
    await page.goto("/");
    await page.getByLabel("Username").fill(username);
    await page.locator("input#password").fill(password);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /Assalamualaikum/i }),
    ).toBeVisible();

    await rateLimitBudget.waitForObservation();
    const waitedForReset = await rateLimitBudget.waitForCapacity(100);
    if (waitedForReset) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: /Assalamualaikum/i }),
      ).toBeVisible();
    }

  } finally {
    rateLimitBudget.dispose();
  }
}
