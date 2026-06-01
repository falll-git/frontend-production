"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DetailSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  layout?: "grid" | "stack" | "list";
}

function DetailSection({
  title,
  description,
  children,
  layout = "grid",
}: DetailSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </h4>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <div
        className={
          layout === "grid"
            ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
            : layout === "list"
              ? "space-y-3"
            : "rounded-lg border border-gray-200 bg-gray-50 p-4"
        }
      >
        {children}
      </div>
    </section>
  );
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
  className?: string;
  contentClassName?: string;
}

function DetailRow({
  label,
  value,
  className = "",
  contentClassName = "",
}: DetailRowProps) {
  return (
    <div
      className={`min-h-[48px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 ${className}`.trim()}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div
        className={`mt-2 break-words text-sm font-semibold leading-6 text-gray-900 ${contentClassName}`.trim()}
      >
        {value}
      </div>
    </div>
  );
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function DetailModal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: DetailModalProps) {
  if (!isOpen) return null;

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(21,126,195,0.16)] focus:ring-offset-2"
            title="Tutup"
            aria-label="Tutup"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        <div className="flex justify-end border-t border-gray-100 bg-gray-50 p-5">
          <button
            type="button"
            onClick={onClose}
            className="uiverse-modal-button uiverse-modal-button--neutral"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export { DetailSection, DetailRow };
