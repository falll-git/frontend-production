"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export type SetupActionTone = "blue" | "emerald" | "amber" | "red" | "gray";

export type SetupActionMenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone?: SetupActionTone;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
};

type ActionMenuPosition = {
  top: number;
  left: number;
  width: number;
};

type SetupActionMenuProps = {
  items: SetupActionMenuItem[];
  label?: string;
  menuLabel?: string;
};

const ACTION_ICON_BUTTON_CLASS =
  "inline-flex min-h-11 w-full flex-shrink-0 items-center justify-start gap-2 bg-white px-3 py-2 text-left text-sm font-medium leading-5 transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-[rgba(21,126,195,0.16)] disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50";

const ACTION_MORE_BUTTON_CLASS =
  "inline-flex size-11 items-center justify-center rounded-lg border border-[rgba(21,126,195,0.42)] bg-white text-gray-600 shadow-sm transition-colors hover:border-[rgba(21,126,195,0.65)] hover:bg-[rgba(21,126,195,0.06)] hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(21,126,195,0.16)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const ACTION_TONE_CLASS: Record<SetupActionTone, string> = {
  blue: "text-gray-700 hover:bg-blue-50 hover:text-gray-900",
  emerald: "text-gray-700 hover:bg-emerald-50 hover:text-gray-900",
  amber: "text-gray-700 hover:bg-amber-50 hover:text-gray-900",
  red: "text-red-700 hover:bg-red-50 hover:text-red-800 focus:ring-red-100 [&>svg]:text-red-600",
  gray: "text-gray-600 hover:bg-gray-50 hover:text-gray-800",
};

function getPreferredMenuWidth(items: SetupActionMenuItem[]) {
  if (items.length === 0) return 44;

  const longestLabelLength = items.reduce(
    (maxLength, item) => Math.max(maxLength, item.label.trim().length),
    0,
  );

  return Math.min(272, Math.max(184, longestLabelLength * 7.5 + 64));
}

function getMenuHeight(items: SetupActionMenuItem[], menuWidth: number) {
  const availableTextWidth = Math.max(80, menuWidth - 64);
  const itemHeight = items.reduce((height, item) => {
    const estimatedTextWidth = item.label.trim().length * 7.5;
    const lineCount = Math.max(1, Math.ceil(estimatedTextWidth / availableTextWidth));
    return height + Math.max(44, lineCount * 20 + 16);
  }, 0);

  return Math.max(46, itemHeight + 12);
}

function getGroupedActionButtonClass(
  index: number,
  total: number,
  tone: SetupActionTone,
) {
  return [
    ACTION_ICON_BUTTON_CLASS,
    index === 0 ? "rounded-t-md" : "",
    index === total - 1 ? "rounded-b-md" : "",
    ACTION_TONE_CLASS[tone],
  ]
    .filter(Boolean)
    .join(" ");
}

function getActionMenuPosition(
  trigger: HTMLButtonElement,
  menuWidth: number,
  menuHeight: number,
): ActionMenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gutter = 12;
  const gap = 8;
  const width = Math.min(menuWidth, Math.max(44, window.innerWidth - gutter * 2));
  const maxLeft = window.innerWidth - width - gutter;
  const left = Math.max(gutter, Math.min(rect.right - width, maxLeft));
  const bottomTop = rect.bottom + gap;
  const top =
    bottomTop + menuHeight > window.innerHeight - gutter
      ? Math.max(gutter, rect.top - menuHeight - gap)
      : bottomTop;

  return { top, left, width };
}

export default function SetupActionMenu({
  items,
  label = "Buka aksi",
  menuLabel = "Aksi data",
}: SetupActionMenuProps) {
  const menuId = useId();
  const activeItems = items.filter((item) => !item.disabled);
  const menuWidth = getPreferredMenuWidth(activeItems);
  const menuHeight = getMenuHeight(activeItems, menuWidth);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ActionMenuPosition | null>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
    setIsOpen(false);
    setPosition(null);
  }, []);

  const getMenuItems = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
      ),
    [],
  );

  const focusAdjacentToTrigger = useCallback((direction: -1 | 1) => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => {
      if (element.closest('[data-setup-action-menu="true"]')) return false;
      if (element.closest('[hidden], [aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    const triggerIndex = focusableElements.indexOf(trigger);
    const target = focusableElements[triggerIndex + direction] ?? trigger;

    window.setTimeout(() => target.focus(), 0);
  }, []);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (isOpen) {
      closeMenu();
      return;
    }

    window.dispatchEvent(
      new CustomEvent("setup-action-menu-open", { detail: menuId }),
    );
    setPosition(getActionMenuPosition(event.currentTarget, menuWidth, menuHeight));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    getMenuItems()[0]?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest('[data-setup-action-menu="true"]') ||
        target.closest('[data-setup-action-toggle="true"]')
      ) {
        return;
      }

      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };

    const handleViewportChange = () => {
      const trigger = triggerRef.current;
      if (!trigger?.isConnected) {
        closeMenu();
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const isOutsideViewport =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth;

      if (isOutsideViewport) {
        closeMenu();
        return;
      }

      setPosition(getActionMenuPosition(trigger, menuWidth, menuHeight));
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeMenu, getMenuItems, isOpen, menuHeight, menuWidth]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const menuItems = getMenuItems();
    if (menuItems.length === 0) return;

    const currentIndex = Math.max(0, menuItems.indexOf(document.activeElement as HTMLButtonElement));
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % menuItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = menuItems.length - 1;
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    } else if (event.key === "Tab") {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      closeMenu();
      focusAdjacentToTrigger(direction);
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      menuItems[nextIndex]?.focus();
    }
  };

  useEffect(() => {
    const handleOtherMenuOpen = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== menuId) closeMenu();
    };

    window.addEventListener("setup-action-menu-open", handleOtherMenuOpen);

    return () => {
      window.removeEventListener("setup-action-menu-open", handleOtherMenuOpen);
    };
  }, [closeMenu, menuId]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-setup-action-toggle="true"
        onClick={handleToggle}
        className={ACTION_MORE_BUTTON_CLASS}
        disabled={activeItems.length === 0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={label}
        title={label}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </button>

      {typeof document !== "undefined" && isOpen && position
        ? createPortal(
            <div
              data-setup-action-menu="true"
              className="fixed z-[10000] flex justify-end"
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
              }}
            >
              <div
                ref={menuRef}
                id={menuId}
                className="flex w-full flex-col rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-black/5"
                role="menu"
                aria-label={menuLabel}
                onKeyDown={handleMenuKeyDown}
              >
                {activeItems.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      className={getGroupedActionButtonClass(
                        index,
                        activeItems.length,
                        item.tone ?? "gray",
                      )}
                      onClick={() => {
                        closeMenu(true);
                        void item.onClick();
                      }}
                      aria-label={item.label}
                      title={item.label}
                    >
                      <Icon
                        className="size-4"
                        aria-hidden="true"
                        strokeWidth={1.5}
                      />
                      <span className="min-w-0 whitespace-normal break-words">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
