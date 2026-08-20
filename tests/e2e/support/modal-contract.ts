import { expect, type Locator, type Page } from "@playwright/test";

export async function assertNoHorizontalOverflow(
  page: Page,
  dialog?: Locator,
) {
  const documentOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(1);

  if (!dialog) return;

  const overflow = await dialog.evaluate((element) => {
    const body = element.querySelector<HTMLElement>(".dashboard-modal__body");
    return {
      dialog: element.scrollWidth - element.clientWidth,
      body: body ? body.scrollWidth - body.clientWidth : 0,
    };
  });

  expect(overflow.dialog).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

export async function assertModalPresentation(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  await assertNoHorizontalOverflow(page, dialog);

  expect(
    await dialog.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);

  const undersizedControls = await dialog
    .locator("button,[role='button'],a[href],input,select,textarea")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })
        .map((element) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          const associatedLabel =
            node instanceof HTMLInputElement ||
            node instanceof HTMLSelectElement ||
            node instanceof HTMLTextAreaElement
              ? node.labels?.[0]
              : node.closest("label");
          const labelRect = associatedLabel?.getBoundingClientRect();
          return {
            label:
              node.getAttribute("aria-label") ||
              node.textContent?.trim() ||
              node.tagName,
            width: rect.width,
            height: rect.height,
            associatedTargetIsLarge: Boolean(
              labelRect && labelRect.width >= 44 && labelRect.height >= 44,
            ),
          };
        })
        .filter(
          ({ width, height, associatedTargetIsLarge }) =>
            !associatedTargetIsLarge && (width < 44 || height < 44),
        ),
    );

  expect(undersizedControls).toEqual([]);

  const focusTrail: unknown[] = [];
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    const focusState = await dialog.evaluate((element) => {
      const active = document.activeElement as HTMLElement | null;
      return {
        inside: Boolean(active && element.contains(active)),
        active: active
          ? {
              tag: active.tagName,
              text: active.textContent?.trim().slice(0, 80) ?? "",
              ariaLabel: active.getAttribute("aria-label"),
              role: active.getAttribute("role"),
            }
          : null,
      };
    });
    focusTrail.push(focusState.active);
    if (!focusState.inside) {
      const visibleCandidates = await dialog
        .locator("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const node = element as HTMLElement;
              const rect = node.getBoundingClientRect();
              const style = window.getComputedStyle(node);
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                node.tabIndex >= 0
              );
            })
            .map((element) => ({
              tag: element.tagName,
              text: element.textContent?.trim().slice(0, 80) ?? "",
              ariaLabel: element.getAttribute("aria-label"),
              tabIndex: (element as HTMLElement).tabIndex,
            })),
        );
      throw new Error(
        `Fokus keluar dari modal setelah Tab ke-${index + 1}. Jejak: ${JSON.stringify(focusTrail)}. Kandidat terlihat: ${JSON.stringify(visibleCandidates)}`,
      );
    }
  }

  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);
}

export async function closeModalWithEscapeAndRestoreFocus({
  page,
  dialog,
  trigger,
}: {
  page: Page;
  dialog: Locator;
  trigger: Locator;
}) {
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}
