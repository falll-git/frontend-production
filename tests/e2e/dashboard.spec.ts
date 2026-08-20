import { expect, test } from "@playwright/test";

import { login } from "./support/auth";
import {
  assertModalPresentation,
  closeModalWithEscapeAndRestoreFocus,
} from "./support/modal-contract";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("dashboard termuat tanpa overflow horizontal", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: /Assalamualaikum/i }),
  ).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("navigasi keyboard mencapai tombol utama dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Assalamualaikum/i }),
  ).toBeVisible();

  const skipLink = page.getByRole("link", { name: "Langsung ke konten utama" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dashboard-content")).toBeFocused();
});

test("modal aktivitas marketing memakai struktur detail yang konsisten", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Assalamualaikum/i }),
  ).toBeVisible();

  const activityRow = page
    .locator('[title="Double-click untuk melihat detail aktivitas"]')
    .first();
  await expect(activityRow).toBeVisible();
  const activityAction = activityRow.locator(
    '[data-setup-action-toggle="true"]',
  );
  await expect(activityAction).toBeVisible();
  await activityRow.dblclick();

  const detailDialog = page.getByRole("dialog", {
    name: /^Detail (Action Plan|Hasil Kunjungan|Langkah Penanganan)$/,
  });
  await assertModalPresentation(page, detailDialog);
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    detailDialog.getByRole("heading", {
      name: "Informasi Utama",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    detailDialog.getByRole("heading", {
      name: "Detail Aktivitas",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    detailDialog.locator("h3").filter({
      hasText: /^(?:Detail Action Plan|Detail Hasil Kunjungan|Detail Langkah Penanganan)$/,
    }),
  ).toBeVisible();
  await expect(
    detailDialog.getByRole("button", { name: "Tutup", exact: true }),
  ).toBeVisible();
  await closeModalWithEscapeAndRestoreFocus({
    page,
    dialog: detailDialog,
    trigger: activityAction,
  });
});
