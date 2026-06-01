import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SetupFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function SetupFormSection({
  title,
  description,
  children,
  className,
  contentClassName,
}: SetupFormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200 bg-slate-50/70 p-4 md:col-span-2",
        className,
      )}
    >
      <div className="mb-3 min-w-0">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-3 md:grid-cols-2",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
