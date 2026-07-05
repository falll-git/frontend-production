"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  Eye,
  FileText,
  Info,
  Printer,
  SearchX,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import DashboardModal from "@/components/ui/DashboardModal";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu, {
  type SetupActionMenuItem,
} from "@/components/ui/SetupActionMenu";
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
import {
  SetupDocumentPreviewSkeleton,
  SetupSkeletonBlock,
} from "@/components/ui/SetupSkeleton";
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

function PrintPreviewInfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function PrintDetailInfoItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function PrintDetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function formatJoinedValues(values: string[] | undefined) {
  return values && values.length > 0 ? values.join(", ") : "-";
}

function getRecordPartyLabel(record: PrintableRecord) {
  if (record.kind === "surat-masuk") return "Pengirim";
  if (record.kind === "surat-keluar") return "Penerima";
  return "Divisi Asal";
}

function getRecordPartyValue(record: PrintableRecord) {
  if (record.kind === "surat-keluar") return record.record.penerima;
  return record.primaryText;
}

function getRecordPartyDetail(record: PrintableRecord) {
  if (record.kind === "surat-masuk") return record.record.alamatPengirim;
  if (record.kind === "surat-keluar") return record.record.alamatPenerima;
  return record.record.pembuatMemo;
}

function getRecordDateLabel(record: PrintableRecord) {
  if (record.kind === "surat-masuk") return "Tanggal Penerimaan";
  if (record.kind === "surat-keluar") return "Tanggal Pengiriman";
  return "Tanggal Memo";
}

function getRecordDeadlineValue(record: PrintableRecord) {
  if (record.kind === "surat-keluar") return "-";
  return formatDeadlineValue(record.record.tenggatWaktu);
}

function getRecordStatusLabel(record: PrintableRecord) {
  if (record.kind === "surat-keluar") return record.record.statusLabel;
  if (record.kind === "surat-masuk") return record.record.statusDisposisi;
  return record.record.statusLabel ?? "Memo";
}

function getRecordStorageLabel(record: PrintableRecord) {
  return (
    record.record.physicalStorageLabel ??
    record.record.storage?.locationLabel ??
    "-"
  );
}

function getRecordDescription(record: PrintableRecord) {
  if (record.kind === "surat-masuk") {
    return record.record.keterangan ?? "-";
  }

  if (record.kind === "surat-keluar") {
    return record.record.sifat;
  }

  return record.record.keterangan || "-";
}

function PrintDocumentDetailModal({
  record,
  onClose,
  onPreview,
  onPrint,
}: {
  record: PrintableRecord | null;
  onClose: () => void;
  onPreview: (record: PrintableRecord) => void;
  onPrint: (record: PrintableRecord) => void;
}) {
  if (!record) return null;

  const fileType = detectDocumentFileType(record.fileUrl, record.fileName);
  const hasFile = isValidFileUrl(record.fileUrl);
  const canPrint = hasFile && canDirectPrintFileType(fileType);
  const documentKindLabel = getDocumentKindLabel(record.kind);

  return (
    <DashboardModal
      isOpen={Boolean(record)}
      title="Detail Dokumen Cetak"
      description={`${documentKindLabel} - ${record.code}`}
      onClose={onClose}
      maxWidth="5xl"
      bodyClassName="space-y-6 p-5 sm:p-6"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[rgba(21,126,195,0.42)] bg-white px-5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-[rgba(21,126,195,0.05)] focus:outline-none focus:ring-2 focus:ring-[rgba(21,126,195,0.18)]"
          >
            Tutup
          </button>
          <SetupViewButton
            onClick={() => onPreview(record)}
            label="Preview"
            title={hasFile ? "Preview dokumen" : "File belum tersedia"}
            disabled={!hasFile}
          />
          <button
            type="button"
            onClick={() => onPrint(record)}
            className={`${SETUP_PAGE_PRIMARY_BUTTON_CLASS} justify-center`}
            title={
              canPrint
                ? "Cetak dokumen"
                : hasFile
                  ? "Cetak langsung hanya tersedia untuk PDF, JPG, JPEG, dan PNG"
                  : "File belum tersedia"
            }
            disabled={!canPrint}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Cetak Dokumen</span>
          </button>
        </>
      }
    >
      <PrintDetailSection
        title="Informasi Dokumen"
        description="Ringkasan dokumen, file arsip, dan status cetak yang tersedia."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Identitas Dokumen
                </p>
                <h4 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">
                  {record.subject}
                </h4>
                <p className="mt-2 break-words text-base font-semibold text-slate-500">
                  {record.code}
                </p>
              </div>
              <SetupStatusBadge
                status="Tersedia"
                label={documentKindLabel}
                tone={getDocumentKindTone(record.kind)}
                showIcon={false}
              />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <PrintDetailInfoItem
                label={getRecordPartyLabel(record)}
                value={getRecordPartyValue(record)}
              />
              <PrintDetailInfoItem
                label={getRecordDateLabel(record)}
                value={formatDate(record.sortDate)}
              />
              <PrintDetailInfoItem
                label="Status"
                value={getRecordStatusLabel(record)}
              />
              <PrintDetailInfoItem
                label="Lokasi Penyimpanan"
                value={getRecordStorageLabel(record)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#157EC3] shadow-sm ring-1 ring-slate-200">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h4 className="text-lg font-bold text-slate-950">
                  File Dokumen
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  File yang dipakai untuk preview dan proses cetak.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <PrintDetailInfoItem
                label="Nama File"
                value={formatDocumentFileName(record.fileName)}
                className="bg-white"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span className="text-sm font-semibold text-slate-600">
                  Status File
                </span>
                <SetupStatusBadge
                  status={canPrint ? "Tersedia" : hasFile ? "Preview" : "Kosong"}
                  label={
                    canPrint
                      ? "Bisa Dicetak"
                      : hasFile
                        ? "Preview Saja"
                        : "File Kosong"
                  }
                  tone={canPrint ? "emerald" : hasFile ? "blue" : "amber"}
                />
              </div>
            </div>
          </div>
        </div>
      </PrintDetailSection>

      <PrintDetailSection
        title="Detail Persuratan"
        description="Informasi operasional sesuai jenis dokumen yang dipilih."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <PrintDetailInfoItem
              label={getRecordPartyLabel(record)}
              value={getRecordPartyValue(record)}
            />
            <PrintDetailInfoItem
              label={
                record.kind === "surat-keluar"
                  ? "Alamat Penerima"
                  : record.kind === "surat-masuk"
                    ? "Alamat Pengirim"
                    : "Pembuat Memo"
              }
              value={getRecordPartyDetail(record)}
            />
            <PrintDetailInfoItem
              label="Sifat / Kategori"
              value={
                record.kind === "memorandum"
                  ? "Memorandum"
                  : record.record.sifat
              }
            />
            <PrintDetailInfoItem
              label="Tenggat"
              value={getRecordDeadlineValue(record)}
            />
            {record.kind === "surat-masuk" ? (
              <>
                <PrintDetailInfoItem
                  label="Disposisi Kepada"
                  value={formatJoinedValues(record.record.disposisiKepada)}
                />
                <PrintDetailInfoItem
                  label="Catatan Disposisi"
                  value={record.record.keteranganTenggat ?? "-"}
                />
              </>
            ) : null}
            {record.kind === "surat-keluar" ? (
              <PrintDetailInfoItem
                label="Media Pengiriman"
                value={record.record.media}
              />
            ) : null}
            {record.kind === "memorandum" ? (
              <>
                <PrintDetailInfoItem
                  label="Divisi Tujuan"
                  value={formatJoinedValues(record.record.divisiTujuanAwal)}
                />
                <PrintDetailInfoItem
                  label="Penerima"
                  value={formatJoinedValues(record.record.penerima)}
                />
              </>
            ) : null}
            <PrintDetailInfoItem
              label={record.kind === "surat-keluar" ? "Sifat Surat" : "Keterangan"}
              value={getRecordDescription(record)}
              className="md:col-span-2"
            />
          </div>
        </div>
      </PrintDetailSection>
    </DashboardModal>
  );
}

function PrintListLoadingSkeleton() {
  return (
    <div className="px-4 py-4" aria-label="Memuat dokumen persuratan">
      <div className="mb-4 flex items-center justify-between gap-4">
        <SetupSkeletonBlock className="h-4 w-40" />
        <SetupSkeletonBlock className="h-7 w-28 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`print-list-loading-${index}`}
            className="grid min-w-[560px] grid-cols-[40px_1fr_120px] items-center gap-4 rounded-lg border border-slate-100 bg-white px-3 py-3"
          >
            <SetupSkeletonBlock className="h-4 w-7" />
            <div className="min-w-0 space-y-2">
              <SetupSkeletonBlock className="h-4 w-2/3" />
              <SetupSkeletonBlock className="h-3 w-1/2" />
            </div>
            <SetupSkeletonBlock className="h-7 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PdfPreviewLoadingSkeleton() {
  return (
    <div
      className="min-h-[320px] rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 md:min-h-[560px]"
      aria-label="Menyiapkan preview dokumen"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <SetupSkeletonBlock className="h-4 w-36" />
        <SetupSkeletonBlock className="h-7 w-24 rounded-full" />
      </div>
      <div className="space-y-4">
        <SetupSkeletonBlock className="h-8 w-3/4" />
        <SetupSkeletonBlock className="h-4 w-full" />
        <SetupSkeletonBlock className="h-4 w-11/12" />
        <SetupSkeletonBlock className="h-[360px] w-full rounded-lg" />
      </div>
    </div>
  );
}

function PrintSelectedDocumentSkeleton() {
  return (
    <>
      <div className="border-b border-gray-100 bg-white px-5 py-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <SetupSkeletonBlock className="h-3 w-32" />
            <SetupSkeletonBlock className="h-7 w-3/4" />
            <SetupSkeletonBlock className="h-4 w-40" />
          </div>
          <SetupSkeletonBlock className="h-7 w-28 rounded-full" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`print-selected-loading-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <SetupSkeletonBlock className="h-3 w-28" />
              <SetupSkeletonBlock className="mt-3 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-5">
        <SetupDocumentPreviewSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:grid-cols-3">
        <SetupSkeletonBlock className="h-11 w-full" />
        <SetupSkeletonBlock className="h-11 w-full" />
        <SetupSkeletonBlock className="h-11 w-full" />
      </div>
    </>
  );
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
              <PdfPreviewLoadingSkeleton />
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
                    <PdfPreviewLoadingSkeleton />
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
  const [detailRecord, setDetailRecord] = useState<PrintableRecord | null>(
    null,
  );
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

  const openRecordPreview = (record: PrintableRecord | null | undefined) => {
    if (!record) {
      showToast("Pilih dokumen terlebih dahulu.", "warning");
      return;
    }

    if (!isValidFileUrl(record.fileUrl)) {
      showToast("File dokumen belum tersedia.", "warning");
      return;
    }

    openPreview(
      record.fileUrl,
      formatDocumentFileName(record.fileName),
    );
  };

  const printRecord = (record: PrintableRecord | null | undefined) => {
    if (!record) {
      showToast("Pilih dokumen yang ingin dicetak.", "warning");
      return;
    }

    if (!isValidFileUrl(record.fileUrl)) {
      showToast("File dokumen belum tersedia.", "warning");
      return;
    }

    const fileType = detectDocumentFileType(
      record.fileUrl,
      record.fileName,
    );
    if (!canDirectPrintFileType(fileType)) {
      showToast(
        "Cetak langsung hanya tersedia untuk PDF, JPG, JPEG, dan PNG. File PPT/PPTX atau Office bisa dibuka/diunduh dulu.",
        "warning",
      );
      return;
    }

    const printStarted = printDocument(record.fileUrl);

    if (!printStarted) {
      showToast(
        "Popup browser terblokir. Izinkan popup untuk mencetak.",
        "error",
      );
      return;
    }

    showToast("Dokumen dibuka ke mode cetak.", "success");
  };

  const handleOpenPreview = () => {
    openRecordPreview(selectedRecord);
  };

  const handlePrint = () => {
    printRecord(selectedRecord);
  };

  const handleOpenDetail = (record: PrintableRecord) => {
    setSelectedRecordId(record.id);
    setDetailRecord(record);
  };

  const handleChangeDocumentKind = (value: DocumentKind) => {
    setActiveKind(value);
    setSearchValue("");
    setSortValue("tanggal-desc");
    setSelectedRecordId(null);
    setDetailRecord(null);
  };

  const handleChangeReportScope = (value: CorrespondenceReportScope) => {
    setReportScope(value);
    setSearchValue("");
    setSortValue("tanggal-desc");
    setSelectedRecordId(null);
    setDetailRecord(null);
  };

  const handleChangeMyReportFilter = (value: CorrespondenceMyReportFilter) => {
    setMyReportFilter(value);
    setSearchValue("");
    setSortValue("tanggal-desc");
    setSelectedRecordId(null);
    setDetailRecord(null);
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
                  handleChangeDocumentKind(event.target.value as DocumentKind)
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.85fr)]">
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
            <PrintListLoadingSkeleton />
          ) : filteredRecords.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <SetupDataTable variant="document" density="compact">
                  <SetupDataTableColGroup>
                    <SetupDataTableCol style={{ width: "56px" }} />
                    <SetupDataTableCol style={{ minWidth: "260px" }} />
                    <SetupDataTableCol style={{ minWidth: "190px" }} />
                    <SetupDataTableCol style={{ minWidth: "150px" }} />
                    <SetupDataTableCol style={{ minWidth: "160px" }} />
                    <SetupDataTableCol style={{ width: "84px" }} />
                  </SetupDataTableColGroup>
                  <SetupDataTableHead>
                    <SetupDataTableRow>
                      <SetupDataTableHeaderCell className="text-center">
                        No
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell>
                        Dokumen
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell>
                        Pihak / Unit
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className="text-center">
                        Tanggal
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className="text-center">
                        Status File
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className="text-center">
                        Aksi
                      </SetupDataTableHeaderCell>
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
                      const fileType = detectDocumentFileType(
                        record.fileUrl,
                        record.fileName,
                      );
                      const hasFile = isValidFileUrl(record.fileUrl);
                      const canPrint = hasFile && canDirectPrintFileType(fileType);
                      const deadlineValue = getRecordDeadlineValue(record);
                      const actionItems: SetupActionMenuItem[] = [
                        {
                          key: "detail",
                          label: "Detail",
                          icon: Info,
                          tone: "blue",
                          onClick: () => handleOpenDetail(record),
                        },
                      ];

                      if (hasFile) {
                        actionItems.push({
                          key: "preview",
                          label: "Preview",
                          icon: Eye,
                          tone: "gray",
                          onClick: () => openRecordPreview(record),
                        });
                      }

                      if (canPrint) {
                        actionItems.push({
                          key: "print",
                          label: "Cetak",
                          icon: Printer,
                          tone: "emerald",
                          onClick: () => printRecord(record),
                        });
                      }

                      return (
                        <SetupDataTableRow
                          key={record.id}
                          tabIndex={0}
                          onClick={() => setSelectedRecordId(record.id)}
                          onDoubleClick={() => handleOpenDetail(record)}
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

                          <SetupDataTableCell className="max-w-[280px]">
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-semibold leading-6 text-gray-900">
                                {record.subject}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex max-w-full items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                                  {record.code}
                                </span>
                                <SetupStatusBadge
                                  status="Tersedia"
                                  label={getDocumentKindLabel(record.kind)}
                                  tone={getDocumentKindTone(record.kind)}
                                  showIcon={false}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </SetupDataTableCell>
                          <SetupDataTableCell className="max-w-[210px]">
                            <p className="truncate font-semibold text-gray-900">
                              {getRecordPartyValue(record)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                              {getRecordPartyDetail(record) || "-"}
                            </p>
                          </SetupDataTableCell>
                          <SetupDataTableCell className="text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                <CalendarDays
                                  className="h-4 w-4 text-[#157EC3]"
                                  aria-hidden="true"
                                />
                                {formatDate(record.sortDate)}
                              </span>
                              <span className="text-xs font-medium text-gray-500">
                                {record.kind === "surat-keluar"
                                  ? record.record.media
                                  : deadlineValue !== "-"
                                    ? `Tenggat ${deadlineValue}`
                                    : "Tanpa tenggat"}
                              </span>
                            </div>
                          </SetupDataTableCell>
                          <SetupDataTableCell className="text-center">
                            <div className="flex flex-col items-center gap-2">
                              <SetupStatusBadge
                                status={getRecordStatusLabel(record)}
                                label={getRecordStatusLabel(record)}
                                tone="slate"
                                size="sm"
                              />
                              <SetupStatusBadge
                                status={canPrint ? "Tersedia" : hasFile ? "Preview" : "Kosong"}
                                label={
                                  canPrint
                                    ? "Bisa Cetak"
                                    : hasFile
                                      ? "Preview"
                                      : "Tanpa File"
                                }
                                tone={canPrint ? "emerald" : hasFile ? "blue" : "amber"}
                                showIcon={false}
                                size="sm"
                              />
                            </div>
                          </SetupDataTableCell>
                          <SetupDataTableCell
                            className="text-center"
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            <SetupActionMenu
                              items={actionItems}
                              label={`Aksi ${record.code}`}
                              menuLabel={`Aksi dokumen ${record.code}`}
                            />
                          </SetupDataTableCell>
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
          {isLoading ? (
            <PrintSelectedDocumentSkeleton />
          ) : selectedRecord ? (
            <>
              <div className="border-b border-gray-100 bg-white px-5 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Dokumen Terpilih
                    </p>
                    <h3 className="mt-2 break-words text-xl font-semibold tracking-tight text-slate-950">
                      {selectedRecord.subject}
                    </h3>
                    <p className="mt-1 break-words text-sm font-medium text-slate-500">
                      {selectedRecord.code}
                    </p>
                  </div>
                  <SetupStatusBadge
                    status="Tersedia"
                    label={getDocumentKindLabel(selectedRecord.kind)}
                    tone={getDocumentKindTone(selectedRecord.kind)}
                    showIcon={false}
                  />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <PrintPreviewInfoItem
                    label={getRecordPartyLabel(selectedRecord)}
                    value={getRecordPartyValue(selectedRecord)}
                  />
                  <PrintPreviewInfoItem
                    label="Tanggal Dokumen"
                    value={formatDate(selectedRecord.sortDate)}
                  />
                  <PrintPreviewInfoItem
                    label="Nama File"
                    value={formatDocumentFileName(selectedRecord.fileName)}
                  />
                  <PrintPreviewInfoItem
                    label={
                      selectedRecord.kind === "surat-keluar"
                        ? "Status"
                        : "Tenggat"
                    }
                    value={
                      selectedRecord.kind === "surat-keluar"
                        ? selectedRecord.record.statusLabel
                        : formatDeadlineValue(selectedRecord.record.tenggatWaktu)
                    }
                  />
                </div>
              </div>

              <div className="px-5 py-5">
                <MiniPdfPreview
                  fileUrl={selectedRecord.fileUrl}
                  fileName={selectedRecord.fileName}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleOpenDetail(selectedRecord)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[rgba(21,126,195,0.42)] bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-[rgba(21,126,195,0.05)] focus:outline-none focus:ring-2 focus:ring-[rgba(21,126,195,0.18)]"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                  <span>Detail</span>
                </button>
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

      <PrintDocumentDetailModal
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        onPreview={openRecordPreview}
        onPrint={printRecord}
      />
    </div>
  );
}
