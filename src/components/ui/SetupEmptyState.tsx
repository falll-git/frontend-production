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
    panel: string;
  }
> = {
  neutral: {
    icon: "text-slate-500",
    panel: "border-slate-200 bg-white",
  },
  debitur: {
    icon: "text-sky-700",
    panel: "border-slate-200 bg-white",
  },
  legal: {
    icon: "text-indigo-700",
    panel: "border-slate-200 bg-white",
  },
  import: {
    icon: "text-teal-700",
    panel: "border-slate-200 bg-white",
  },
  parameter: {
    icon: "text-amber-700",
    panel: "border-slate-200 bg-white",
  },
};

const VARIANT_CLASS: Record<SetupEmptyStateVariant, string> = {
  table: "mx-auto max-w-xl px-4 py-5",
  panel: "w-full rounded-lg border border-dashed px-5 py-6",
  compact: "mx-auto max-w-lg px-3 py-3",
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
          <Icon
            className={cn(
              variant === "compact" ? "mb-2 size-4" : "mb-2 size-5",
              toneClass.icon,
            )}
            aria-hidden="true"
            strokeWidth={1.8}
          />
        ) : null}
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold text-slate-900",
              variant === "compact" ? "text-sm" : "text-sm",
            )}
          >
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
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
