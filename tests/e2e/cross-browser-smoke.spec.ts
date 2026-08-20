import { expect, test } from "@playwright/test";

import { login } from "./support/auth";
import {
  assertModalPresentation,
  closeModalWithEscapeAndRestoreFocus,
} from "./support/modal-contract";

test("form publik dan autentikasi bekerja pada engine browser alternatif", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Masuk ke Ruwang Arsip" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.locator("input#password")).toBeVisible();

  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /Assalamualaikum/i }),
  ).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("navigasi dan modal dashboard bekerja pada engine browser alternatif", async ({
  page,
}) => {
  await login(page);

  const skipLink = page.getByRole("link", {
    name: "Langsung ke konten utama",
  });
  await skipLink.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dashboard-content")).toBeFocused();

  const activityRow = page
    .locator('[title="Double-click untuk melihat detail aktivitas"]')
    .first();
  await expect(activityRow).toBeVisible();
  const trigger = activityRow.locator('[data-setup-action-toggle="true"]');
  await activityRow.dblclick();

  const dialog = page.getByRole("dialog", {
    name: /^Detail (Action Plan|Hasil Kunjungan|Langkah Penanganan)$/,
  });
  await assertModalPresentation(page, dialog);
  await closeModalWithEscapeAndRestoreFocus({ page, dialog, trigger });
});
