import { expect, test } from "@playwright/test";

test("visual halaman login", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Masuk ke Ruwang Arsip" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot("login.png", { fullPage: true });
});

test("visual halaman tidak ditemukan", async ({ page }) => {
  await page.goto("/halaman-yang-tidak-ada");
  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
  ).toBeVisible();

  await expect(page).toHaveScreenshot("not-found.png", { fullPage: true });
});
