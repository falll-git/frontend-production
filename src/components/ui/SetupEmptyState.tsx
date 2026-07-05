"use client";

import {
  Database,
  FileSearch,
  Inbox,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SetupEmptyStateTone =
  | "neutral"
  | "debitur"
  | "legal"
  | "import"
  | "parameter";

type SetupEmptyStateVariant = "table" | "panel" | "compact";

type SetupEmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: LucideIcon | null;
  tone?: SetupEmptyStateTone;
  variant?: SetupEmptyStateVariant;
  isFiltered?: boolean;
  className?: string;
};

const TONE_CLASS: Record<
  SetupEmptyStateTone,
  {
    icon: string;
    iconWrap: string;
    panel: string;
  }
> = {
  neutral: {
    icon: "text-slate-600",
    iconWrap: "border-slate-200 bg-slate-100/90",
    panel: "border-slate-200 bg-slate-50/70",
  },
  debitur: {
    icon: "text-sky-700",
    iconWrap: "border-sky-100 bg-sky-50/90",
    panel: "border-slate-200 bg-sky-50/35",
  },
  legal: {
    icon: "text-indigo-700",
    iconWrap: "border-indigo-100 bg-indigo-50/90",
    panel: "border-slate-200 bg-indigo-50/35",
  },
  import: {
    icon: "text-teal-700",
    iconWrap: "border-teal-100 bg-teal-50/90",
    panel: "border-slate-200 bg-teal-50/35",
  },
  parameter: {
    icon: "text-amber-700",
    iconWrap: "border-amber-100 bg-amber-50/90",
    panel: "border-slate-200 bg-amber-50/35",
  },
};

const VARIANT_CLASS: Record<SetupEmptyStateVariant, string> = {
  table: "mx-auto max-w-xl px-4 py-6",
  panel: "w-full rounded-xl border px-5 py-6 sm:px-6",
  compact: "mx-auto max-w-md px-3 py-4",
};

export default function SetupEmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  tone = "neutral",
  variant = "table",
  isFiltered = false,
  className,
}: SetupEmptyStateProps) {
  const toneClass = TONE_CLASS[tone];
  const Icon =
    icon === undefined
      ? isFiltered
        ? SearchX
        : tone === "import"
          ? FileSearch
          : tone === "parameter"
            ? Database
            : Inbox
      : icon;

  return (
    <div
      className={cn(
        "text-center",
        variant === "panel" ? toneClass.panel : "",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      <div className="flex min-w-0 flex-col items-center justify-center">
        {Icon ? (
          <span
            className={cn(
              "mb-3 inline-flex items-center justify-center rounded-full border shadow-sm",
              toneClass.iconWrap,
              variant === "compact" ? "h-9 w-9" : "h-11 w-11",
            )}
          >
            <Icon
              className={cn(
                variant === "compact" ? "size-4" : "size-5",
                toneClass.icon,
              )}
              aria-hidden="true"
              strokeWidth={1.8}
            />
          </span>
        ) : null}
        <div className="min-w-0 max-w-[34rem]">
          <p
            className={cn(
              "font-semibold text-slate-900",
              variant === "compact" ? "text-sm" : "text-[15px]",
            )}
          >
            {title}
          </p>
          {description ? (
            <p
              className={cn(
                "mt-1.5 leading-6 text-slate-500",
                variant === "compact" ? "text-xs" : "text-sm",
              )}
            >
              {description}
            </p>
          ) : null}
          {action || secondaryAction ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {action}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
