import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function SetupSkeletonBlock({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100",
        className,
      )}
      {...props}
    />
  );
}

type SetupTableSkeletonRowsProps = {
  colSpan: number;
  rows?: number;
  columns?: number;
  className?: string;
};

export function SetupTableSkeletonRows({
  colSpan,
  rows = 5,
  columns = 5,
  className,
}: SetupTableSkeletonRowsProps) {
  const safeRows = Math.max(1, rows);
  const safeColumns = Math.max(2, columns);
  const widths = ["w-10", "w-36", "w-28", "w-48", "w-24", "w-32", "w-20"];

  return (
    <>
      {Array.from({ length: safeRows }).map((_, rowIndex) => (
        <tr
          key={`setup-table-skeleton-${rowIndex}`}
          className="border-b border-slate-100 last:border-b-0"
          aria-hidden="true"
        >
          <td colSpan={colSpan} className={cn("px-3 py-3", className)}>
            <div className="flex min-w-[560px] items-center gap-4">
              {Array.from({ length: safeColumns }).map((__, columnIndex) => (
                <SetupSkeletonBlock
                  key={`setup-table-skeleton-${rowIndex}-${columnIndex}`}
                  className={cn(
                    "h-4 shrink-0",
                    widths[columnIndex % widths.length],
                    columnIndex === 0 ? "w-8" : "",
                  )}
                />
              ))}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function SetupDocumentPreviewSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-[#f4f6fb] p-4",
        className,
      )}
      aria-hidden="true"
    >
      <div className="min-h-[320px] rounded-lg bg-[#eef2f7] p-3 md:min-h-[560px] md:p-4">
        <div className="mx-auto w-full max-w-[620px] rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-5 flex items-center justify-between gap-4">
            <SetupSkeletonBlock className="h-4 w-32" />
            <SetupSkeletonBlock className="h-7 w-24 rounded-full" />
          </div>
          <div className="space-y-4">
            <SetupSkeletonBlock className="h-8 w-3/4" />
            <SetupSkeletonBlock className="h-4 w-full" />
            <SetupSkeletonBlock className="h-4 w-11/12" />
            <SetupSkeletonBlock className="h-4 w-5/6" />
            <div className="pt-4">
              <SetupSkeletonBlock className="h-[360px] w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
