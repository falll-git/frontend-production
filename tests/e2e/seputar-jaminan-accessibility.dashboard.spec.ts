import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { login } from "./support/auth";
import { assertViewportAccessibilityContract } from "./support/accessibility-contract";

const screenshotOutputDir = process.env.SJ_SCREENSHOT_OUTPUT_DIR?.trim();

const moduleRoutes = [
  ["/dashboard/seputar-jaminan", "Pusat publikasi aset", "dashboard"],
  ["/dashboard/seputar-jaminan/katalog", "Katalog aset", "katalog"],
  [
    "/dashboard/seputar-jaminan/pemeriksaan",
    "Pemeriksaan publikasi",
    "pemeriksaan",
  ],
  [
    "/dashboard/seputar-jaminan/profil-kontak",
    "Profil BPRS & kontak",
    "profil-kontak",
  ],
] as const;

const viewports = [
  ["desktop-1440", 1440, 900],
  ["laptop-1366", 1366, 768],
  ["tablet-portrait", 768, 1024],
  ["tablet-landscape", 1024, 768],
  ["mobile-320", 320, 720],
  ["mobile-390", 390, 844],
  ["mobile-430", 430, 932],
  ["zoom-200-equivalent", 640, 450],
] as const;

async function saveScreenshot(page: Page, name: string) {
  if (!screenshotOutputDir) return;
  mkdirSync(screenshotOutputDir, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotOutputDir, `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

async function expectNoPageOverflow(page: Page) {
  const measurements = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  expect(measurements.body).toBeLessThanOrEqual(1);
  expect(measurements.document).toBeLessThanOrEqual(1);
}

test.describe("quality gate visual dan aksesibilitas Seputar Jaminan", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "authenticated-desktop",
      "Matriks viewport dijalankan satu kali dan mengubah viewport secara eksplisit.",
    );
    await page.addInitScript(() => {
      window.sessionStorage.setItem("ruang-arsip.dashboard.sidebar-open", "1");
    });
    await login(page);
  });

  test("seluruh halaman reflow pada setiap viewport", async ({ page }) => {
    test.setTimeout(8 * 60_000);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const [viewportName, width, height] of viewports) {
      await page.setViewportSize({ width, height });

      for (const [route, heading, routeName] of moduleRoutes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: heading })).toBeVisible();
        await expect(page.locator("main")).toBeVisible();
        await expectNoPageOverflow(page);

        const infiniteMotion = await page.locator("body *").evaluateAll((nodes) =>
          nodes.filter((node) => {
            const style = window.getComputedStyle(node);
            return (
              style.animationIterationCount === "infinite" &&
              style.animationDuration !== "0s"
            );
          }).length,
        );
        expect(infiniteMotion).toBe(0);

        if (width <= 430) {
          await assertViewportAccessibilityContract(page, true);
        }

        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          axe.violations,
          axe.violations
            .map((violation) => `${violation.id}: ${violation.help}`)
            .join("\n"),
        ).toEqual([]);

        await saveScreenshot(page, `${viewportName}-${routeName}`);
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/storage-usage", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("main")).toBeVisible();
    await saveScreenshot(page, "ruwang-comparison-storage-usage-desktop");
  });

  test("modal mengunci scroll dan mengembalikan fokus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/seputar-jaminan/katalog", {
      waitUntil: "domcontentloaded",
    });

    const detailOpener = page.getByRole("button", { name: "Lihat detail" });
    await detailOpener.press("Enter");
    const detailDialog = page.getByRole("dialog", {
      name: "Rumah tinggal dua lantai",
    });
    await expect(detailDialog).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe(
      "hidden",
    );
    await saveScreenshot(page, "mobile-390-detail-modal");
    await page.keyboard.press("Escape");
    await expect(detailDialog).toBeHidden();
    await expect(detailOpener).toBeFocused();

    const createOpener = page.getByRole("button", { name: "Buat katalog" });
    await createOpener.press("Enter");
    const createDialog = page.getByRole("dialog", { name: "Buat katalog baru" });
    await expect(createDialog).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe(
      "hidden",
    );
    await page.keyboard.press("Tab");
    const focusInsideCreate = await createDialog.evaluate((dialog) =>
      dialog.contains(document.activeElement),
    );
    expect(focusInsideCreate).toBe(true);
    await saveScreenshot(page, "mobile-390-create-modal");
    await page.keyboard.press("Escape");
    await expect(createDialog).toBeHidden();
    await expect(createOpener).toBeFocused();

    await page.goto("/dashboard/seputar-jaminan/profil-kontak", {
      waitUntil: "domcontentloaded",
    });
    const contactOpener = page.getByRole("button", { name: "Tambah kontak" });
    await contactOpener.press("Enter");
    const contactDialog = page.getByRole("dialog", {
      name: "Tambah kontak WhatsApp",
    });
    await expect(contactDialog).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe(
      "hidden",
    );
    await saveScreenshot(page, "mobile-390-contact-modal");
    await page.keyboard.press("Escape");
    await expect(contactDialog).toBeHidden();
    await expect(contactOpener).toBeFocused();
  });

  test("loading, empty, error, dan tanpa hasil tetap terbaca", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.route("**/api/v1/seputar-jaminan/dashboard", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await route.continue();
    });
    await page.goto("/dashboard/seputar-jaminan", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("Memuat ringkasan publikasi…")).toBeVisible();
    await saveScreenshot(page, "state-loading-dashboard-mobile-390");
    await expect(page.getByText("Memuat ringkasan publikasi…")).toBeHidden();
    await page.unroute("**/api/v1/seputar-jaminan/dashboard");

    await page.route("**/api/v1/seputar-jaminan/dashboard", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Layanan uji sementara tidak tersedia." }),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Ringkasan belum dapat dimuat")).toBeVisible();
    await saveScreenshot(page, "state-error-dashboard-mobile-390");
    await page.unroute("**/api/v1/seputar-jaminan/dashboard");

    await page.goto("/dashboard/seputar-jaminan/pemeriksaan", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText("Tidak ada pengajuan yang menunggu", { exact: true }),
    ).toBeVisible();
    await saveScreenshot(page, "state-empty-review-mobile-390");

    await page.goto("/dashboard/seputar-jaminan/katalog", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("textbox", { name: "Cari katalog" }).fill(
      "DATA-YANG-TIDAK-ADA",
    );
    await expect(page.getByText("Katalog tidak ditemukan")).toBeVisible();
    await saveScreenshot(page, "state-no-result-catalog-mobile-390");
    await expectNoPageOverflow(page);
  });
});

test("halaman SJ meminta autentikasi sebelum memberi akses", async (
  { browser },
  testInfo,
) => {
  test.skip(
    testInfo.project.name !== "authenticated-desktop",
    "State tanpa izin cukup dibuktikan satu kali.",
  );
  const context = await browser.newContext({
    locale: "id-ID",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    await page.goto("/dashboard/seputar-jaminan", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Masuk ke Ruwang Arsip" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buat katalog" })).toHaveCount(0);
    await saveScreenshot(page, "state-permission-login-required-mobile-390");
    await expectNoPageOverflow(page);
  } finally {
    await context.close();
  }
});
