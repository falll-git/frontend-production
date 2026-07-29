import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Response } from "@playwright/test";

import { login } from "./support/auth";

function findFirstEntityId(value: unknown, depth = 0): string | null {
  if (depth > 8 || value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      if (
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item) &&
        typeof (item as Record<string, unknown>).id === "string"
      ) {
        return (item as Record<string, string>).id;
      }
    }

    for (const item of value) {
      const nestedId = findFirstEntityId(item, depth + 1);
      if (nestedId) return nestedId;
    }

    return null;
  }

  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const key of ["items", "data", "rows", "results"]) {
    const nestedId = findFirstEntityId(record[key], depth + 1);
    if (nestedId) return nestedId;
  }

  for (const nestedValue of Object.values(record)) {
    const nestedId = findFirstEntityId(nestedValue, depth + 1);
    if (nestedId) return nestedId;
  }

  return null;
}

async function assertAccessible(page: Page) {
  await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

async function captureEntityId(
  page: Page,
  sourceRoute: string,
  responsePredicate: (response: Response) => boolean,
) {
  const [response] = await Promise.all([
    page.waitForResponse(responsePredicate, { timeout: 20_000 }),
    page.goto(sourceRoute, { waitUntil: "domcontentloaded" }),
  ]);
  const id = findFirstEntityId(await response.json());
  expect(id, `Data seed untuk ${sourceRoute} harus tersedia`).toBeTruthy();
  return id as string;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
});

test("detail debitur dari data seed lulus accessibility otomatis", async ({ page }) => {
  const debtorId = await captureEntityId(
    page,
    "/dashboard/informasi-debitur",
    (response) =>
      response.ok() &&
      response.request().method() === "GET" &&
      /\/debtors(?:\?|$)/.test(response.url()),
  );

  await page.goto(`/dashboard/informasi-debitur/${debtorId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/dashboard/informasi-debitur/${debtorId}$`));
  await assertAccessible(page);
});

test("detail kantor dari data seed lulus accessibility otomatis", async ({ page }) => {
  const officeId = await captureEntityId(
    page,
    "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan",
    (response) =>
      response.ok() &&
      response.request().method() === "GET" &&
      /\/digital-archives\/storage\/offices(?:\?|$)/.test(response.url()),
  );

  await page.goto(
    `/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan/${officeId}`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan/${officeId}$`),
  );
  await assertAccessible(page);
});
