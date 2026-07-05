"use client";

import { SetupSkeletonBlock } from "@/components/ui/SetupSkeleton";

export default function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-9999 bg-[#eef8ff]/85 px-4 py-6 backdrop-blur-sm md:px-8"
      role="status"
      aria-label="Menyiapkan halaman"
    >
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col gap-6">
        <div className="flex items-center justify-between rounded-lg border border-sky-100/80 bg-white/85 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <SetupSkeletonBlock className="h-11 w-11 rounded-lg" />
            <SetupSkeletonBlock className="h-6 w-56" />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <SetupSkeletonBlock className="h-10 w-28 rounded-full" />
            <SetupSkeletonBlock className="h-10 w-40 rounded-full" />
          </div>
        </div>

        <div className="rounded-lg border border-sky-100/80 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <SetupSkeletonBlock className="h-14 w-14 rounded-lg" />
            <div className="flex-1 space-y-3">
              <SetupSkeletonBlock className="h-8 w-72 max-w-full" />
              <SetupSkeletonBlock className="h-4 w-[520px] max-w-full" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <SetupSkeletonBlock className="h-11 w-full" />
            <SetupSkeletonBlock className="h-11 w-full" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`page-loader-stat-${index}`}
              className="rounded-lg border border-slate-200 bg-white/90 p-5 shadow-sm"
            >
              <SetupSkeletonBlock className="h-4 w-28" />
              <SetupSkeletonBlock className="mt-5 h-8 w-16" />
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <SetupSkeletonBlock
                  key={`page-loader-head-${index}`}
                  className="h-3 w-24"
                />
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div
                key={`page-loader-row-${rowIndex}`}
                className="grid grid-cols-5 gap-4 px-4 py-4"
              >
                {Array.from({ length: 5 }).map((__, columnIndex) => (
                  <SetupSkeletonBlock
                    key={`page-loader-row-${rowIndex}-${columnIndex}`}
                    className={columnIndex === 0 ? "h-4 w-10" : "h-4 w-full"}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
