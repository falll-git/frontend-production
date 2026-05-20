import type { PaginationMeta } from "@/types/api.types";

export const SETUP_TABLE_PAGE_SIZE = 10;
export const OPERATIONAL_TABLE_PAGE_SIZE = 20;
export const MAX_TABLE_PAGE_SIZE = 100;

export const DEFAULT_PAGINATION_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: OPERATIONAL_TABLE_PAGE_SIZE,
  lastPage: 1,
};

export function clampPage(page: number, lastPage: number) {
  const normalizedLastPage = Math.max(1, Math.floor(lastPage) || 1);
  const normalizedPage = Math.max(1, Math.floor(page) || 1);
  return Math.min(normalizedPage, normalizedLastPage);
}

export function getPageOffset(page: number, limit: number) {
  return (Math.max(1, page) - 1) * Math.max(1, limit);
}

export function getClientPageItems<T>(
  items: T[],
  page: number,
  limit: number,
) {
  const start = getPageOffset(page, limit);
  return items.slice(start, start + limit);
}

export function buildClientPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const normalizedLimit = Math.max(1, Math.floor(limit) || 1);
  const lastPage = Math.max(1, Math.ceil(total / normalizedLimit));

  return {
    total,
    page: clampPage(page, lastPage),
    limit: normalizedLimit,
    lastPage,
  };
}
