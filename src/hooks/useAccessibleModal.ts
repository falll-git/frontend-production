"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type PreservedBackgroundState = {
  ariaHidden: string | null;
  hadInertAttribute: boolean;
  inert: boolean;
};

const modalStack: HTMLElement[] = [];
const preservedBackground = new Map<HTMLElement, PreservedBackgroundState>();
let backgroundObserver: MutationObserver | null = null;

function connectedModalStack() {
  return modalStack.filter((dialog) => dialog.isConnected);
}

function topmostModal() {
  return connectedModalStack().at(-1) ?? null;
}

function isTopmostModal(dialog: HTMLElement) {
  return topmostModal() === dialog;
}

function isNonInteractiveResource(element: HTMLElement) {
  return ["LINK", "SCRIPT", "STYLE"].includes(element.tagName);
}

function isPortalOwnedByDialog(element: HTMLElement, dialog: HTMLElement) {
  const controlledIds = [
    element.id,
    ...Array.from(element.querySelectorAll<HTMLElement>("[id]"), (item) =>
      item.id,
    ),
  ].filter(Boolean);

  return controlledIds.some((id) =>
    Array.from(dialog.querySelectorAll<HTMLElement>("[aria-controls]")).some(
      (controller) => controller.getAttribute("aria-controls") === id,
    ),
  );
}

function backgroundElementsFor(dialog: HTMLElement) {
  const background = new Set<HTMLElement>();
  let branch: HTMLElement =
    dialog.closest<HTMLElement>('[data-dashboard-overlay="true"]') ?? dialog;

  while (branch.parentElement) {
    const parent = branch.parentElement;

    for (const sibling of Array.from(parent.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === branch) continue;
      if (isNonInteractiveResource(sibling)) continue;
      if (isPortalOwnedByDialog(sibling, dialog)) continue;
      background.add(sibling);
    }

    if (parent === document.body) break;
    branch = parent;
  }

  return background;
}

function restoreBackgroundElement(element: HTMLElement) {
  const previous = preservedBackground.get(element);
  if (!previous) return;

  element.inert = previous.inert;
  if (previous.hadInertAttribute) {
    element.setAttribute("inert", "");
  } else {
    element.removeAttribute("inert");
  }
  if (previous.ariaHidden === null) {
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("aria-hidden", previous.ariaHidden);
  }
  preservedBackground.delete(element);
}

function syncBackgroundInteractivity() {
  const activeDialog = topmostModal();
  const nextBackground = activeDialog
    ? backgroundElementsFor(activeDialog)
    : new Set<HTMLElement>();

  for (const element of Array.from(preservedBackground.keys())) {
    if (!nextBackground.has(element)) restoreBackgroundElement(element);
  }

  for (const element of nextBackground) {
    if (!preservedBackground.has(element)) {
      preservedBackground.set(element, {
        ariaHidden: element.getAttribute("aria-hidden"),
        hadInertAttribute: element.hasAttribute("inert"),
        inert: element.inert,
      });
    }
    element.inert = true;
    element.setAttribute("inert", "");
    element.setAttribute("aria-hidden", "true");
  }
}

function registerModal(dialog: HTMLElement) {
  modalStack.push(dialog);
  syncBackgroundInteractivity();

  if (!backgroundObserver) {
    backgroundObserver = new MutationObserver(() => {
      syncBackgroundInteractivity();
    });
    backgroundObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

function unregisterModal(dialog: HTMLElement) {
  const index = modalStack.lastIndexOf(dialog);
  if (index >= 0) modalStack.splice(index, 1);
  syncBackgroundInteractivity();

  if (modalStack.length === 0 && backgroundObserver) {
    backgroundObserver.disconnect();
    backgroundObserver = null;
  }
}

function focusableElements(dialog: HTMLElement) {
  const browserProvidesLayout = dialog.getClientRects().length > 0;

  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) => {
      const style = window.getComputedStyle(element);
      const hasRenderedLayout =
        !browserProvidesLayout || element.getClientRects().length > 0;

      return (
        !element.hidden &&
        hasRenderedLayout &&
        element.tabIndex >= 0 &&
        element.getAttribute("aria-hidden") !== "true" &&
        element.getAttribute("aria-disabled") !== "true" &&
        !element.closest('[aria-hidden="true"], [inert]') &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    },
  );
}

type AccessibleModalOptions = {
  enabled?: boolean;
  closeDisabled?: boolean;
  initialFocusSelector?: string;
  returnFocusElement?: HTMLElement | null;
  onClose: () => void;
};

export default function useAccessibleModal<T extends HTMLElement = HTMLDivElement>({
  enabled = true,
  closeDisabled = false,
  initialFocusSelector,
  returnFocusElement,
  onClose,
}: AccessibleModalOptions) {
  const dialogRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  }, [closeDisabled, onClose]);

  useEffect(() => {
    if (!enabled || !dialogRef.current) return undefined;

    const dialog = dialogRef.current;
    const previousFocus =
      returnFocusElement ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    registerModal(dialog);
    const focusTimer = window.setTimeout(() => {
      const requestedFocus = initialFocusSelector
        ? dialog.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const firstFocusable = focusableElements(dialog)[0];
      (requestedFocus ?? firstFocusable ?? dialog).focus();
    }, 0);

    const trapTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !isTopmostModal(dialog)) return;
      const elements = focusableElements(dialog);
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusable = elements[0];
      const lastFocusable = elements[elements.length - 1];
      const activeElement = document.activeElement;

      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastFocusable : firstFocusable).focus();
      } else if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      trapTabKey(event);
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostModal(dialog)) return;

      if (event.key === "Escape") {
        if (!closeDisabledRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      trapTabKey(event);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopmostModal(dialog)) return;
      const target = event.target;
      if (target instanceof Node && dialog.contains(target)) return;

      (focusableElements(dialog)[0] ?? dialog).focus();
    };

    dialog.addEventListener("keydown", handleDialogKeyDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      window.clearTimeout(focusTimer);
      dialog.removeEventListener("keydown", handleDialogKeyDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("focusin", handleFocusIn, true);
      unregisterModal(dialog);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [enabled, initialFocusSelector, returnFocusElement]);

  return dialogRef;
}
