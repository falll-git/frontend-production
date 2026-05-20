"use client";

import { useEffect, useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { clampPage } from "@/lib/pagination";

type PaginationProps = {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  total?: number;
  limit?: number;
  isLoading?: boolean;
  className?: string;
};

function joinClassNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Pagination({
  page,
  lastPage,
  onPageChange,
  total,
  limit,
  isLoading = false,
  className,
}: PaginationProps) {
  const inputId = useId();
  const normalizedLastPage = Math.max(1, lastPage);
  const currentPage = clampPage(page, normalizedLastPage);
  const [draftPage, setDraftPage] = useState(String(currentPage));

  useEffect(() => {
    setDraftPage(String(currentPage));
  }, [currentPage]);

  if (normalizedLastPage <= 1 && (!total || total <= (limit ?? total))) {
    return null;
  }

  const commitPage = (value: string) => {
    const parsed = Number(value);
    const nextPage = clampPage(
      Number.isFinite(parsed) ? parsed : currentPage,
      normalizedLastPage,
    );
    setDraftPage(String(nextPage));

    if (nextPage !== currentPage) {
      onPageChange(nextPage);
    }
  };

  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < normalizedLastPage && !isLoading;

  return (
    <nav
      className={joinClassNames(
        "flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-gray-900 sm:flex-row",
        className,
      )}
      aria-label="Pagination"
    >
      {typeof total === "number" && typeof limit === "number" ? (
        <p className="text-xs font-medium text-gray-500">
          Total {total} data
        </p>
      ) : (
        <span aria-hidden="true" />
      )}

      <ul className="flex justify-center gap-1 text-gray-900">
        <li>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="grid h-8 w-8 place-content-center rounded border border-gray-200 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 rtl:rotate-180"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>

        <li>
          <label htmlFor={inputId}>
            <span className="sr-only">Halaman</span>
            <input
              type="number"
              id={inputId}
              min={1}
              max={normalizedLastPage}
              value={draftPage}
              disabled={isLoading}
              onChange={(event) => setDraftPage(event.target.value)}
              onBlur={(event) => commitPage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="h-8 w-16 rounded border border-gray-300 px-2 text-center text-sm tabular-nums outline-none transition focus:border-[#1773B0] focus:ring-2 focus:ring-[#1773B0]/10 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>
        </li>

        <li>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="grid h-8 w-8 place-content-center rounded border border-gray-200 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 rtl:rotate-180"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
      </ul>

      <p className="text-xs font-medium text-gray-500">
        Halaman {currentPage} dari {normalizedLastPage}
      </p>
    </nav>
  );
}
