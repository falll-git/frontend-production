import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n"),
  ).toEqual([]);
}

test("login lulus pemeriksaan WCAG otomatis", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Masuk ke Ruwang Arsip" }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("lupa password lulus pemeriksaan WCAG otomatis", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/forgot-password");
  await expect(
    page.getByRole("heading", { name: "Lupa Password?" }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("set password tanpa token lulus pemeriksaan WCAG otomatis", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/set-password");
  await expect(
    page.getByRole("heading", { name: "Link Aktivasi Tidak Valid" }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("reset password tanpa token lulus pemeriksaan WCAG otomatis", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/reset-password");
  await expect(
    page.getByRole("heading", { name: "Link Reset Tidak Valid" }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});
