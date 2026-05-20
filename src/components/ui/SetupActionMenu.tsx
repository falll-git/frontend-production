"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
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
};

type SetupActionMenuProps = {
  items: SetupActionMenuItem[];
  label?: string;
  menuLabel?: string;
};

const ACTION_ICON_BUTTON_CLASS =
  "inline-flex size-8 flex-shrink-0 items-center justify-center border border-gray-200 bg-white transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-[rgba(21,126,195,0.16)] focus:ring-offset-2 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50";

const ACTION_MORE_BUTTON_CLASS =
  "inline-flex size-8 items-center justify-center rounded-lg border border-[rgba(21,126,195,0.42)] bg-white text-gray-600 shadow-sm transition-colors hover:border-[rgba(21,126,195,0.65)] hover:bg-[rgba(21,126,195,0.06)] hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(21,126,195,0.16)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const ACTION_TONE_CLASS: Record<SetupActionTone, string> = {
  blue: "text-gray-700 hover:bg-blue-50 hover:text-gray-900",
  emerald: "text-gray-700 hover:bg-emerald-50 hover:text-gray-900",
  amber: "text-gray-700 hover:bg-amber-50 hover:text-gray-900",
  red: "text-gray-700 hover:bg-red-50 hover:text-gray-900",
  gray: "text-gray-600 hover:bg-gray-50 hover:text-gray-800",
};

function getMenuWidth(itemCount: number) {
  return Math.max(36, itemCount * 36);
}

function getGroupedActionButtonClass(
  index: number,
  total: number,
  tone: SetupActionTone,
) {
  return [
    ACTION_ICON_BUTTON_CLASS,
    index === 0 ? "rounded-s-sm" : "-ms-px",
    index === total - 1 ? "rounded-e-sm" : "",
    ACTION_TONE_CLASS[tone],
  ]
    .filter(Boolean)
    .join(" ");
}

function getActionMenuPosition(
  trigger: HTMLButtonElement,
  menuWidth: number,
): ActionMenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gutter = 12;
  const gap = 8;
  const menuHeight = 36;
  const maxLeft = window.innerWidth - menuWidth - gutter;
  const left = Math.max(gutter, Math.min(rect.right - menuWidth, maxLeft));
  const bottomTop = rect.bottom + gap;
  const top =
    bottomTop + menuHeight > window.innerHeight - gutter
      ? Math.max(gutter, rect.top - menuHeight - gap)
      : bottomTop;

  return { top, left };
}

export default function SetupActionMenu({
  items,
  label = "Buka aksi",
  menuLabel = "Aksi data",
}: SetupActionMenuProps) {
  const menuId = useId();
  const activeItems = items.filter((item) => !item.disabled);
  const menuWidth = getMenuWidth(activeItems.length);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ActionMenuPosition | null>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
  }, []);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (isOpen) {
      closeMenu();
      return;
    }

    window.dispatchEvent(
      new CustomEvent("setup-action-menu-open", { detail: menuId }),
    );
    setPosition(getActionMenuPosition(event.currentTarget, menuWidth));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

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
      if (event.key === "Escape") closeMenu();
    };

    const handleViewportChange = () => closeMenu();

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
  }, [closeMenu, isOpen]);

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
        type="button"
        data-setup-action-toggle="true"
        onClick={handleToggle}
        className={ACTION_MORE_BUTTON_CLASS}
        disabled={activeItems.length === 0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
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
                width: menuWidth,
              }}
            >
              <div
                className="inline-flex rounded-sm bg-white shadow-lg ring-1 ring-black/5"
                role="menu"
                aria-label={menuLabel}
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
                        closeMenu();
                        void item.onClick();
                      }}
                      title={item.label}
                    >
                      <Icon
                        className="size-4"
                        aria-hidden="true"
                        strokeWidth={1.5}
                      />
                      <span className="sr-only">{item.label}</span>
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
