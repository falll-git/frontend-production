"use client";

import {
  CircleCheck,
  FolderOpen,
  Gauge,
  Layers,
  SearchX,
} from "lucide-react";
import { useEffect, useState } from "react";

import StorageSummaryCard from "@/components/arsip/StorageSummaryCard";
import DashboardModal from "@/components/ui/DashboardModal";
import Pagination from "@/components/ui/Pagination";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
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
    <DashboardModal
      isOpen
      title={`${lemari.kodeLemari} \u00B7 ${kantor.namaKantor}`}
      description={`${paginationMeta.total} rak`}
      onClose={onClose}
      maxWidth="5xl"
      bodyClassName="px-4 py-5 sm:px-5 sm:py-6"
      footerClassName="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-4 sm:p-5"
      footer={
        <>
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
        </>
      }
    >
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
            <div className="flex min-h-[300px] items-center justify-center px-6">
              <SetupEmptyState
                title="Belum ada rak"
                description="Rak pada lemari ini akan tampil setelah data penyimpanan tersedia."
                icon={FolderOpen}
                variant="table"
              />
            </div>
          ) : hasNoFilteredData ? (
            <div className="flex min-h-[260px] items-center justify-center px-6">
              <SetupEmptyState
                title="Tidak ada rak yang sesuai"
                description="Coba ubah kata kunci pencarian."
                icon={SearchX}
                isFiltered
                variant="table"
              />
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
    </DashboardModal>
  );
}
