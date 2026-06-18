"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  LoaderCircle,
  Printer,
  SearchX,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import Pagination from "@/components/ui/Pagination";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupViewButton from "@/components/ui/SetupViewButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableCol,
  SetupDataTableColGroup,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
} from "@/components/ui/SetupDataTable";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import {
  SETUP_PAGE_PANEL_CLASS,
  SETUP_PAGE_PRIMARY_BUTTON_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS,
  SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS,
  SETUP_PAGE_SEGMENTED_GROUP_CLASS,
} from "@/components/ui/setupPageStyles";
import { formatDate, parseDateString } from "@/lib/utils/date";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import type { DocumentFileType } from "@/lib/utils/file";
import { detectDocumentFileType, isValidFileUrl } from "@/lib/utils/file";
import { printDocument } from "@/lib/utils/printDocument";
import { correspondenceService } from "@/services/correspondence.service";
import type {
  CorrespondenceMyReportFilter,
  CorrespondenceReportScope,
  CorrespondencePrintableItem,
  Memorandum,
  SuratKeluar,
  SuratMasuk,
} from "@/types/surat.types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type DocumentKind = "surat-masuk" | "surat-keluar" | "memorandum";

const REPORT_SCOPE_OPTIONS: Array<{
  value: CorrespondenceReportScope;
  label: string;
}> = [
  { value: "my", label: "Laporan Saya" },
  { value: "division", label: "Data Divisi" },
  { value: "all", label: "Semua Dokumen" },
];

const MY_REPORT_FILTER_OPTIONS: Array<{
  value: CorrespondenceMyReportFilter;
  label: string;
}> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Masih Aktif" },
  { value: "completed", label: "Selesai" },
  { value: "forwarded", label: "Diteruskan" },
];

function canDirectPrintFileType(fileType: DocumentFileType) {
  return fileType === "pdf" || fileType === "image";
}

type PrintableRecord =
  | {
      id: string;
      kind: "surat-masuk";
      sortDate: string;
      code: string;
      subject: string;
      primaryText: string;
      secondaryText: string;
      searchText: string;
      fileName: string;
      fileUrl?: string;
      record: SuratMasuk;
    }
  | {
      id: string;
      kind: "surat-keluar";
      sortDate: string;
      code: string;
      subject: string;
      primaryText: string;
      secondaryText: string;
      searchText: string;
      fileName: string;
      fileUrl?: string;
      record: SuratKeluar;
    }
  | {
      id: string;
      kind: "memorandum";
      sortDate: string;
      code: string;
      subject: string;
      primaryText: string;
      secondaryText: string;
      searchText: string;
      fileName: string;
      fileUrl?: string;
      record: Memorandum;
    };

const SORT_OPTIONS: Array<{
  value: "tanggal-desc" | "tanggal-asc";
  label: string;
}> = [
  { value: "tanggal-desc", label: "Terbaru (Paling Baru)" },
  { value: "tanggal-asc", label: "Terlama (Paling Lama)" },
];

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function getDateValue(value: string) {
  return (parseDateString(value) ?? new Date(0)).getTime();
}

function sortRecords(
  records: PrintableRecord[],
  sortValue: "tanggal-desc" | "tanggal-asc",
) {
  return [...records].sort((left, right) => {
    if (sortValue === "tanggal-asc") {
      return getDateValue(left.sortDate) - getDateValue(right.sortDate);
    }

    return getDateValue(right.sortDate) - getDateValue(left.sortDate);
  });
}

function getSearchPlaceholder(activeKind: DocumentKind) {
  if (activeKind === "surat-masuk") {
    return "Cari pengirim, nomor surat, perihal...";
  }

  if (activeKind === "surat-keluar") {
    return "Cari penerima, alamat, atau nomor surat...";
  }

  return "Cari no memo, perihal, divisi, pembuat...";
}

function getDocumentKindLabel(kind: DocumentKind) {
  if (kind === "surat-masuk") return "Surat Masuk";
  if (kind === "surat-keluar") return "Surat Keluar";
  return "Memorandum";
}

function getDocumentKindTone(kind: DocumentKind): SetupStatusTone {
  if (kind === "surat-masuk") return "sky";
  if (kind === "surat-keluar") return "blue";
  return "violet";
}

function formatDocumentFileName(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : "Belum tersedia";
}

function formatDeadlineValue(value: string | undefined) {
  return value ? formatDate(value) : "-";
}

function mapPrintableItem(item: CorrespondencePrintableItem): PrintableRecord {
  if (item.kind === "incoming-mail") {
    const record = item.record as SuratMasuk;

    return {
      id: `surat-masuk-${item.id}`,
      kind: "surat-masuk",
      sortDate: item.document_date || record.tanggalTerima,
      code: item.document_number || record.namaSurat,
      subject: item.subject || record.perihal,
      primaryText: item.primary_text || record.pengirim,
      secondaryText: record.sifat,
      searchText: normalizeKeyword(
        [
          record.namaSurat,
          record.pengirim,
          record.alamatPengirim,
          record.perihal,
          record.keterangan ?? "",
          record.keteranganTenggat ?? "",
          record.tenggatWaktu ?? "",
          record.sifat,
          record.statusDisposisi,
          record.physicalStorageLabel ?? "",
          record.targetDivisionNames?.join(" ") ?? "",
          record.disposisiKepada.join(" "),
        ].join(" "),
      ),
      fileName: item.file_name || record.fileName,
      fileUrl: item.file_url ?? record.fileUrl,
      record,
    };
  }

  if (item.kind === "outgoing-mail") {
    const record = item.record as SuratKeluar;

    return {
      id: `surat-keluar-${item.id}`,
      kind: "surat-keluar",
      sortDate: item.document_date || record.tanggalKirim,
      code: item.document_number || record.namaSurat,
      subject: item.subject || record.penerima,
      primaryText: item.primary_text || record.alamatPenerima,
      secondaryText: item.secondary_text || `${record.media} - ${record.statusLabel}`,
      searchText: normalizeKeyword(
        [
          record.namaSurat,
          record.penerima,
          record.alamatPenerima,
          record.media,
          record.sifat,
          record.statusLabel,
          record.responseDueDate ?? "",
          record.tenggatWaktu ?? "",
          record.keteranganTenggat ?? "",
          record.followUpStatusLabel ?? "",
          record.physicalStorageLabel ?? "",
        ].join(" "),
      ),
      fileName: item.file_name || record.fileName,
      fileUrl: item.file_url ?? record.fileUrl,
      record,
    };
  }

  const record = item.record as Memorandum;

  return {
    id: `memorandum-${item.id}`,
    kind: "memorandum",
    sortDate: item.document_date || record.tanggal,
    code: item.document_number || record.noMemo,
    subject: item.subject || record.perihal,
    primaryText: item.primary_text || record.divisiAsal,
    secondaryText: item.secondary_text || record.pembuatMemo,
    searchText: normalizeKeyword(
      [
        record.noMemo,
        record.perihal,
        record.divisiAsal,
        record.divisiTujuanAwal.join(" "),
        record.pembuatMemo,
        record.physicalStorageLabel ?? "",
        record.keterangan,
        record.tenggatWaktu ?? "",
        record.keteranganTenggat ?? "",
        record.followUpStatusLabel ?? "",
        record.penerima.join(" "),
      ].join(" "),
    ),
    fileName: item.file_name || record.fileName,
    fileUrl: item.file_url ?? record.fileUrl,
    record,
  };
}

function MiniPdfPreview({
  fileUrl,
  fileName,
}: {
  fileUrl?: string;
  fileName: string;
}) {
  const fileType = detectDocumentFileType(fileUrl, fileName);

  if (!isValidFileUrl(fileUrl)) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-[#f4f6fb] px-4 text-center md:min-h-[560px] md:px-6">
        <div>
          <FileText className="mx-auto mb-3 h-7 w-7 text-gray-400" aria-hidden="true" />
          <p className="text-base font-semibold text-gray-900">
            File dokumen belum tersedia
          </p>
        </div>
      </div>
    );
  }

  if (fileType === "image") {
    return (
      <div className="rounded-lg bg-[#f4f6fb] p-4">
        <div className="h-[min(68dvh,760px)] min-h-[320px] overflow-y-auto overflow-x-hidden rounded-lg bg-[#eef2f7] p-3 md:min-h-[560px] md:p-4">
          <div className="mx-auto w-full max-w-[620px] rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
            <img
              src={fileUrl}
              alt={formatDocumentFileName(fileName)}
              className="h-auto w-full rounded-lg object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  if (fileType === "pdf") {
    return <PdfDocumentPreview key={fileUrl} fileUrl={fileUrl} />;
  }

  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-[#f4f6fb] px-4 text-center md:min-h-[560px] md:px-6">
      <div className="max-w-sm">
        <FileText className="mx-auto mb-3 h-7 w-7 text-gray-400" aria-hidden="true" />
        <p className="text-base font-semibold text-gray-900">
          Preview belum tersedia untuk format ini
        </p>
        <p className="mt-2 text-sm text-gray-500">
          File PPT, PPTX, DOC, DOCX, XLS, dan XLSX tetap bisa dibuka atau
          diunduh sesuai izin akses.
        </p>
      </div>
    </div>
  );
}

function PdfDocumentPreview({
  fileUrl,
}: {
  fileUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState(560);
  const [pageCount, setPageCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const nextWidth = Math.min(
      620,
      Math.max(280, Math.floor(element.getBoundingClientRect().width)),
    );
    setPageWidth((currentWidth) =>
      Math.abs(currentWidth - nextWidth) > 4 ? nextWidth : currentWidth,
    );
  }, [fileUrl]);

  return (
    <div className="rounded-lg bg-[#f4f6fb] p-4">
      <div className="h-[min(68dvh,760px)] min-h-[320px] overflow-y-auto overflow-x-hidden rounded-lg bg-[#eef2f7] p-3 md:min-h-[560px] md:p-4">
        <div
          ref={containerRef}
          className="mx-auto flex w-full max-w-[620px] min-w-0 flex-col gap-4"
        >
          {pageCount > 1 ? (
            <div className="flex justify-end">
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Preview halaman 1 dari {pageCount}
              </span>
            </div>
          ) : null}
          <Document
            file={fileUrl}
            loading={
              <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200 md:min-h-[560px]">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary-600" />
                  <p className="text-sm font-medium">Memuat preview dokumen...</p>
                </div>
              </div>
            }
            onLoadSuccess={({ numPages }: { numPages: number }) => {
              setPageCount(numPages);
              setHasError(false);
            }}
            onLoadError={() => {
              setHasError(true);
            }}
            error={
              <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-white px-4 text-center shadow-sm ring-1 ring-gray-200 md:min-h-[560px] md:px-6">
                <div>
                  <FileText className="mx-auto mb-3 h-7 w-7 text-gray-400" aria-hidden="true" />
                  <p className="text-base font-semibold text-gray-900">
                    Preview dokumen belum bisa ditampilkan
                  </p>
                </div>
              </div>
            }
          >
            {hasError ? null : (
              <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
                <Page
                  pageNumber={1}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div className="flex min-h-[320px] items-center justify-center md:min-h-[560px]">
                      <LoaderCircle className="h-7 w-7 animate-spin text-primary-600" />
                    </div>
                  }
                />
              </div>
            )}
          </Document>
        </div>
      </div>
    </div>
  );
}

export default function CetakDokumenClient() {
  const { openPreview } = useDocumentPreviewContext();
  const { showToast } = useAppToast();
  const [activeKind, setActiveKind] = useState<DocumentKind>("surat-masuk");
  const [reportScope, setReportScope] =
    useState<CorrespondenceReportScope>("my");
  const [availableReportScopes, setAvailableReportScopes] = useState<
    CorrespondenceReportScope[]
  >(["my"]);
  const [myReportFilter, setMyReportFilter] =
    useState<CorrespondenceMyReportFilter>("active");
  const [sortValue, setSortValue] = useState<"tanggal-desc" | "tanggal-asc">(
    "tanggal-desc",
  );
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printableData, setPrintableData] = useState<PrintableRecord[]>([]);
  const displayedReportScope: CorrespondenceReportScope = reportScope;
  const effectiveMyReportFilter = activeKind !== "surat-keluar"
    ? myReportFilter
    : undefined;
  const visibleReportScopeOptions =
    availableReportScopes.length > 0
      ? REPORT_SCOPE_OPTIONS.filter((option) =>
          availableReportScopes.includes(option.value),
        )
      : REPORT_SCOPE_OPTIONS;

  useEffect(() => {
    if (!availableReportScopes.includes(reportScope)) {
      setReportScope(availableReportScopes[0] ?? "my");
    }
  }, [availableReportScopes, reportScope]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);

      try {
        const { filters, items } = await correspondenceService.getPrintableDocuments({
          kind: activeKind,
          onlyWithFile: true,
          scope: displayedReportScope,
          myFilter:
            displayedReportScope === "my" ? effectiveMyReportFilter : undefined,
        });

        if (ignore) return;

        setAvailableReportScopes(
          filters.available_scopes.length > 0
            ? filters.available_scopes
            : [filters.scope],
        );
        if (filters.scope !== displayedReportScope) {
          setReportScope(filters.scope);
        }
        setPrintableData(
          items
            .map((item) => mapPrintableItem(item))
            .filter((item) => isValidFileUrl(item.fileUrl)),
        );
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat dokumen persuratan",
            "error",
          );
          setAvailableReportScopes(["my"]);
          setPrintableData([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [activeKind, displayedReportScope, effectiveMyReportFilter, showToast]);

  const baseRecords = useMemo(
    () => printableData.filter((record) => record.kind === activeKind),
    [activeKind, printableData],
  );

  const normalizedSearchValue = normalizeKeyword(searchValue);

  const filteredRecords = useMemo(
    () =>
      sortRecords(
        baseRecords.filter((record) =>
          record.searchText.includes(normalizedSearchValue),
        ),
        sortValue,
      ),
    [baseRecords, normalizedSearchValue, sortValue],
  );
  const {
    paginatedItems: paginatedRecords,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filteredRecords, OPERATIONAL_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [
    activeKind,
    displayedReportScope,
    effectiveMyReportFilter,
    resetPage,
    searchValue,
    sortValue,
  ]);

  const activeSelectedRecordId =
    filteredRecords.length === 0
      ? null
      : selectedRecordId &&
          filteredRecords.some((record) => record.id === selectedRecordId)
        ? selectedRecordId
        : filteredRecords[0].id;

  const selectedRecord = filteredRecords.find(
    (record) => record.id === activeSelectedRecordId,
  );
  const selectedRecordFileType = selectedRecord
    ? detectDocumentFileType(selectedRecord.fileUrl, selectedRecord.fileName)
    : "other";
  const selectedRecordHasFile = Boolean(
    selectedRecord && isValidFileUrl(selectedRecord.fileUrl),
  );
  const selectedRecordCanPrint =
    selectedRecordHasFile &&
    canDirectPrintFileType(selectedRecordFileType);

  const handleOpenPreview = () => {
    if (!selectedRecord) {
      showToast("Pilih dokumen terlebih dahulu.", "warning");
      return;
    }

    if (!isValidFileUrl(selectedRecord.fileUrl)) {
      showToast("File dokumen belum tersedia.", "warning");
      return;
    }

    openPreview(
      selectedRecord.fileUrl,
      formatDocumentFileName(selectedRecord.fileName),
    );
  };

  const handlePrint = () => {
    if (!selectedRecord) {
      showToast("Pilih dokumen yang ingin dicetak.", "warning");
      return;
    }

    if (!isValidFileUrl(selectedRecord.fileUrl)) {
      showToast("File dokumen belum tersedia.", "warning");
      return;
    }

    const fileType = detectDocumentFileType(
      selectedRecord.fileUrl,
      selectedRecord.fileName,
    );
    if (!canDirectPrintFileType(fileType)) {
      showToast(
        "Cetak langsung hanya tersedia untuk PDF, JPG, JPEG, dan PNG. File PPT/PPTX atau Office bisa dibuka/diunduh dulu.",
        "warning",
      );
      return;
    }

    const printStarted = printDocument(selectedRecord.fileUrl);

    if (!printStarted) {
      showToast(
        "Popup browser terblokir. Izinkan popup untuk mencetak.",
        "error",
      );
      return;
    }

    showToast("Dokumen dibuka ke mode cetak.", "success");
  };

  const handleChangeReportScope = (value: CorrespondenceReportScope) => {
    setReportScope(value);
    setSearchValue("");
    setSortValue("tanggal-desc");
    setSelectedRecordId(null);
  };

  const handleChangeMyReportFilter = (value: CorrespondenceMyReportFilter) => {
    setMyReportFilter(value);
    setSearchValue("");
    setSortValue("tanggal-desc");
    setSelectedRecordId(null);
  };

  return (
    <div className="space-y-6">
      <div className={SETUP_PAGE_PANEL_CLASS}>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
                Cakupan Dokumen
              </span>
              <div className={SETUP_PAGE_SEGMENTED_GROUP_CLASS}>
                {visibleReportScopeOptions.map((option) => {
                  const isActive = displayedReportScope === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChangeReportScope(option.value)}
                      className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} ${
                        isActive
                          ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
                          : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

              {activeKind !== "surat-keluar" && displayedReportScope === "my" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
                    Filter Saya
                  </span>
                  <div className={`${SETUP_PAGE_SEGMENTED_GROUP_CLASS} flex-wrap`}>
                    {MY_REPORT_FILTER_OPTIONS.map((option) => {
                      const isActive = myReportFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChangeMyReportFilter(option.value)}
                          className={`${SETUP_PAGE_SEGMENTED_BUTTON_BASE_CLASS} ${
                            isActive
                              ? SETUP_PAGE_SEGMENTED_BUTTON_ACTIVE_CLASS
                              : SETUP_PAGE_SEGMENTED_BUTTON_INACTIVE_CLASS
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <SetupSearchInput
                label="Cari Dokumen"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={getSearchPlaceholder(activeKind)}
              />
            </div>

            <div className="lg:col-span-3">
              <label className={`${SETUP_PAGE_SEARCH_LABEL_CLASS} block`}>
                Jenis Dokumen
              </label>
              <SetupSelect
                value={activeKind}
                onChange={(event) =>
                  setActiveKind(event.target.value as DocumentKind)
                }
              >
                <option value="surat-masuk">Surat Masuk</option>
                <option value="surat-keluar">Surat Keluar</option>
                <option value="memorandum">Memorandum</option>
              </SetupSelect>
            </div>

            <div className="lg:col-span-3">
              <label className={`${SETUP_PAGE_SEARCH_LABEL_CLASS} block`}>
                Urutkan
              </label>
              <SetupSelect
                value={sortValue}
                onChange={(event) =>
                  setSortValue(
                    event.target.value as "tanggal-desc" | "tanggal-asc",
                  )
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SetupSelect>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(380px,0.9fr)_minmax(560px,1.1fr)]">
        <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Daftar Dokumen
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {filteredRecords.length} dokumen sesuai filter
              </p>
            </div>
            <SetupStatusBadge
              status="Tersedia"
              label={getDocumentKindLabel(activeKind)}
              tone={getDocumentKindTone(activeKind)}
              showIcon={false}
            />
          </div>

          {isLoading ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
                <FileText
                  className="h-8 w-8 text-slate-900"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Memuat dokumen persuratan
              </h3>
              <p className="mt-1 max-w-md text-sm text-gray-500">
                Data surat masuk, surat keluar, dan memorandum sedang diambil
                dari server.
              </p>
            </div>
          ) : filteredRecords.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <SetupDataTable variant="document" density="compact">
                  <SetupDataTableColGroup>
                    <SetupDataTableCol style={{ width: "56px" }} />
                    {activeKind === "memorandum" ? (
                      <>
                        <SetupDataTableCol style={{ minWidth: "140px" }} />
                        <SetupDataTableCol style={{ minWidth: "220px" }} />
                        <SetupDataTableCol style={{ minWidth: "160px" }} />
                        <SetupDataTableCol style={{ minWidth: "150px" }} />
                        <SetupDataTableCol style={{ minWidth: "140px" }} />
                        <SetupDataTableCol style={{ minWidth: "150px" }} />
                      </>
                    ) : activeKind === "surat-keluar" ? (
                      <>
                        <SetupDataTableCol style={{ minWidth: "160px" }} />
                        <SetupDataTableCol style={{ minWidth: "140px" }} />
                        <SetupDataTableCol style={{ minWidth: "220px" }} />
                        <SetupDataTableCol style={{ minWidth: "120px" }} />
                        <SetupDataTableCol style={{ minWidth: "140px" }} />
                        <SetupDataTableCol style={{ minWidth: "110px" }} />
                        <SetupDataTableCol style={{ minWidth: "150px" }} />
                        <SetupDataTableCol style={{ minWidth: "150px" }} />
                        <SetupDataTableCol style={{ minWidth: "120px" }} />
                      </>
                    ) : (
                      <>
                        <SetupDataTableCol style={{ minWidth: "160px" }} />
                        <SetupDataTableCol style={{ minWidth: "140px" }} />
                        <SetupDataTableCol style={{ minWidth: "220px" }} />
                        <SetupDataTableCol style={{ minWidth: "110px" }} />
                        <SetupDataTableCol style={{ minWidth: "140px" }} />
                        <SetupDataTableCol style={{ minWidth: "150px" }} />
                        <SetupDataTableCol style={{ minWidth: "220px" }} />
                        <SetupDataTableCol style={{ minWidth: "220px" }} />
                      </>
                    )}
                  </SetupDataTableColGroup>
                  <SetupDataTableHead>
                    <SetupDataTableRow>
                      <SetupDataTableHeaderCell className="text-center">
                        No
                      </SetupDataTableHeaderCell>
                      {activeKind === "surat-masuk" ? (
                        <>
                          <SetupDataTableHeaderCell>
                            Nama Pengirim
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Nomor Surat
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell>
                            Perihal
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Sifat
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Tgl Penerimaan
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Tenggat
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell>
                            Keterangan Surat
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell>
                            Catatan Disposisi
                          </SetupDataTableHeaderCell>
                        </>
                      ) : null}
                      {activeKind === "surat-keluar" ? (
                        <>
                          <SetupDataTableHeaderCell>
                            Nama Penerima
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Nomor Surat
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell>
                            Alamat Penerima
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Media
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Tgl Pengiriman
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Sifat
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Batas Follow-up
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Status
                          </SetupDataTableHeaderCell>
                        </>
                      ) : null}
                      {activeKind === "memorandum" ? (
                        <>
                          <SetupDataTableHeaderCell className="text-center">
                            No Memo
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell>
                            Perihal
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell>
                            Divisi Asal
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell>
                            Pembuat
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Tanggal
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className="text-center">
                            Tenggat
                          </SetupDataTableHeaderCell>
                        </>
                      ) : null}
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody>
                    {paginatedRecords.map((record, index) => {
                      const isSelected = record.id === activeSelectedRecordId;
                      const number =
                        (paginationMeta.page - 1) * paginationMeta.limit +
                        index +
                        1;
                      const rowClassName = `cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1773B0]/25 ${
                        isSelected
                          ? "bg-sky-50/70"
                          : "hover:bg-gray-50 focus-visible:bg-gray-50"
                      }`;

                      return (
                        <SetupDataTableRow
                          key={record.id}
                          tabIndex={0}
                          onClick={() => setSelectedRecordId(record.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedRecordId(record.id);
                            }
                          }}
                          className={rowClassName}
                        >
                          <SetupDataTableCell className="text-center tabular-nums text-gray-600">
                            {number}
                          </SetupDataTableCell>

                          {record.kind === "surat-masuk" ? (
                            <>
                              <SetupDataTableCell className="max-w-[160px] font-semibold text-gray-900">
                                <p className="truncate">{record.primaryText}</p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center font-semibold tabular-nums text-gray-800">
                                {record.code}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="max-w-[220px] text-gray-700">
                                <p className="line-clamp-2">{record.subject}</p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center font-medium text-gray-700">
                                {record.record.sifat}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center text-gray-700">
                                {formatDate(record.sortDate)}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center text-gray-700">
                                {formatDeadlineValue(record.record.tenggatWaktu)}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="max-w-[220px] text-gray-600">
                                <p className="line-clamp-2">
                                  {record.record.keterangan ?? "-"}
                                </p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="max-w-[220px] text-gray-600">
                                <p className="line-clamp-2">
                                  {record.record.keteranganTenggat ?? "-"}
                                </p>
                              </SetupDataTableCell>
                            </>
                          ) : null}

                          {record.kind === "surat-keluar" ? (
                            <>
                              <SetupDataTableCell className="max-w-[160px] font-semibold text-gray-900">
                                <p className="truncate">
                                  {record.record.penerima}
                                </p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center font-semibold tabular-nums text-gray-800">
                                {record.code}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="max-w-[220px] text-gray-700">
                                <p className="line-clamp-2">
                                  {record.record.alamatPenerima}
                                </p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center font-semibold text-gray-900">
                                {record.record.media}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center text-gray-700">
                                {formatDate(record.sortDate)}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center font-medium text-gray-700">
                                {record.record.sifat}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center text-gray-700">
                                {formatDeadlineValue(record.record.tenggatWaktu)}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center">
                                <SetupStatusBadge
                                  status={record.record.statusLabel}
                                  label={record.record.statusLabel}
                                  className="mx-auto"
                                />
                              </SetupDataTableCell>
                            </>
                          ) : null}

                          {record.kind === "memorandum" ? (
                            <>
                              <SetupDataTableCell className="text-center font-semibold tabular-nums text-gray-800">
                                {record.code}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="max-w-[240px] text-gray-700">
                                <p className="line-clamp-2">{record.subject}</p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="max-w-[180px] text-gray-700">
                                <p className="truncate">
                                  {record.primaryText}
                                </p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="max-w-[160px] font-medium text-gray-700">
                                <p className="truncate">
                                  {record.secondaryText}
                                </p>
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center text-gray-700">
                                {formatDate(record.sortDate)}
                              </SetupDataTableCell>
                              <SetupDataTableCell className="text-center text-gray-700">
                                {formatDeadlineValue(record.record.tenggatWaktu)}
                              </SetupDataTableCell>
                            </>
                          ) : null}
                        </SetupDataTableRow>
                      );
                    })}
                  </SetupDataTableBody>
                </SetupDataTable>
              </div>
              <div className="border-t border-gray-100">
                <Pagination
                  page={paginationMeta.page}
                  lastPage={paginationMeta.lastPage}
                  total={paginationMeta.total}
                  limit={paginationMeta.limit}
                  isLoading={isLoading}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-[340px] items-center justify-center px-6">
              <SetupEmptyState
                title="Tidak ada dokumen yang sesuai"
                description="Ubah kata kunci pencarian atau ganti jenis dokumen untuk melihat data lain."
                icon={SearchX}
                isFiltered
                variant="table"
              />
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm xl:sticky xl:top-24 xl:self-start">
          {selectedRecord ? (
            <>
              <div className="px-5 py-5">
                <MiniPdfPreview
                  fileUrl={selectedRecord.fileUrl}
                  fileName={selectedRecord.fileName}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:grid-cols-2">
                <SetupViewButton
                  onClick={handleOpenPreview}
                  className="w-full justify-center"
                  title={
                    selectedRecordHasFile
                      ? "Preview dokumen"
                      : "File belum tersedia"
                  }
                  label="Preview"
                  disabled={!selectedRecordHasFile}
                />
                <button
                  type="button"
                  onClick={handlePrint}
                  className={`${SETUP_PAGE_PRIMARY_BUTTON_CLASS} w-full justify-center`}
                  title={
                    selectedRecordCanPrint
                      ? "Cetak dokumen"
                      : selectedRecordHasFile
                        ? "Cetak langsung hanya tersedia untuk PDF, JPG, JPEG, dan PNG"
                        : "File belum tersedia"
                  }
                  disabled={!selectedRecordCanPrint}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span>Cetak Dokumen</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center px-4 md:min-h-[560px] md:px-6">
              <SetupEmptyState
                title="Belum ada dokumen terpilih"
                description="Pilih salah satu dokumen untuk melihat preview dan mencetak file."
                icon={FileText}
                variant="table"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
