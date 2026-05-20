"use client";

import {
  ArrowLeft,
  CircleCheck,
  FolderOpen,
  Gauge,
  Layers,
  SearchX,
} from "lucide-react";
import { useEffect, useState } from "react";

import StorageSummaryCard from "@/components/arsip/StorageSummaryCard";
import Pagination from "@/components/ui/Pagination";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import { DEFAULT_PAGINATION_META } from "@/lib/pagination";
import type { Kantor, Lemari, Rak } from "@/lib/types";
import { arsipService } from "@/services/arsip.service";
import type { PaginationMeta } from "@/types/api.types";

const STORAGE_GRID_PAGE_SIZE = 6;
const INITIAL_PAGINATION_META: PaginationMeta = {
  ...DEFAULT_PAGINATION_META,
  limit: STORAGE_GRID_PAGE_SIZE,
};

type RakGridModalProps = {
  lemari: Lemari;
  kantor: Kantor;
  onClose: () => void;
  onBack: () => void;
  onSelectRak: (rak: Rak) => void;
};

export default function RakGridModal({
  lemari,
  kantor,
  onClose,
  onBack,
  onSelectRak,
}: RakGridModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rakPage, setRakPage] = useState<Rak[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    INITIAL_PAGINATION_META,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    let isCancelled = false;

    void arsipService
      .getCabinetRacksPage(lemari.id, {
        page: currentPage,
        limit: STORAGE_GRID_PAGE_SIZE,
        search: debouncedSearch || undefined,
      })
      .then((result) => {
        if (isCancelled) return;
        setRakPage(result.items);
        setPaginationMeta(result.meta);
      })
      .catch((error) => {
        if (isCancelled) return;
        setRakPage([]);
        setPaginationMeta(INITIAL_PAGINATION_META);
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat daftar rak",
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, debouncedSearch, lemari.id]);

  const hasNoData =
    !isLoading && paginationMeta.total === 0 && debouncedSearch.length === 0;
  const hasNoFilteredData =
    !isLoading && paginationMeta.total === 0 && debouncedSearch.length > 0;

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-[96vw] max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="truncate text-lg font-bold text-gray-900">
              {lemari.kodeLemari} {"\u00B7"} {kantor.namaKantor}
            </h3>
            <p className="text-sm text-gray-500">{paginationMeta.total} Rak</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mb-5">
            <SetupSearchInput
              value={searchTerm}
              onChange={(event) => {
                setIsLoading(true);
                setErrorMessage("");
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nomor rak..."
            />
          </div>

          {errorMessage ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-slate-900">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                {errorMessage}
              </p>
            </div>
          ) : hasNoData ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <FolderOpen className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">Belum ada rak</p>
            </div>
          ) : hasNoFilteredData ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                Tidak ada rak yang sesuai
              </p>
            </div>
          ) : isLoading && rakPage.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-medium text-gray-700">
                Memuat daftar rak...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {rakPage.map((rak, idx) => {
                  const hasKapasitas = typeof rak.kapasitas === "number";
                  const status = rak.status;

                  return (
                    <StorageSummaryCard
                      key={rak.id}
                      style={{ animationDelay: `${idx * 0.1}s` }}
                      icon={<Layers className="h-6 w-6" aria-hidden="true" />}
                      total={rak.totalArsip}
                      rows={[
                        {
                          icon: <Layers className="h-4 w-4" aria-hidden="true" />,
                          label: "Nama Rak",
                          value: rak.namaRak,
                        },
                        ...(hasKapasitas
                          ? [
                              {
                                icon: (
                                  <Gauge className="h-4 w-4" aria-hidden="true" />
                                ),
                                label: "Kapasitas",
                                value: rak.kapasitas,
                              },
                            ]
                          : []),
                        ...(status === "Aktif" || status === "Nonaktif"
                          ? [
                              {
                                icon: (
                                  <CircleCheck
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                ),
                                label: "Status",
                                value: <SetupStatusBadge status={status} />,
                              },
                            ]
                          : []),
                      ]}
                      actionLabel="Lihat Dokumen"
                      onAction={() => onSelectRak(rak)}
                    />
                  );
                })}
              </div>

              <Pagination
                page={paginationMeta.page}
                lastPage={paginationMeta.lastPage}
                total={paginationMeta.total}
                limit={paginationMeta.limit}
                isLoading={isLoading}
                className="rounded-lg border border-gray-200 bg-white shadow-sm"
                onPageChange={(page) => {
                  setIsLoading(true);
                  setErrorMessage("");
                  setCurrentPage(page);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={onBack}
          >
            Kembali
          </button>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
