import { expect, test } from "@playwright/test";

import { login } from "./support/auth";

test("Profil hanya menyediakan fitur ganti password", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/account/security");

  await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }),
  ).toContainText("Profil");
  await expect(
    page.getByRole("heading", { name: "Ganti password" }),
  ).toBeVisible();
  await expect(page.getByLabel("Password saat ini")).toBeVisible();
  await expect(page.getByLabel("Password baru", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Konfirmasi password baru")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ganti password" }),
  ).toBeVisible();

  await expect(page.getByText(/autentikasi dua faktor/i)).toHaveCount(0);
  await expect(page.getByText(/sesi aktif/i)).toHaveCount(0);
  await expect(page.getByText(/perangkat ini/i)).toHaveCount(0);
});
