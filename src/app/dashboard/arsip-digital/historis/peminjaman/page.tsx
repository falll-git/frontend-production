"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  SetupDataTable,
  SetupDataTableHead,
  SetupDataTableBody,
  SetupDataTableRow,
  SetupDataTableHeaderCell,
  SetupDataTableCell,
  SetupDataTableColGroup,
  SetupDataTableCol,
  SetupTableCard,
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  History,
} from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_EMPTY_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
} from "@/components/ui/setupPageStyles";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { formatDateOnly, parseDateString } from "@/lib/utils/date";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { peminjamanService } from "@/services/peminjaman.service";
import type { Peminjaman } from "@/types/arsip.types";

const HISTORIS_PEMINJAMAN_TABLE_COLUMN_WIDTHS = [
  "52px",
  "160px",
  null,
  "112px",
  "112px",
  "112px",
  "120px",
  "120px",
  "96px",
  "128px",
] as const;

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

function getDurationDays(startValue: string, endValue: string | null) {
  const startDate = parseDateString(startValue);
  const endDate = endValue ? parseDateString(endValue) : null;
  if (!startDate || !endDate) return 0;

  const oneDay = 24 * 60 * 60 * 1000;
  const diff = Math.round(
    (endDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0)) / oneDay,
  );

  return Number.isFinite(diff) ? Math.max(diff, 0) : 0;
}

function getDurationText(startValue: string, endValue: string | null) {
  return `${getDurationDays(startValue, endValue)} hari`;
}

export default function HistorisPeminjamanPage() {
  const { showToast } = useAppToast();
  const searchParams = useSearchParams();
  const filterLemariId = searchParams.get("lemariId");
  const filterKantorId = searchParams.get("kantorId");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeminjam, setFilterPeminjam] = useState("Semua");
  const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const result = await peminjamanService.getHistory({
          office_id: filterKantorId || undefined,
          cabinet_id: filterLemariId || undefined,
        });
        if (!ignore) setPeminjaman(result);
      } catch (error) {
        if (!ignore) {
          setPeminjaman([]);
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat riwayat peminjaman.",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsLoadingHistory(false);
      }
    }

    void loadHistory();

    return () => {
      ignore = true;
    };
  }, [filterKantorId, filterLemariId, showToast]);

  const historisPeminjaman = useMemo(() => {
    return peminjaman
      .filter((item) => item.statusKey === "RETURNED")
      .map((item) => {
        const tanggalPengembalian =
          item.tanggalDikembalikan ?? item.tglPengembalian ?? item.tglKembali;

        return {
          id: item.id,
          kode: item.document?.kode ?? "-",
          namaDokumen: item.document?.namaDokumen ?? "-",
          peminjam: item.peminjam,
          tanggalPinjam: item.tglPinjam,
          tanggalPenyerahan: item.tglPenyerahan,
          tanggalEstimasiPengembalian: item.tglKembali,
          tanggalPengembalian,
          durasiHari: getDurationDays(item.tglPinjam, tanggalPengembalian),
          durasi: getDurationText(item.tglPinjam, tanggalPengembalian),
          approvedBy:
            item.approverUser?.username ??
            item.approverUser?.name ??
            item.approver ??
            "-",
        };
      });
  }, [peminjaman]);

  const historisByLokasi = historisPeminjaman;

  const peminjamList = useMemo(
    () => [
      "Semua",
      ...Array.from(new Set(historisByLokasi.map((item) => item.peminjam))),
    ],
    [historisByLokasi],
  );

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return historisByLokasi.filter((item) => {
      const matchSearch =
        keyword.length === 0 ||
        item.namaDokumen.toLowerCase().includes(keyword) ||
        item.kode.toLowerCase().includes(keyword) ||
        item.peminjam.toLowerCase().includes(keyword);
      const matchPeminjam =
        filterPeminjam === "Semua" || item.peminjam === filterPeminjam;

      return matchSearch && matchPeminjam;
    });
  }, [filterPeminjam, historisByLokasi, searchTerm]);

  const totalPeminjaman = historisByLokasi.length;
  const totalPeminjam = new Set(historisByLokasi.map((item) => item.peminjam))
    .size;
  const avgDurasi = Math.round(
    historisByLokasi.length === 0
      ? 0
      : historisByLokasi.reduce((acc, item) => acc + item.durasiHari, 0) /
          historisByLokasi.length,
  );

  const {
    paginatedItems: paginatedData,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filteredData, OPERATIONAL_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [filterKantorId, filterLemariId, filterPeminjam, resetPage, searchTerm]);

  const handleExport = async () => {
    await exportToExcel({
      filename: "historis-peminjaman",
      sheetName: "Historis Peminjaman",
      title: "Historis Peminjaman Dokumen",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Kode", key: "kode", width: 18 },
        { header: "Nama Dokumen", key: "namaDokumen", width: 28 },
        { header: "Peminjam", key: "peminjam", width: 18 },
        { header: "Tgl Pinjam", key: "tanggalPinjam", width: 16 },
        { header: "Tgl Serah", key: "tanggalPenyerahan", width: 16 },
        { header: "Est. Kembali", key: "tanggalEstimasiPengembalian", width: 18 },
        { header: "Tgl Kembali", key: "tanggalPengembalian", width: 18 },
        { header: "Durasi", key: "durasi", width: 12 },
        { header: "Penyetuju", key: "approvedBy", width: 18 },
      ],
      data: filteredData.map((item, idx) => ({
        no: idx + 1,
        kode: item.kode,
        namaDokumen: item.namaDokumen,
        peminjam: formatPersonName(item.peminjam),
        tanggalPinjam: formatDateOnly(item.tanggalPinjam),
        tanggalPenyerahan: formatDateOnly(item.tanggalPenyerahan),
        tanggalEstimasiPengembalian: formatDateOnly(
          item.tanggalEstimasiPengembalian,
        ),
        tanggalPengembalian: formatDateOnly(item.tanggalPengembalian),
        durasi: item.durasi,
        approvedBy: formatPersonName(item.approvedBy),
      })),
    });
  };

  return (
    <DashboardPageShell>
      {filterLemariId || filterKantorId ? (
        <div className="mb-4">
          <Link
            href="/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan"
            className={SETUP_PAGE_BACK_BUTTON_CLASS}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Ruang Arsip Digital
          </Link>
        </div>
      ) : null}

      <FeatureHeader
        title="Historis Peminjaman Dokumen"
        subtitle="Riwayat peminjaman dokumen yang sudah dikembalikan."
        icon={<History />}
        actions={
          <SetupExcelButton onClick={handleExport} />
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Total Riwayat
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalPeminjaman}
            </p>
          </div>
          <History className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Jumlah Peminjam
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalPeminjam}
            </p>
          </div>
          <BookOpen className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Rata-rata Durasi
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {avgDurasi} hari
            </p>
          </div>
          <Clock3 className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
      </div>

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} mb-6`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
          <div>
            <SetupSearchInput
              label="Cari Dokumen"
              placeholder="Cari berdasarkan nama atau kode..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>
              Filter Peminjam
            </label>
            <SetupSelect
              value={filterPeminjam}
              onChange={(event) => setFilterPeminjam(event.target.value)}
            >
              {peminjamList.map((peminjam) => (
                <option key={peminjam} value={peminjam}>
                  {peminjam}
                </option>
              ))}
            </SetupSelect>
          </div>
        </div>
      </div>

      <SetupTableCard variant="report">
        <div className="border-b border-gray-100 bg-gray-50/50 p-4">
          <p className="text-sm font-medium text-gray-600">
            Menampilkan{" "}
            <span className="font-bold text-gray-900">{filteredData.length}</span>{" "}
            dari {historisByLokasi.length} riwayat
          </p>
        </div>
          <SetupDataTable variant="report" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {HISTORIS_PEMINJAMAN_TABLE_COLUMN_WIDTHS.map((width, index) => (
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
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Nama Dokumen
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Peminjam</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tgl Pinjam</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tgl Serah</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Est. Kembali
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Tgl Kembali
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Durasi
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Penyetuju
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-100">
              {paginatedData.map((item, idx) => (
                <SetupDataTableRow
                  key={item.id}
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} hover:bg-gray-50/50`}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
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
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                    <span className="block truncate" title={formatPersonName(item.peminjam)}>
                      {formatPersonName(item.peminjam)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span
                      className="block truncate tabular-nums"
                      title={formatDateOnly(item.tanggalPinjam)}
                    >
                      {formatDateOnly(item.tanggalPinjam)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span
                      className="block truncate tabular-nums"
                      title={formatDateOnly(item.tanggalPenyerahan)}
                    >
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
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CENTER_CELL_CLASS} font-semibold text-gray-900`}>
                    {item.durasi}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                    <span className="block truncate" title={formatPersonName(item.approvedBy)}>
                      {formatPersonName(item.approvedBy)}
                    </span>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {filteredData.length === 0 ? (
                <SetupDataTableRow>
                  <SetupDataTableCell colSpan={10} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                    {isLoadingHistory
                      ? "Memuat riwayat peminjaman..."
                      : "Belum ada riwayat peminjaman yang sesuai."}
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          onPageChange={setPage}
        />
      </SetupTableCard>
    </DashboardPageShell>
  );
}
