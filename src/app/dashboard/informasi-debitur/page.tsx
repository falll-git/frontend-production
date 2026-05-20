"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import {
  SETUP_PAGE_COMPACT_CELL_CLASS,
  SETUP_PAGE_COMPACT_ROW_CLASS,
  SETUP_PAGE_EMPTY_STATE_CELL_CLASS,
  SETUP_PAGE_NUMBER_CELL_CLASS,
  SETUP_PAGE_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_ICON_CLASS,
  SETUP_PAGE_SEARCH_INPUT_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEARCH_WRAPPER_CLASS,
  SETUP_PAGE_TABLE_BODY_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_HEAD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
} from "@/components/ui/setupPageStyles";
import { debiturService, type Debitur } from "@/services/debitur.service";

export default function InformasiDebiturPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<Debitur[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const loadData = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await debiturService.getAll({
        search: debouncedQuery || undefined,
        page,
      });
      setItems(result.items);
      setLastPage(result.lastPage);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat data debitur",
        "error",
      );
    } finally {
      setIsFetching(false);
    }
  }, [debouncedQuery, page, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const startIndex = useMemo(() => (page - 1) * 10, [page]);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Informasi Debitur"
        subtitle="Daftar seluruh debitur yang terdaftar dalam sistem."
        icon={<Users />}
      />

      <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search className={SETUP_PAGE_SEARCH_ICON_CLASS} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, nomor debitur, NIK, atau no. telepon..."
            className={SETUP_PAGE_SEARCH_INPUT_CLASS}
          />
        </div>
      </div>

      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup>
              <col className="w-14" />
              <col className="w-28" />
              <col />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-28" />
              <col className="w-20" />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>No. Debitur</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Nama</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>NIK</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>No. Telepon</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Kontrak</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {items.map((item, index) => (
                <tr key={item.id} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>
                    {startIndex + index + 1}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>
                    {item.debtor_number ?? "-"}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}>
                    {item.name}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>
                    {item.identity_number ?? "-"}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>
                    {item.phone ?? "-"}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm`}>
                    {item.status ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        item.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}>
                        {item.status}
                      </span>
                    ) : "-"}
                  </td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 text-center`}>
                    {item.contracts_count ?? 0}
                  </td>
                </tr>
              ))}

              {isFetching && (
                <tr>
                  <td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>
                    Memuat data debitur...
                  </td>
                </tr>
              )}

              {!isFetching && items.length === 0 && (
                <tr>
                  <td colSpan={7} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>
                    {debouncedQuery
                      ? `Tidak ada debitur yang cocok dengan "${debouncedQuery}".`
                      : "Belum ada data debitur."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Halaman <span className="font-semibold text-gray-900">{page}</span> dari{" "}
              <span className="font-semibold text-gray-900">{lastPage}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
                disabled={page >= lastPage}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
