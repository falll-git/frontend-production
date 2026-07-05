"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  SetupDataTable,
  SetupDataTableHead,
  SetupDataTableBody,
  SetupDataTableRow,
  SetupDataTableHeaderCell,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableColGroup,
  SetupDataTableCol,
  SetupTableCard,
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Eye,
  FileBarChart2,
} from "lucide-react";

import { exportToExcel } from "@/lib/utils/exportExcel";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import { formatDateOnly } from "@/lib/utils/date";
import { DEFAULT_PAGINATION_META, OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { peminjamanService } from "@/services/peminjaman.service";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
} from "@/components/ui/setupPageStyles";
import type { LoanStatusKey } from "@/types/arsip.types";
import type { Peminjaman } from "@/types/arsip.types";
import type { PaginationMeta } from "@/types/api.types";

const LAPORAN_PEMINJAMAN_TABLE_COLUMN_WIDTHS = [
  "52px",
  "152px",
  null,
  "108px",
  "104px",
  "104px",
  "116px",
  "116px",
  "112px",
  "148px",
  "84px",
] as const;

const INITIAL_PAGINATION_META: PaginationMeta = {
  ...DEFAULT_PAGINATION_META,
  limit: OPERATIONAL_TABLE_PAGE_SIZE,
};

const STATUS_FILTER_TO_API: Record<
  string,
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "HANDED_OVER"
  | "BORROWED"
  | "RETURNED"
  | "OVERDUE"
  | undefined
> = {
  Semua: undefined,
  "Menunggu Persetujuan": "PENDING",
  Disetujui: "APPROVED",
  "Sudah Diserahkan": "HANDED_OVER",
  Dipinjam: "BORROWED",
  Terlambat: "OVERDUE",
  Dikembalikan: "RETURNED",
  Ditolak: "REJECTED",
};

type LaporanPeminjamanRow = {
  id: string;
  kode: string;
  namaDokumen: string;
  peminjam: string;
  tanggalPinjam: string;
  tanggalPenyerahan: string | null | undefined;
  tanggalEstimasiPengembalian: string;
  tanggalPengembalian: string | null | undefined;
  statusKey: LoanStatusKey;
  statusText: string;
  approvedBy: string;
  isTerlambat: boolean;
  alasan: string;
  alasanApprove: string | null;
  alasanTolak: string | null;
  catatanPenyerahan: string | null;
  catatanPengembalian: string | null;
};

function formatPersonName(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return value;

  return trimmed
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusText(statusKey: LoanStatusKey, isOverdue: boolean) {
  switch (statusKey) {
    case "PENDING":
      return "Menunggu Persetujuan";
    case "APPROVED":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    case "HANDED_OVER":
      return isOverdue ? "Terlambat" : "Sudah Diserahkan";
    case "OVERDUE":
      return "Terlambat";
    case "BORROWED":
      return isOverdue ? "Terlambat" : "Dipinjam";
    case "RETURNED":
      return "Dikembalikan";
    default:
      return "Menunggu Persetujuan";
  }
}

function getStatusLabel(statusKey: LoanStatusKey, isOverdue: boolean) {
  switch (statusKey) {
    case "PENDING":
      return "Menunggu Persetujuan" as const;
    case "APPROVED":
      return "Disetujui" as const;
    case "REJECTED":
      return "Ditolak" as const;
    case "HANDED_OVER":
      return isOverdue ? ("Terlambat" as const) : ("Sudah Diserahkan" as const);
    case "OVERDUE":
      return "Terlambat" as const;
    case "BORROWED":
      return isOverdue ? ("Terlambat" as const) : ("Dipinjam" as const);
    case "RETURNED":
      return "Dikembalikan" as const;
    default:
      return "Menunggu Persetujuan" as const;
  }
}

function mapLoanReportRow(item: Peminjaman): LaporanPeminjamanRow {
  return {
    id: item.id,
    kode: item.document?.kode ?? "-",
    namaDokumen: item.document?.namaDokumen ?? "-",
    peminjam: item.peminjam,
    tanggalPinjam: item.tglPinjam,
    tanggalPenyerahan: item.tglPenyerahan,
    tanggalEstimasiPengembalian: item.tglKembali,
    tanggalPengembalian: item.tanggalDikembalikan ?? item.tglPengembalian,
    statusKey: item.statusKey,
    statusText: getStatusText(item.statusKey, item.isTerlambat),
    approvedBy:
      item.approverUser?.username ??
      item.approverUser?.name ??
      item.approver ??
      "-",
    isTerlambat: item.isTerlambat,
    alasan: item.alasan,
    alasanApprove: item.alasanApprove,
    alasanTolak: item.alasanTolak,
    catatanPenyerahan: item.catatanPenyerahan,
    catatanPengembalian: item.catatanPengembalian,
  };
}

export default function LaporanPeminjamanPage() {
  const { showToast } = useAppToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoans, setPageLoans] = useState<Peminjaman[]>([]);
  const [reportLoans, setReportLoans] = useState<Peminjaman[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(
    INITIAL_PAGINATION_META,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<LaporanPeminjamanRow | null>(
    null,
  );

  const normalizedFrom =
    dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom;
  const normalizedTo =
    dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo;

  const reportQuery = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: STATUS_FILTER_TO_API[filterStatus],
      requested_start_date_from: normalizedFrom || undefined,
      requested_start_date_to: normalizedTo || undefined,
    }),
    [debouncedSearch, filterStatus, normalizedFrom, normalizedTo],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportQuery]);

  useEffect(() => {
    let ignore = false;

    async function loadPage() {
      setIsLoading(true);
      try {
        const result = await peminjamanService.getReportPage({
          ...reportQuery,
          page: currentPage,
          limit: OPERATIONAL_TABLE_PAGE_SIZE,
        });
        if (ignore) return;
        setPageLoans(result.items);
        setPaginationMeta(result.meta);
      } catch (error) {
        if (!ignore) {
          setPageLoans([]);
          setPaginationMeta(INITIAL_PAGINATION_META);
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat laporan peminjaman.",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadPage();

    return () => {
      ignore = true;
    };
  }, [currentPage, reportQuery, showToast]);

  useEffect(() => {
    let ignore = false;

    async function loadReportRows() {
      try {
        const result = await peminjamanService.getReport(reportQuery);
        if (!ignore) setReportLoans(result);
      } catch {
        if (!ignore) setReportLoans([]);
      }
    }

    void loadReportRows();

    return () => {
      ignore = true;
    };
  }, [reportQuery]);

  const riwayatPeminjaman = useMemo(
    () => reportLoans.map((item) => mapLoanReportRow(item)),
    [reportLoans],
  );

  const paginatedData = useMemo(
    () => pageLoans.map((item) => mapLoanReportRow(item)),
    [pageLoans],
  );

  const totalAktif = useMemo(
    () =>
      riwayatPeminjaman.filter((item) =>
        ["HANDED_OVER", "BORROWED", "OVERDUE"].includes(item.statusKey),
      ).length,
    [riwayatPeminjaman],
  );

  const totalDikembalikan = useMemo(
    () =>
      riwayatPeminjaman.filter((item) => item.statusKey === "RETURNED").length,
    [riwayatPeminjaman],
  );

  const handleExport = async () => {
    await exportToExcel({
      filename: "laporan-peminjaman",
      sheetName: "Peminjaman",
      title: "Laporan Peminjaman Dokumen",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Kode", key: "kode", width: 15 },
        { header: "Nama Dokumen", key: "namaDokumen", width: 30 },
        { header: "Peminjam", key: "peminjam", width: 20 },
        { header: "Tanggal Pinjam", key: "tanggalPinjam", width: 18 },
        { header: "Tanggal Penyerahan", key: "tanggalPenyerahan", width: 20 },
        {
          header: "Tanggal Estimasi Pengembalian",
          key: "tanggalEstimasiPengembalian",
          width: 28,
        },
        {
          header: "Tanggal Pengembalian",
          key: "tanggalPengembalian",
          width: 22,
        },
        { header: "Disetujui Oleh", key: "approvedBy", width: 20 },
        { header: "Status", key: "status", width: 16 },
      ],
      data: riwayatPeminjaman.map((item, idx) => ({
        no: idx + 1,
        kode: item.kode,
        namaDokumen: item.namaDokumen,
        peminjam: item.peminjam,
        tanggalPinjam: formatDateOnly(item.tanggalPinjam),
        tanggalPenyerahan: formatDateOnly(item.tanggalPenyerahan),
        tanggalEstimasiPengembalian: formatDateOnly(
          item.tanggalEstimasiPengembalian,
        ),
        tanggalPengembalian: formatDateOnly(item.tanggalPengembalian),
        approvedBy: item.approvedBy,
        status: item.statusText,
      })),
    });
  };

  return (
    <DashboardPageShell>
      <FeatureHeader
        title="Laporan Peminjaman"
        subtitle="Daftar peminjaman dan pengembalian dokumen fisik."
        icon={<FileBarChart2 />}
        actions={
          <SetupExcelButton onClick={handleExport} />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Total Peminjaman
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {paginationMeta.total}
            </p>
          </div>
          <FileBarChart2 className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Sedang Dipinjam
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{totalAktif}</p>
          </div>
          <BookOpen className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Sudah Dikembalikan
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalDikembalikan}
            </p>
          </div>
          <CheckCircle2 className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
      </div>

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} mb-6`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
          <div>
            <SetupSearchInput
              label="Cari Dokumen"
              placeholder="Dokumen, peminjam..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
              Status Peminjaman
            </label>
            <SetupSelect
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Sudah Diserahkan">Sudah Diserahkan</option>
              <option value="Dipinjam">Dipinjam</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Dikembalikan">Dikembalikan</option>
              <option value="Ditolak">Ditolak</option>
            </SetupSelect>
          </div>

          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Dari Tanggal</label>
            <BasicDateInput value={dateFrom} onChange={setDateFrom} />
          </div>

          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Sampai Tanggal</label>
            <BasicDateInput value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      <SetupTableCard variant="report">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-4">
          <p className="text-sm font-medium text-gray-600">
            Menampilkan{" "}
            <span className="font-bold text-gray-900">{paginationMeta.total}</span>{" "}
            data
          </p>
        </div>
          <SetupDataTable variant="report" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {LAPORAN_PEMINJAMAN_TABLE_COLUMN_WIDTHS.map((width, index) => (
                <SetupDataTableCol
                  key={`${index}-${width ?? "flex"}`}
                  style={width ? { width } : undefined}
                />
              ))}
            </SetupDataTableColGroup>
            <SetupDataTableHead className="ltr:text-left rtl:text-right">
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Kode</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Nama Dokumen</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Peminjam</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tgl Pinjam</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tgl Serah</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Est. Kembali</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tgl Kembali</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Penyetuju</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-100">
              {paginatedData.map((item, idx) => (
                <SetupDataTableRow
                  key={item.id}
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} ${
                    item.isTerlambat ? "bg-red-50/30" : ""
                  } cursor-pointer hover:bg-gray-50/50`}
                  onDoubleClick={() => setSelectedItem(item)}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                      {item.kode}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-800`}>
                    <span className="block truncate" title={item.namaDokumen}>
                      {item.namaDokumen}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                    <span className="block truncate" title={formatPersonName(item.peminjam)}>
                      {formatPersonName(item.peminjam)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span className="block truncate tabular-nums" title={formatDateOnly(item.tanggalPinjam)}>
                      {formatDateOnly(item.tanggalPinjam)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span className="block truncate tabular-nums" title={formatDateOnly(item.tanggalPenyerahan)}>
                      {formatDateOnly(item.tanggalPenyerahan)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span
                      className="block truncate tabular-nums"
                      title={formatDateOnly(item.tanggalEstimasiPengembalian)}
                    >
                      {formatDateOnly(item.tanggalEstimasiPengembalian)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span
                      className="block truncate tabular-nums"
                      title={formatDateOnly(item.tanggalPengembalian)}
                    >
                      {formatDateOnly(item.tanggalPengembalian)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                    <span className="block truncate" title={formatPersonName(item.approvedBy)}>
                      {formatPersonName(item.approvedBy)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge
                      status={getStatusLabel(item.statusKey, item.isTerlambat)}
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <SetupActionMenu
                      items={[
                        {
                          key: "detail",
                          label: "Detail",
                          icon: Eye,
                          tone: "blue",
                          onClick: () => setSelectedItem(item),
                        },
                      ]}
                      label={`Buka aksi untuk peminjaman ${item.kode}`}
                      menuLabel={`Aksi peminjaman ${item.kode}`}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {paginationMeta.total === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={11}
                  icon={FileBarChart2}
                  tone="neutral"
                  isFiltered={
                    searchTerm.trim().length > 0 ||
                    filterStatus !== "Semua" ||
                    dateFrom.length > 0 ||
                    dateTo.length > 0
                  }
                  description={
                    isLoading
                      ? undefined
                      : "Laporan peminjaman fisik akan muncul setelah ada transaksi yang sesuai."
                  }
                >
                  {isLoading
                    ? "Memuat laporan peminjaman..."
                    : "Belum ada data peminjaman yang sesuai."}
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          onPageChange={setCurrentPage}
        />
      </SetupTableCard>

      {selectedItem ? (
        <DashboardModal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title="Detail Peminjaman"
          description={selectedItem.kode}
          maxWidth="4xl"
          bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
          footerClassName="flex justify-end border-t border-gray-100 bg-gray-50 p-6"
          footer={
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="uiverse-modal-button uiverse-modal-button--neutral"
            >
              Tutup
            </button>
          }
        >
          <div className="space-y-8">
            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Informasi Peminjaman
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ringkasan dokumen, peminjam, tanggal, dan status peminjaman.
                </p>
              </div>
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Identitas Dokumen
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {selectedItem.namaDokumen}
                    </h3>
                    <p className="text-base font-medium text-slate-500">
                      {selectedItem.kode}
                    </p>
                  </div>
                  <SetupStatusBadge
                    status={getStatusLabel(
                      selectedItem.statusKey,
                      selectedItem.isTerlambat,
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <DetailInfoItem
                    label="Peminjam"
                    value={formatPersonName(selectedItem.peminjam)}
                  />
                  <DetailInfoItem
                    label="Tanggal Pinjam"
                    value={formatDateOnly(selectedItem.tanggalPinjam)}
                  />
                  <DetailInfoItem
                    label="Est. Kembali"
                    value={formatDateOnly(selectedItem.tanggalEstimasiPengembalian)}
                  />
                  <DetailInfoItem
                    label="Tanggal Serah"
                    value={formatDateOnly(selectedItem.tanggalPenyerahan)}
                  />
                  <DetailInfoItem
                    label="Tanggal Kembali"
                    value={formatDateOnly(selectedItem.tanggalPengembalian)}
                  />
                  <DetailInfoItem
                    label="Penyetuju"
                    value={formatPersonName(selectedItem.approvedBy)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Catatan Peminjaman
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Alasan dan catatan proses yang tersimpan pada transaksi.
                </p>
              </div>
              <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2">
                <DetailInfoItem label="Alasan Peminjaman" value={selectedItem.alasan || "-"} />
                <DetailInfoItem
                  label="Catatan Persetujuan"
                  value={selectedItem.alasanApprove || "-"}
                />
                <DetailInfoItem
                  label="Catatan Penolakan"
                  value={selectedItem.alasanTolak || "-"}
                />
                <DetailInfoItem
                  label="Catatan Penyerahan"
                  value={selectedItem.catatanPenyerahan || "-"}
                />
                <DetailInfoItem
                  label="Catatan Pengembalian"
                  value={selectedItem.catatanPengembalian || "-"}
                  className="md:col-span-2"
                />
              </div>
            </section>
          </div>
        </DashboardModal>
      ) : null}
    </DashboardPageShell>
  );
}

type DetailInfoItemProps = {
  label: string;
  value: string;
  className?: string;
};

function DetailInfoItem({
  label,
  value,
  className = "",
}: DetailInfoItemProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
        {value}
      </p>
    </div>
  );
}
