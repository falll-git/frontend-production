import { expect, test, type Page, type Response } from "@playwright/test";

import { login } from "./support/auth";
import { trackApiRateLimit } from "./support/rate-limit";
import { discoverStaticDashboardRoutes } from "./support/routes";

const routes = discoverStaticDashboardRoutes();

const CONTROL_SELECTOR = [
  '[data-ui-control="select"]',
  '[data-ui-control="date"].app-input',
  '[data-ui-control="date"] > button',
  '[data-ui-control="search"] input',
  '[data-ui-control="searchable-select"] > button',
  '.setup-filter-card input:not([type="hidden"])',
  '.setup-filter-card select',
].join(",");

type LayoutFailure = {
  details: string;
  route: string;
};

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

test.use({ video: "off" });

test("kontrol sorting, filter, dan tanggal tetap rapi pada seluruh route statis", async ({
  page,
}, testInfo) => {
  test.setTimeout(12 * 60_000);
  expect(routes.length).toBeGreaterThan(50);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  const rateLimitBudget = trackApiRateLimit(page);
  const failures: LayoutFailure[] = [];

  for (const route of routes) {
    try {
      await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(500);

      const layout = await page.evaluate((selector) => {
        const viewportWidth = document.documentElement.clientWidth;
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>(selector),
        )
          .filter((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              height: rect.height,
              label:
                element.getAttribute("aria-label") ||
                element.id ||
                element.getAttribute("data-ui-control") ||
                element.tagName.toLowerCase(),
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
            };
          });

        const tightPairs: string[] = [];
        for (let index = 0; index < controls.length; index += 1) {
          for (let nextIndex = index + 1; nextIndex < controls.length; nextIndex += 1) {
            const first = controls[index];
            const second = controls[nextIndex];
            const verticalOverlap =
              Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
            if (verticalOverlap < Math.min(first.height, second.height) * 0.5) continue;

            const horizontalGap =
              first.right <= second.left
                ? second.left - first.right
                : second.right <= first.left
                  ? first.left - second.right
                  : -1;
            if (horizontalGap >= 0 && horizontalGap < 8) {
              tightPairs.push(`${first.label} <> ${second.label}: ${horizontalGap.toFixed(1)}px`);
            }
          }
        }

        return {
          controls,
          documentClientWidth: viewportWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          tightPairs,
        };
      }, CONTROL_SELECTOR);

      const invalidControls = layout.controls.filter(
        (control) =>
          control.height < 40 ||
          control.left < -1 ||
          control.right > layout.documentClientWidth + 1 ||
          control.width <= 0,
      );

      if (layout.documentScrollWidth > layout.documentClientWidth + 1) {
        failures.push({
          route,
          details: `Dokumen overflow horizontal: ${layout.documentScrollWidth}px > ${layout.documentClientWidth}px`,
        });
      }
      if (invalidControls.length > 0) {
        failures.push({
          route,
          details: `Kontrol keluar viewport/terlalu kecil: ${JSON.stringify(invalidControls)}`,
        });
      }
      if (layout.tightPairs.length > 0) {
        failures.push({
          route,
          details: `Jarak antarkontrol kurang dari 8px: ${layout.tightPairs.join(", ")}`,
        });
      }

      const popupTriggers = page.locator(
        '[data-ui-control="date"] > button[aria-haspopup="dialog"], [data-ui-control="searchable-select"] > button[aria-haspopup="listbox"]',
      );
      const popupTriggerCount = await popupTriggers.count();

      for (let index = 0; index < popupTriggerCount; index += 1) {
        const trigger = popupTriggers.nth(index);
        if (!(await trigger.isVisible()) || !(await trigger.isEnabled())) continue;

        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();

        const popupId = await trigger.getAttribute("aria-controls");
        expect(popupId).toBeTruthy();
        const popup = page.locator(`[id="${popupId!.replaceAll('"', '\\"')}"]`);
        await expect(popup).toBeVisible();
        const popupLayout = await popup.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
          };
        });

        if (
          popupLayout.left < -1 ||
          popupLayout.top < -1 ||
          popupLayout.right > popupLayout.viewportWidth + 1 ||
          popupLayout.bottom > popupLayout.viewportHeight + 1
        ) {
          failures.push({
            route,
            details: `Popup keluar viewport: ${JSON.stringify(popupLayout)}`,
          });
        }

        await page.keyboard.press("Escape");
        await expect(popup).toBeHidden();
      }
    } catch (error) {
      failures.push({
        route,
        details: error instanceof Error ? error.message : "Route gagal diperiksa",
      });
    }

    await rateLimitBudget.waitForCapacity();
  }

  await rateLimitBudget.waitForCapacity(100);
  rateLimitBudget.dispose();

  if (failures.length > 0) {
    await testInfo.attach("filter-layout-failures", {
      body: JSON.stringify(failures, null, 2),
      contentType: "application/json",
    });
  }

  expect(
    failures,
    failures.map((failure) => `${failure.route}: ${failure.details}`).join("\n"),
  ).toEqual([]);
});

test("kontrol sorting dan filter pada detail debitur dinamis tetap di dalam viewport", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
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
  await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(750);

  const layout = await page.evaluate((selector) => {
    const clientWidth = document.documentElement.clientWidth;
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    )
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          height: rect.height,
          label: element.getAttribute("aria-label") || element.id || element.tagName,
          left: rect.left,
          right: rect.right,
        };
      });

    return {
      clientWidth,
      controls,
      scrollWidth: document.documentElement.scrollWidth,
    };
  }, CONTROL_SELECTOR);

  const debtorDetailLayout = await page.evaluate(() => {
    const monthFilter = document.querySelector<HTMLElement>(
      '[aria-label="Filter bulan dan tahun"]',
    );
    const historySort = document.querySelector<HTMLElement>(
      '[aria-label="Urutan histori"]',
    );
    const primaryDetails = document.querySelector<HTMLElement>(
      '[data-ui-layout="debtor-primary-details"]',
    );
    const incompleteRows: Array<{ index: number; ratio: number }> = [];

    document
      .querySelectorAll<HTMLElement>('[data-ui-layout="compact-info-list"]')
      .forEach((list, listIndex) => {
        const listRect = list.getBoundingClientRect();
        const rows = new Map<number, DOMRect[]>();

        Array.from(list.children).forEach((child) => {
          const rect = child.getBoundingClientRect();
          const rowKey = Math.round(rect.top);
          rows.set(rowKey, [...(rows.get(rowKey) ?? []), rect]);
        });

        rows.forEach((row) => {
          if (row.length !== 1 || listRect.width <= 0) return;
          const ratio = row[0].width / listRect.width;
          if (ratio < 0.9) incompleteRows.push({ index: listIndex, ratio });
        });
      });

    if (!monthFilter || !historySort || !primaryDetails) {
      return {
        controlsFound: false,
        gutter: -1,
        incompleteRows,
        primaryDetailsAlignItems: null,
      };
    }

    const monthRect = monthFilter.getBoundingClientRect();
    const sortRect = historySort.getBoundingClientRect();
    const sameRow = Math.abs(monthRect.top - sortRect.top) <= 2;

    return {
      controlsFound: true,
      gutter: sameRow
        ? sortRect.left - monthRect.right
        : sortRect.top - monthRect.bottom,
      incompleteRows,
      primaryDetailsAlignItems: getComputedStyle(primaryDetails).alignItems,
    };
  });

  expect(layout.controls.length).toBeGreaterThan(0);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(
    layout.controls.filter(
      (control) =>
        control.height < 40 ||
        control.left < -1 ||
      control.right > layout.clientWidth + 1,
    ),
  ).toEqual([]);
  expect(debtorDetailLayout.controlsFound).toBe(true);
  expect(debtorDetailLayout.gutter).toBeGreaterThanOrEqual(12);
  expect(debtorDetailLayout.incompleteRows).toEqual([]);
  expect(debtorDetailLayout.primaryDetailsAlignItems).toBe("flex-start");
});
