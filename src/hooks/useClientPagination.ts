"use client";

import { useCallback, useMemo, useState } from "react";

import {
  buildClientPaginationMeta,
  clampPage,
  getClientPageItems,
} from "@/lib/pagination";

export function useClientPagination<T>(items: T[], limit: number) {
  const [page, setPage] = useState(1);

  const meta = useMemo(
    () => buildClientPaginationMeta(items.length, page, limit),
    [items.length, limit, page],
  );

  const paginatedItems = useMemo(
    () => getClientPageItems(items, meta.page, meta.limit),
    [items, meta.limit, meta.page],
  );

  const goToPage = useCallback(
    (nextPage: number) => setPage(clampPage(nextPage, meta.lastPage)),
    [meta.lastPage],
  );

  const resetPage = useCallback(() => setPage(1), []);

  return {
    page: meta.page,
    setPage: goToPage,
    paginatedItems,
    meta,
    resetPage,
  };
}
