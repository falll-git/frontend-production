"use client";

import type { ReactNode } from "react";
import SetupModalCloseButton from "@/components/ui/SetupModalCloseButton";

type DashboardModalSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl";

type DashboardModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidth?: DashboardModalSize;
  bodyClassName?: string;
  footerClassName?: string;
  ariaLabel?: string;
};

const MAX_WIDTH_CLASS: Record<DashboardModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

export default function DashboardModal({
  isOpen,
  title,
  description,
  children,
  footer,
  onClose,
  closeDisabled = false,
  maxWidth = "2xl",
  bodyClassName = "p-4 sm:p-5",
  footerClassName = "flex flex-col flex-wrap justify-end gap-2 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:p-5",
  ariaLabel,
}: DashboardModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/55 p-2 sm:p-4"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <section
        className={`dashboard-modal flex max-h-[calc(100dvh-1rem)] w-full ${MAX_WIDTH_CLASS[maxWidth]} min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        <header className="dashboard-modal__header flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {description}
              </p>
            ) : null}
          </div>
          <SetupModalCloseButton
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Tutup modal"
            title="Tutup"
          />
        </header>

        <div className={`dashboard-modal__body min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer ? (
          <footer className={`dashboard-modal__footer shrink-0 ${footerClassName}`}>{footer}</footer>
        ) : null}
      </section>
    </div>
  );
}
