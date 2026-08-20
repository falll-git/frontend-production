import { expect, type Page } from "@playwright/test";

type TouchTargetFailure = {
  height: number;
  name: string;
  tag: string;
  width: number;
};

export async function assertViewportAccessibilityContract(
  page: Page,
  checkTouchTargets: boolean,
) {
  const result = await page.evaluate((shouldCheckTouchTargets) => {
    const documentOverflow =
      document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (!shouldCheckTouchTargets) {
      return { documentOverflow, touchTargetFailures: [] };
    }

    const selector = [
      "a[href]",
      "button:not([disabled])",
      'input:not([disabled]):not([type="hidden"])',
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[role="button"]:not([aria-disabled="true"])',
      '[role="link"]:not([aria-disabled="true"])',
    ].join(",");
    const failures = Array.from(document.querySelectorAll<HTMLElement>(selector))
      .flatMap((element): TouchTargetFailure[] => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          element.hidden ||
          element.closest('[aria-hidden="true"], [inert]') ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          return [];
        }

        if (element.tagName === "A" && style.display === "inline") {
          return [];
        }

        const inputType =
          element instanceof HTMLInputElement ? element.type : "";
        const associatedLabel =
          element instanceof HTMLInputElement && element.id
            ? document.querySelector<HTMLElement>(
                `label[for="${CSS.escape(element.id)}"]`,
              )
            : null;
        const labelledControl =
          ["checkbox", "radio"].includes(inputType) && associatedLabel
            ? associatedLabel
            : element;
        const targetRect = labelledControl?.getBoundingClientRect() ?? rect;
        if (targetRect.width >= 24 && targetRect.height >= 24) return [];

        return [
          {
            height: Math.round(targetRect.height),
            name:
              element.getAttribute("aria-label") ||
              element.textContent?.trim().slice(0, 80) ||
              element.getAttribute("name") ||
              "tanpa nama",
            tag: element.tagName.toLowerCase(),
            width: Math.round(targetRect.width),
          },
        ];
      });

    return { documentOverflow, touchTargetFailures: failures };
  }, checkTouchTargets);

  expect(
    result.documentOverflow,
    `Dokumen melebar ${result.documentOverflow}px di luar viewport`,
  ).toBeLessThanOrEqual(1);
  expect(
    result.touchTargetFailures,
    result.touchTargetFailures
      .map(
        (failure) =>
          `${failure.tag} "${failure.name}" ${failure.width}x${failure.height}px`,
      )
      .join("\n"),
  ).toEqual([]);
}
