"use client";

import {
  SetupDataTable,
  SetupDataTableHead,
  SetupDataTableBody,
  SetupDataTableRow,
  SetupDataTableHeaderCell,
  SetupDataTableCell,
  SetupDataTableColGroup,
  SetupDataTableCol
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FolderOpen,
  SearchX,
} from "lucide-react";

import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import Pagination from "@/components/ui/Pagination";
import SetupViewButton from "@/components/ui/SetupViewButton";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
} from "@/components/ui/setupPageStyles";
import { DEFAULT_PAGINATION_META, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { exportDokumenPerRak } from "@/lib/export-arsip";
import type { Dokumen, DokumenArsip, Kantor, Lemari, Rak } from "@/lib/types";
import { formatDateOnly } from "@/lib/utils/date";
import { arsipService } from "@/services/arsip.service";
import type { PaginationMeta } from "@/types/api.types";

const INITIAL_PAGINATION_META: PaginationMeta = {
  ...DEFAULT_PAGINATION_META,
  limit: SETUP_TABLE_PAGE_SIZE,
};

const DOCUMENT_TABLE_COLUMN_WIDTHS = [
  "56px",
  "184px",
  null,
  "136px",
  null,
  "152px",
  "112px",
] as const;

type DokumenListModalProps = {
  kantor: Kantor;
  lemari: Lemari;
  rak: Rak;
  dokumenList: DokumenArsip[];
  onBack: () => void;
  onClose: () => void;
};

function formatTanggalInput(value: string) {
  return formatDateOnly(value);
}

export default function DokumenListModal({
  kantor,
  lemari,
  rak,
  dokumenList,
  onBack,
  onClose,
}: DokumenListModalProps) {
  const { openPreview } = useDocumentPreviewContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const [documentPage, setDocumentPage] = useState<Dokumen[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    INITIAL_PAGINATION_META,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredExportDokumen = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return dokumenList.filter((item) => {
      const matchSearch =
        query.length === 0 ||
        [
          item.kode ?? "",
          item.namaDokumen,
          item.jenisDokumen,
          item.keterangan ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchSearch;
    });
  }, [dokumenList, searchTerm]);

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
      .getRackDocuments(rak.id, {
        page: currentPage,
        limit: SETUP_TABLE_PAGE_SIZE,
        search: debouncedSearch || undefined,
      })
      .then((result) => {
        if (isCancelled) return;
        setDocumentPage(result.data);
        setPaginationMeta(result.meta);
      })
      .catch((error) => {
        if (isCancelled) return;
        setDocumentPage([]);
        setPaginationMeta(INITIAL_PAGINATION_META);
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat daftar dokumen",
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
  }, [currentPage, debouncedSearch, rak.id]);

  const hasNoData =
    !isLoading && paginationMeta.total === 0 && debouncedSearch.length === 0;
  const hasNoFilteredData =
    !isLoading && paginationMeta.total === 0 && debouncedSearch.length > 0;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportDokumenPerRak({
        rakNama: rak.namaRak,
        lemariKode: lemari.kodeLemari,
        kantorNama: kantor.namaKantor,
        dokumenList: filteredExportDokumen,
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
        className="flex max-h-[85vh] w-[96vw] max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h3 className="truncate text-lg font-bold text-gray-900">
              {rak.namaRak} {"\u00B7"} {lemari.kodeLemari} {"\u00B7"}{" "}
              {kantor.namaKantor}
            </h3>
          </div>
          <SetupExcelButton onClick={handleExport} loading={exportLoading} />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="border-b border-gray-100 bg-white px-5 py-4">
            <div className="grid grid-cols-1 gap-4">
              <SetupSearchInput
                value={searchTerm}
                onChange={(event) => {
                  setIsLoading(true);
                  setErrorMessage("");
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari dokumen..."
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
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
              <p className="text-base font-medium text-gray-700">
                Belum ada dokumen di rak ini
              </p>
            </div>
          ) : hasNoFilteredData ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-gray-700">
                Tidak ada dokumen yang sesuai
              </p>
            </div>
          ) : isLoading && documentPage.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-medium text-gray-700">
                Memuat daftar dokumen...
              </p>
            </div>
          ) : (
            <div className="space-y-4 px-5 py-4">
              <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
                <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
                  <SetupDataTable className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
                    <SetupDataTableColGroup>
                      {DOCUMENT_TABLE_COLUMN_WIDTHS.map((width, index) => (
                        <SetupDataTableCol
                          key={`${index}-${width ?? "flex"}`}
                          style={width ? { width } : undefined}
                        />
                      ))}
                    </SetupDataTableColGroup>
                    <SetupDataTableHead className="ltr:text-left rtl:text-right">
                      <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                          No
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                          Kode
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                          Nama Dokumen
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                          Jenis
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                          Keterangan
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                          Tgl Input
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                          Aksi
                        </SetupDataTableHeaderCell>
                      </SetupDataTableRow>
                    </SetupDataTableHead>
                    <SetupDataTableBody className="divide-y divide-gray-200">
                      {documentPage.map((item, index) => (
                        <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                            {(paginationMeta.page - 1) * paginationMeta.limit + index + 1}
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            <span
                              className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums"
                              title={item.kode}
                            >
                              {item.kode}
                            </span>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                            <span className="block truncate" title={item.namaDokumen}>
                              {item.namaDokumen}
                            </span>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-medium text-gray-700`}>
                            <span className="block truncate" title={item.jenisDokumen}>
                              {item.jenisDokumen}
                            </span>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                            <span
                              className="block truncate"
                              title={item.detail}
                            >
                              {item.detail}
                            </span>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                            <span
                              className="block truncate tabular-nums"
                              title={formatTanggalInput(item.tglInput)}
                            >
                              {formatTanggalInput(item.tglInput)}
                            </span>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                            <SetupViewButton
                              onClick={() =>
                                item.fileUrl
                                  ? openPreview(
                                      item.fileUrl,
                                      item.fileName || item.namaDokumen,
                                    )
                                  : undefined
                              }
                              disabled={!item.fileUrl}
                              label="View"
                              title="View dokumen"
                            />
                          </SetupDataTableCell>
                        </SetupDataTableRow>
                      ))}
                    </SetupDataTableBody>
                  </SetupDataTable>
                </div>
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
