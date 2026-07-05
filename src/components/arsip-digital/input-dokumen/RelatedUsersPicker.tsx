"use client";

import { UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

import Pagination from "@/components/ui/Pagination";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import { userService } from "@/services/user.service";
import type { UserRecord } from "@/types/auth.types";
import type { PaginationMeta } from "@/types/api.types";

type RelatedUsersPickerProps = {
  disabled?: boolean;
  isLoading?: boolean;
  excludeUserId?: string;
  selectedIds: string[];
  onToggle: (userId: string) => void;
};

const RELATED_USERS_PAGE_SIZE = 6;

const INITIAL_PAGINATION_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: RELATED_USERS_PAGE_SIZE,
  lastPage: 1,
};

export default function RelatedUsersPicker({
  disabled = false,
  isLoading = false,
  excludeUserId,
  selectedIds,
  onToggle,
}: RelatedUsersPickerProps) {
  const selectedCount = selectedIds.length;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    INITIAL_PAGINATION_META,
  );
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isBusy = isLoading || isFetching;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setIsFetching(true);
      setErrorMessage(null);
      setUsers([]);

      try {
        const result = await userService.getPage({
          page,
          limit: RELATED_USERS_PAGE_SIZE,
          search: debouncedQuery || undefined,
        });

        if (ignore) return;

        setUsers(
          result.items
            .filter((item) => item.is_active)
            .filter((item) => item.id !== excludeUserId),
        );
        setPaginationMeta(result.meta);
      } catch (error) {
        if (ignore) return;

        setUsers([]);
        setPaginationMeta(INITIAL_PAGINATION_META);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat daftar user terkait.",
        );
      } finally {
        if (!ignore) setIsFetching(false);
      }
    }

    void loadUsers();

    return () => {
      ignore = true;
    };
  }, [debouncedQuery, excludeUserId, page]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        User Terkait
      </label>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex min-h-11 items-center border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-600">
          {isBusy
            ? "Memuat daftar user..."
            : selectedCount > 0
              ? `${selectedCount} user dipilih`
              : "Belum ada user tambahan"}
        </div>
        <div className="border-b border-gray-100 px-4 py-3">
          <SetupSearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, username, atau email..."
            disabled={disabled || isLoading}
          />
        </div>
        <div className="grid max-h-64 gap-2 overflow-y-auto p-3 md:grid-cols-2">
          {users.map((item) => {
            const checked = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`rounded-lg border px-3 py-3 transition-colors ${
                  checked
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <UiverseCheckbox
                  checked={checked}
                  disabled={disabled || isBusy}
                  onCheckedChange={() => onToggle(item.id)}
                  className="uiverse-checkbox--block"
                  label={
                    <span className="block min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {item.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {item.division_name ?? "-"} | {item.role_name ?? "-"}
                      </span>
                    </span>
                  }
                />
              </div>
            );
          })}

          {isBusy ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm font-medium text-gray-500 md:col-span-2">
              Memuat user terkait...
            </div>
          ) : null}

          {!isBusy && errorMessage ? (
            <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-medium text-red-600 md:col-span-2">
              {errorMessage}
            </div>
          ) : null}

          {!isBusy && !errorMessage && users.length === 0 ? (
            <SetupEmptyState
              title="Tidak ada user yang bisa dipilih."
              description={
                debouncedQuery
                  ? "Ubah kata kunci pencarian untuk melihat user aktif lain."
                  : "User aktif yang sesuai akses akan muncul di daftar ini."
              }
              icon={UsersRound}
              isFiltered={debouncedQuery.length > 0}
              variant="compact"
              className="md:col-span-2"
            />
          ) : null}
        </div>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          isLoading={isBusy}
          onPageChange={setPage}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        User terkait bisa melihat dokumen tanpa perlu mengajukan akses.
      </p>
    </div>
  );
}
