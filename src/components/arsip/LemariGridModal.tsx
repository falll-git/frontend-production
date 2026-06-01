"use client";

import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  BookOpen,
  Box,
  CircleCheck,
  FolderOpen,
  Gauge,
  Layers,
  SearchX,
} from "lucide-react";
import { useEffect, useState } from "react";

import StorageSummaryCard from "@/components/arsip/StorageSummaryCard";
import Pagination from "@/components/ui/Pagination";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import { exportDokumenPerKantor } from "@/lib/export-arsip";
import type { Kantor, Lemari } from "@/lib/types";
import { DEFAULT_PAGINATION_META } from "@/lib/pagination";
import { arsipService } from "@/services/arsip.service";
import type { PaginationMeta } from "@/types/api.types";

import type { StorageDokumenArsip, StorageRak } from "@/lib/arsip-digital-storage";

const STORAGE_GRID_PAGE_SIZE = 6;
const INITIAL_PAGINATION_META: PaginationMeta = {
  ...DEFAULT_PAGINATION_META,
  limit: STORAGE_GRID_PAGE_SIZE,
};

type LemariGridModalProps = {
  kantor: Kantor;
  lemariList: Lemari[];
  rakList: StorageRak[];
  dokumenList: StorageDokumenArsip[];
  onSelectLemari: (lemari: Lemari) => void;
  onClose: () => void;
};

export default function LemariGridModal({
  kantor,
  lemariList,
  rakList,
  dokumenList,
  onSelectLemari,
  onClose,
}: LemariGridModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const [lemariPage, setLemariPage] = useState<Lemari[]>([]);
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
      .getOfficeCabinetsPage(kantor.id, {
        page: currentPage,
        limit: STORAGE_GRID_PAGE_SIZE,
        search: debouncedSearch || undefined,
      })
      .then((result) => {
        if (isCancelled) return;
        setLemariPage(result.items);
        setPaginationMeta(result.meta);
      })
      .catch((error) => {
        if (isCancelled) return;
        setLemariPage([]);
        setPaginationMeta(INITIAL_PAGINATION_META);
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat daftar lemari",
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
  }, [currentPage, debouncedSearch, kantor.id]);

  const hasNoData =
    !isLoading && paginationMeta.total === 0 && debouncedSearch.length === 0;
  const hasNoFilteredData =
    !isLoading && paginationMeta.total === 0 && debouncedSearch.length > 0;
  const kantorStorageKey = kantor.kodeKantor ?? kantor.id;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportDokumenPerKantor({
        kantorId: kantorStorageKey,
        kantorNama: kantor.namaKantor,
        lemariList,
        rakList,
        dokumenList,
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-gray-900">
              {kantor.namaKantor}
            </h3>
            <p className="text-sm text-gray-500">
              {paginationMeta.total} Lemari
            </p>
          </div>
          <SetupExcelButton onClick={handleExport} loading={exportLoading} />
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
              placeholder="Cari kode lemari..."
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
            <div className="flex min-h-[300px] items-center justify-center px-6">
              <SetupEmptyState
                title="Belum ada lemari"
                description="Lemari arsip kantor ini akan tampil setelah data penyimpanan tersedia."
                icon={FolderOpen}
                variant="table"
              />
            </div>
          ) : hasNoFilteredData ? (
            <div className="flex min-h-[260px] items-center justify-center px-6">
              <SetupEmptyState
                title="Tidak ada lemari yang sesuai"
                description="Coba ubah kata kunci pencarian."
                icon={SearchX}
                isFiltered
                variant="table"
              />
            </div>
          ) : isLoading && lemariPage.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-medium text-gray-700">
                Memuat daftar lemari...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {lemariPage.map((lemari, idx) => {
                  const hasKapasitas = typeof lemari.kapasitas === "number";
                  const status = lemari.status;

                  return (
                    <StorageSummaryCard
                      key={lemari.id}
                      style={{ animationDelay: `${idx * 0.1}s` }}
                      icon={<Archive className="h-6 w-6" aria-hidden="true" />}
                      total={lemari.totalDokumen ?? 0}
                      rows={[
                        {
                          icon: <Box className="h-4 w-4" aria-hidden="true" />,
                          label: "Kode Lemari",
                          value: lemari.kodeLemari,
                        },
                        {
                          icon: <Layers className="h-4 w-4" aria-hidden="true" />,
                          label: "Jumlah Rak",
                          value: lemari.jumlahRak ?? 0,
                        },
                        {
                          icon: (
                            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                          ),
                          label: "Dokumen Disposisi",
                          value: lemari.dokumenDisposisi ?? 0,
                        },
                        {
                          icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
                          label: "Dokumen Dipinjam",
                          value: lemari.dokumenDipinjam ?? 0,
                        },
                        {
                          icon: (
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                          ),
                          label: "Peminjaman Jatuh Tempo",
                          value: lemari.dokumenDipinjamJatuhTempo ?? 0,
                        },
                        ...(hasKapasitas
                          ? [
                              {
                                icon: (
                                  <Gauge className="h-4 w-4" aria-hidden="true" />
                                ),
                                label: "Kapasitas",
                                value: lemari.kapasitas,
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
                      actionLabel="Lihat Rak"
                      onAction={() => onSelectLemari(lemari)}
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

        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50 px-5 py-4">
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
