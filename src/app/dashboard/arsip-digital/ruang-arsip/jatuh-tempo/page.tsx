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
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Clock,
  FolderOpen,
  Hourglass,
} from "lucide-react";

import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
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
  SETUP_PAGE_WIDTH_2XL_CLASS,
} from "@/components/ui/setupPageStyles";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly, parseDateString } from "@/lib/utils/date";

type JatuhTempoRow = {
  id: string;
  namaDokumen: string;
  peminjam: string;
  tanggalPinjam: string;
  tanggalKembali: string;
  keterlambatanHari: number;
  kantorId: string | null;
};

const JATUH_TEMPO_TABLE_COLUMN_WIDTHS = [
  "56px",
  null,
  "188px",
  "152px",
  "152px",
  "140px",
] as const;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function diffInDays(later: Date, earlier: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.round((later.getTime() - earlier.getTime()) / oneDay),
  );
}

export default function JatuhTempoPage() {
  const { tempatPenyimpanan } = useArsipDigitalMasterData();
  const { peminjaman } = useArsipDigitalWorkflow();
  const searchParams = useSearchParams();
  const kantorId = searchParams.get("kantorId");
  const [searchTerm, setSearchTerm] = useState("");
  const today = useMemo(() => startOfDay(new Date()), []);

  const kantorName = useMemo(() => {
    if (!kantorId) return null;
    return (
      tempatPenyimpanan.find((tempat) => tempat.kodeKantor === kantorId)
        ?.namaKantor ?? null
    );
  }, [kantorId, tempatPenyimpanan]);

  const jatuhTempoRows = useMemo<JatuhTempoRow[]>(() => {
    return peminjaman
      .filter(
        (item) =>
          ["HANDED_OVER", "BORROWED", "OVERDUE"].includes(item.statusKey) &&
          item.isTerlambat,
      )
      .map((item) => {
        const dueDate = parseDateString(item.tglKembali);
        if (!dueDate) return null;

        const dueDay = startOfDay(dueDate);
        const officeCode = item.document?.storage?.officeCode ?? null;

        return {
          id: item.id,
          namaDokumen: item.document?.namaDokumen ?? "-",
          peminjam: item.peminjam,
          tanggalPinjam: item.tglPinjam,
          tanggalKembali: item.tglKembali,
          keterlambatanHari: diffInDays(today, dueDay),
          kantorId: officeCode,
        };
      })
      .filter((item): item is JatuhTempoRow => item !== null);
  }, [peminjaman, today]);

  const rowsByKantor = useMemo(() => {
    if (!kantorId) return jatuhTempoRows;
    return jatuhTempoRows.filter((item) => item.kantorId === kantorId);
  }, [jatuhTempoRows, kantorId]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rowsByKantor;
    return rowsByKantor.filter(
      (item) =>
        item.namaDokumen.toLowerCase().includes(query) ||
        item.peminjam.toLowerCase().includes(query),
    );
  }, [rowsByKantor, searchTerm]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort(
        (left, right) => right.keterlambatanHari - left.keterlambatanHari,
      ),
    [filteredRows],
  );
  const {
    paginatedItems: paginatedRows,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(sortedRows, OPERATIONAL_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [kantorId, resetPage, searchTerm]);

  const totalJatuhTempo = rowsByKantor.length;
  const terlama =
    rowsByKantor.length === 0
      ? 0
      : Math.max(...rowsByKantor.map((item) => item.keterlambatanHari));
  const rataRata =
    rowsByKantor.length === 0
      ? 0
      : Math.round(
          rowsByKantor.reduce((acc, item) => acc + item.keterlambatanHari, 0) /
            rowsByKantor.length,
        );

  const subtitle = kantorName
    ? `Daftar dokumen yang melewati batas waktu pengembalian. Kantor: ${kantorName}`
    : "Daftar dokumen yang melewati batas waktu pengembalian.";

  return (
    <DashboardPageShell>
      <div className="mb-4">
        <Link
          href="/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan"
          className={SETUP_PAGE_BACK_BUTTON_CLASS}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Ruang Arsip Digital
        </Link>
      </div>

      <FeatureHeader
        title="Peminjaman Jatuh Tempo"
        subtitle={subtitle}
        icon={<Clock />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Total Jatuh Tempo
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalJatuhTempo}
            </p>
          </div>
          <AlertTriangle className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Terlama
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {terlama} hari
            </p>
          </div>
          <Hourglass className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Rata-rata Keterlambatan
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {rataRata} hari
            </p>
          </div>
          <BarChart3 className="h-7 w-7 text-orange-500" aria-hidden="true" />
        </div>
      </div>

      <div className={`mb-6 ${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_2XL_CLASS}`}>
        <SetupSearchInput
          label="Cari Dokumen"
          placeholder="Cari nama dokumen atau peminjam..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <SetupTableCard variant="workflow" className="mx-auto max-w-[1280px]">
        <div className="border-b border-gray-100 p-4">
          <p className="text-sm text-gray-600">
            Menampilkan{" "}
            <span className="font-semibold">{sortedRows.length}</span> data
          </p>
        </div>
          <SetupDataTable variant="workflow" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {JATUH_TEMPO_TABLE_COLUMN_WIDTHS.map((width, index) => (
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
                  Nama Dokumen
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Peminjam
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Tgl Pinjam
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Tgl Kembali
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Keterlambatan
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {sortedRows.length > 0 ? (
                paginatedRows.map((item, index) => (
                  <SetupDataTableRow
                    key={item.id}
                    className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {(paginationMeta.page - 1) * paginationMeta.limit + index + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                      <span className="block truncate" title={item.namaDokumen}>
                        {item.namaDokumen}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-medium text-gray-700`}>
                      <span className="block truncate" title={item.peminjam}>
                        {item.peminjam}
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
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-medium text-red-600`}>
                      <span
                        className="block truncate tabular-nums"
                        title={formatDateOnly(item.tanggalKembali)}
                      >
                        {formatDateOnly(item.tanggalKembali)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge
                        status="Terlambat"
                        label={`${item.keterlambatanHari} hari`}
                      />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))
              ) : (
                <SetupDataTableRow>
                  <SetupDataTableCell
                    colSpan={6}
                    className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <FolderOpen className="mb-3 h-9 w-9 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">
                        Tidak ada dokumen yang jatuh tempo
                      </p>
                    </div>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              )}
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
