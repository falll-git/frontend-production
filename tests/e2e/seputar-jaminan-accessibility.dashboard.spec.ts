import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { login } from "./support/auth";
import { assertViewportAccessibilityContract } from "./support/accessibility-contract";

const screenshotOutputDir = process.env.SJ_SCREENSHOT_OUTPUT_DIR?.trim();

const moduleRoutes = [
  ["/dashboard/seputar-jaminan/profil", "Profil BPRS", "profil"],
  ["/dashboard/seputar-jaminan/kontak", "Kontak WhatsApp", "kontak"],
  ["/dashboard/seputar-jaminan/publikasi", "Daftar Publikasi", "publikasi"],
  ["/dashboard/seputar-jaminan/pengajuan", "Pengajuan", "pengajuan"],
  ["/dashboard/seputar-jaminan/pemeriksaan", "Pemeriksaan publikasi", "pemeriksaan"],
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
        await expect(
          page.getByRole("heading", { level: 1, name: heading, exact: true }),
        ).toBeVisible();
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
    await page.goto("/dashboard/seputar-jaminan/publikasi", {
      waitUntil: "domcontentloaded",
    });

    const detailOpener = page.getByRole("button", { name: /^Aksi publikasi / });
    await detailOpener.press("Enter");
    await page.getByRole("menuitem", { name: "Lihat detail", exact: true }).press("Enter");
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

    const createOpener = page.getByRole("button", { name: "Buat publikasi" });
    await expect(createOpener).toBeEnabled();
    await createOpener.press("Enter");
    const createDialog = page.getByRole("dialog", { name: "Buat publikasi baru" });
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

    await page.goto("/dashboard/seputar-jaminan/kontak", {
      waitUntil: "domcontentloaded",
    });
    const contactOpener = page.getByRole("button", { name: "Tambah kontak" });
    await expect(contactOpener).toBeEnabled();
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

    const submissionsEndpoint = "**/api/v1/seputar-jaminan/submissions?**";
    const { promise: resume, resolve: releaseRequest } = Promise.withResolvers<void>();
    await page.route(submissionsEndpoint, async (route) => {
      await resume;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Layanan uji sementara tidak tersedia." }),
      });
    });
    try {
      await page.goto("/dashboard/seputar-jaminan/pengajuan", {
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByText("Memuat pengajuan…", { exact: true }).first()).toBeVisible();
      await saveScreenshot(page, "state-loading-submission-mobile-390");
    } finally {
      releaseRequest();
    }
    await expect(page.getByText("Pengajuan belum dapat dimuat", { exact: true })).toBeVisible();
    await saveScreenshot(page, "state-error-submission-mobile-390");
    await page.unroute(submissionsEndpoint);

    await page.route(submissionsEndpoint, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            items: [],
            page_info: {
              limit: 20,
              has_more: false,
              next_cursor: null,
              count_scope: "CURRENT_PAGE",
              order: "SUBMITTED_AT_DESC_CREATED_AT_DESC_ID_DESC_KIND_ASC",
            },
          },
        }),
      });
    });
    await page.goto("/dashboard/seputar-jaminan/pengajuan", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText("Belum ada pengajuan", { exact: true }),
    ).toBeVisible();
    await saveScreenshot(page, "state-empty-submission-mobile-390");
    await page.unroute(submissionsEndpoint);

    await page.goto("/dashboard/seputar-jaminan/publikasi", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("textbox", { name: "Cari publikasi" }).fill(
      "DATA-YANG-TIDAK-ADA",
    );
    await expect(page.getByText("Publikasi tidak ditemukan")).toBeVisible();
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
    await page.goto("/dashboard/seputar-jaminan/pengajuan?view=pengiriman", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Masuk ke Ruwang Arsip" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buat publikasi" })).toHaveCount(0);
    await saveScreenshot(page, "state-permission-login-required-mobile-390");
    await expectNoPageOverflow(page);
  } finally {
    await context.close();
  }
});
