import { expect, test } from "@playwright/test";

import { login } from "./support/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /Assalamualaikum/i }),
  ).toBeVisible();
});

test("modal progress pihak ketiga membuka detail record melalui aksi dan double-click", async ({
  page,
}) => {
  await page.getByTitle("Lihat laporan Notaris").click();

  const summaryHeading = page.getByRole("heading", {
    name: "Progress Pihak Ketiga - Notaris",
    exact: true,
  });
  const summaryDialog = page.getByRole("dialog", {
    name: "Progress Pihak Ketiga - Notaris",
    exact: true,
  });
  await expect(summaryHeading).toBeVisible();

  const detailRow = summaryDialog.getByTitle(
    "Double-click untuk melihat detail Notaris",
  );
  await expect(detailRow.first()).toBeVisible();

  const actionButton = summaryDialog
    .getByRole("button", { name: /Buka aksi Notaris/i })
    .first();
  await expect(actionButton).toBeVisible();
  await actionButton.click();
  await page.getByRole("menuitem", { name: "Detail", exact: true }).click();

  const detailDialog = page.getByRole("dialog", {
    name: "Detail Progress Notaris",
    exact: true,
  });
  await expect(detailDialog).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    detailDialog.getByText("Kontrak dan Pihak Ketiga"),
  ).toBeVisible();
  await detailDialog.getByRole("button", { name: "Tutup", exact: true }).click();

  await expect(summaryHeading).toBeVisible();
  await detailRow.first().dblclick();
  await expect(detailDialog).toBeVisible();
});

test("modal dana titipan membuka detail ledger melalui aksi dan double-click", async ({
  page,
}) => {
  await page.getByTitle("Lihat Titipan Notaris").click();

  const summaryHeading = page.getByRole("heading", {
    name: "Titipan Notaris",
    exact: true,
  });
  const summaryDialog = page.getByRole("dialog", {
    name: "Titipan Notaris",
    exact: true,
  });
  await expect(summaryHeading).toBeVisible();

  const detailRow = summaryDialog.getByTitle(
    "Double-click untuk melihat detail dana titipan",
  );
  await expect(detailRow.first()).toBeVisible();

  const actionButton = summaryDialog
    .getByRole("button", { name: /Buka aksi dana titipan/i })
    .first();
  await expect(actionButton).toBeVisible();

  await detailRow.first().dblclick();
  const detailDialog = page.getByRole("dialog", {
    name: "Detail Dana Titipan",
    exact: true,
  });
  await expect(detailDialog).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(detailDialog.getByText("Relasi Titipan")).toBeVisible();
  await expect(detailDialog.getByText("Riwayat Transaksi")).toBeVisible();
  await detailDialog.getByRole("button", { name: "Tutup", exact: true }).click();

  await expect(summaryHeading).toBeVisible();
  await actionButton.click();
  await page.getByRole("menuitem", { name: "Detail", exact: true }).click();
  await expect(detailDialog).toBeVisible();
});
