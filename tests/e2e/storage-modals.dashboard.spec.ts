import { expect, test } from "@playwright/test";

import { login } from "./support/auth";
import {
  assertModalPresentation,
  assertNoHorizontalOverflow,
} from "./support/modal-contract";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("drill-down tempat penyimpanan memakai satu modal konsisten", async ({
  page,
}) => {
  await page.goto(
    "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
    { waitUntil: "domcontentloaded" },
  );

  await page.getByRole("button", { name: "Lihat Lemari", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await assertModalPresentation(page, page.getByRole("dialog"));
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Tutup modal" }),
  ).toBeVisible();

  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lihat Rak", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await assertModalPresentation(page, page.getByRole("dialog"));
  await expect(
    page.getByRole("dialog").getByRole("button", {
      name: "Lihat Dokumen",
      exact: true,
    }),
  ).toBeVisible();

  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lihat Dokumen", exact: true })
    .first()
    .click();
  const documentDialog = page.getByRole("dialog");
  await expect(documentDialog).toHaveCount(1);
  await assertModalPresentation(page, documentDialog);
  await expect(
    documentDialog.getByPlaceholder("Cari dokumen..."),
  ).toBeVisible();

  await assertNoHorizontalOverflow(page, documentDialog);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
