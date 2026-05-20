"use client";

import type { ReactNode } from "react";

type DashboardNoticeTone = "sky" | "amber";

type DashboardNoticeProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: DashboardNoticeTone;
  className?: string;
  children?: ReactNode;
};

const TONE_CLASS_MAP: Record<
  DashboardNoticeTone,
  {
    container: string;
    icon: string;
    title: string;
    description: string;
  }
> = {
  sky: {
    container: "border-sky-200 bg-sky-50",
    icon: "text-slate-900",
    title: "text-slate-800",
    description: "text-slate-600",
  },
  amber: {
    container: "border-amber-200 bg-amber-50",
    icon: "text-slate-900",
    title: "text-amber-900",
    description: "text-amber-800",
  },
};

export default function DashboardNotice({
  title,
  description,
  icon,
  tone = "sky",
  className = "",
  children,
}: DashboardNoticeProps) {
  const toneClasses = TONE_CLASS_MAP[tone];

  return (
    <div
      className={`rounded-lg border px-4 py-4 ${toneClasses.container} ${className}`.trim()}
    >
      <div className={icon ? "flex items-start gap-3" : "space-y-3"}>
        {icon ? (
          <div
            className={`mt-0.5 flex h-10 w-10 items-center justify-center ${toneClasses.icon}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
        <div className="space-y-3">
          <div>
            <p className={`text-sm font-semibold ${toneClasses.title}`}>
              {title}
            </p>
            {description ? (
              <p className={`mt-1 text-sm leading-6 ${toneClasses.description}`}>
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
