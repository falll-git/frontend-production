import {
  AlertTriangle,
  Clock3,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SetupStateVariant = "empty" | "loading" | "error";

type SetupStateProps = {
  variant?: SetupStateVariant;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon | null;
  compact?: boolean;
  className?: string;
};

const VARIANT_CLASS: Record<SetupStateVariant, string> = {
  empty: "border-slate-200 bg-slate-50 text-slate-600",
  loading: "border-blue-100 bg-blue-50 text-blue-700",
  error: "border-red-100 bg-red-50 text-red-700",
};

const VARIANT_ICON: Record<SetupStateVariant, LucideIcon> = {
  empty: Inbox,
  loading: Clock3,
  error: AlertTriangle,
};

export default function SetupState({
  variant = "empty",
  title,
  description,
  icon,
  compact = false,
  className,
}: SetupStateProps) {
  const Icon = icon === undefined ? VARIANT_ICON[variant] : icon;

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl items-start gap-3 rounded-lg border text-left",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "mt-0.5 shrink-0",
            compact ? "size-4" : "size-5",
          )}
          aria-hidden="true"
          strokeWidth={1.7}
        />
      ) : null}
      <div className="min-w-0 space-y-1">
        <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>
          {title}
        </p>
        {description ? (
          <p className="text-xs leading-5 opacity-80">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
