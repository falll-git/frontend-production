const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  return (
    !element.hidden &&
    element.getAttribute("aria-hidden") !== "true" &&
    !element.closest('[aria-hidden="true"], [inert]') &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

export function focusAdjacentToElement(
  reference: HTMLElement,
  direction: 1 | -1,
  excludedRoot?: HTMLElement | null,
) {
  const focusable = Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      isVisible(element) &&
      (!excludedRoot || !excludedRoot.contains(element)),
  );
  const currentIndex = focusable.indexOf(reference);
  const target = focusable[currentIndex + direction] ?? reference;

  window.setTimeout(() => target.focus(), 0);
}
