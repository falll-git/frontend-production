import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { login } from "./support/auth";
import { assertViewportAccessibilityContract } from "./support/accessibility-contract";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("ruang-arsip.dashboard.sidebar-open", "1");
  });
  await login(page);
});

test("modul Seputar Jaminan menyatu dengan navigasi Ruwang", async (
  { page },
  testInfo,
) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard/seputar-jaminan/pengajuan?view=pengiriman", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Pengiriman" }),
  ).toBeVisible();

  const openMenuButton = page.getByRole("button", { name: "Buka menu" });
  const usesMenuDrawer = await openMenuButton.isVisible();
  if (usesMenuDrawer) await openMenuButton.click();

  const sidebar = page.locator("aside");
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Ringkasan", exact: true })).toHaveCount(0);
  await expect(sidebar.getByText("Ruwang Arsip", { exact: true })).toBeVisible();
  await expect(
    sidebar.getByText("Arsip dan operasional internal BPRS.", { exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByText("Seputar Jaminan", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    sidebar.getByText("Siapkan katalog aset untuk masyarakat.", {
      exact: true,
    }),
  ).toBeVisible();

  const rootMenus = await sidebar.locator(".sidebar-menu-item").allTextContents();
  expect(rootMenus.at(-1)?.trim()).toContain("Seputar Jaminan");

  if (usesMenuDrawer) {
    await page.getByRole("button", { name: "Tutup menu" }).click();
  }

  const routes = [
    ["/dashboard/seputar-jaminan/pengajuan?view=pengiriman", "Pengiriman"],
    ["/dashboard/seputar-jaminan/profil", "Profil BPRS"],
    ["/dashboard/seputar-jaminan/kontak", "Kontak WhatsApp"],
    ["/dashboard/seputar-jaminan/publikasi", "Daftar Publikasi"],
    ["/dashboard/seputar-jaminan/pengajuan", "Pengajuan"],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    path: testInfo.outputPath("seputar-jaminan-five-child-navigation.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("data pilot lokal tampil dan kontrol utama dapat digunakan", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/dashboard/seputar-jaminan/pengajuan?view=pengiriman", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Pemantauan pengiriman" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ringkasan publikasi" })).toHaveCount(0);
  await expect(page.getByText("Terhubung", { exact: true })).toBeVisible();

  await page.goto("/dashboard/seputar-jaminan/publikasi", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("button", { name: "Rumah tinggal dua lantai" }),
  ).toBeVisible();
  await expect(page.getByText("SJ-MDENGFCA", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Aksi publikasi / }).click();
  await page.getByRole("menuitem", { name: "Lihat detail", exact: true }).click();
  const detailDialog = page.getByRole("dialog", {
    name: "Rumah tinggal dua lantai",
  });
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog).toContainText("SJ-MDENGFCA");
  await expect(detailDialog).toContainText("Tayang");
  await expect(detailDialog).toContainText("Sudah tersambung");
  await detailDialog.getByRole("button", { name: "Tutup modal" }).click();
  await expect(detailDialog).toBeHidden();

  await page.getByRole("button", { name: "Buat katalog" }).click();
  const createDialog = page.getByRole("dialog", {
    name: "Buat publikasi baru",
  });
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByLabel("Sumber data")).toBeVisible();
  await createDialog.getByRole("button", { name: "Tutup modal" }).click();
  await expect(createDialog).toBeHidden();

  await page.goto("/dashboard/seputar-jaminan/pemeriksaan", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("Tidak ada pengajuan yang menunggu", { exact: true }),
  ).toBeVisible();

  await page.goto("/dashboard/seputar-jaminan/profil", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("BPRS Uji Integrasi", { exact: true })).toBeVisible();

  await page.goto("/dashboard/seputar-jaminan/kontak", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Marketing katalog", { exact: true })).toBeVisible();
  await expect(page.getByText("Berakhir 7890", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Tambah kontak" }).click();
  const contactDialog = page.getByRole("dialog", {
    name: "Tambah kontak WhatsApp",
  });
  await expect(contactDialog).toBeVisible();
  await contactDialog.getByRole("button", { name: "Batal" }).click();
  await expect(contactDialog).toBeHidden();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test("seluruh halaman modul memenuhi kontrak aksesibilitas", async (
  { page },
  testInfo,
) => {
  test.setTimeout(3 * 60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const routes = [
    "/dashboard/seputar-jaminan/pengajuan?view=pengiriman",
    "/dashboard/seputar-jaminan/profil",
    "/dashboard/seputar-jaminan/kontak",
    "/dashboard/seputar-jaminan/publikasi",
    "/dashboard/seputar-jaminan/pengajuan",
  ];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations
        .map((violation) => `${violation.id}: ${violation.help}`)
        .join("\n"),
    ).toEqual([]);

    await assertViewportAccessibilityContract(
      page,
      testInfo.project.name.includes("mobile"),
    );
  }
});
