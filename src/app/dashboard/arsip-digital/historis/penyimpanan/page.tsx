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
  Archive,
  ArrowRightLeft,
  CirclePlus,
  Eye,
  Pencil,
} from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
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
import { useClientPagination } from "@/hooks/useClientPagination";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import { exportToExcel } from "@/lib/utils/exportExcel";

type StorageHistoryActionLabel =
  | "Input Baru"
  | "Pindah Lokasi"
  | "Perubahan Data"
  | "Hapus";

type StorageHistoryRow = {
  id: string;
  kode: string;
  namaDokumen: string;
  aksiKey: string;
  aksiLabel: StorageHistoryActionLabel;
  lokasiLama: string;
  lokasiBaru: string;
  user: string;
  tanggal: string;
  jam: string;
};

const ACTION_FILTERS = [
  "Semua",
  "Input Baru",
  "Pindah Lokasi",
  "Perubahan Data",
  "Hapus",
] as const;

const HISTORIS_PENYIMPANAN_TABLE_COLUMN_WIDTHS = [
  "52px",
  "124px",
  "72px",
  "160px",
  "152px",
  "164px",
  null,
  null,
  "112px",
  "84px",
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

function formatTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function mapActionLabel(
  actionKey: string,
  fallback: string,
): StorageHistoryActionLabel {
  switch (actionKey) {
    case "CREATED":
      return "Input Baru";
    case "STORAGE_MOVED":
      return "Pindah Lokasi";
    case "DELETED":
      return "Hapus";
    case "UPDATED":
    default:
      return fallback === "Hapus"
        ? "Hapus"
        : fallback === "Input Baru"
          ? "Input Baru"
          : fallback === "Pindah Lokasi"
            ? "Pindah Lokasi"
            : "Perubahan Data";
  }
}

export default function HistorisPenyimpananPage() {
  const { aktivitasPenyimpanan } = useArsipDigitalWorkflow();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAksi, setFilterAksi] =
    useState<(typeof ACTION_FILTERS)[number]>("Semua");
  const [selectedItem, setSelectedItem] = useState<StorageHistoryRow | null>(
    null,
  );

  const historisPenyimpanan = useMemo<StorageHistoryRow[]>(() => {
    return aktivitasPenyimpanan.map((item) => {
      const aksiLabel = mapActionLabel(item.actionKey, item.actionLabel);

      return {
        id: item.id,
        kode: item.document?.documentNumber ?? "-",
        namaDokumen: item.document?.documentName ?? "-",
        aksiKey: item.actionKey,
        aksiLabel,
        lokasiLama: item.fromStorage?.locationLabel ?? "-",
        lokasiBaru: item.toStorage?.locationLabel ?? "-",
        user:
          item.actor?.username ?? item.actor?.name ?? item.actor?.email ?? "-",
        tanggal: item.createdAt,
        jam: formatTimeLabel(item.createdAt),
      };
    });
  }, [aktivitasPenyimpanan]);

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return historisPenyimpanan.filter((item) => {
      const matchSearch =
        keyword.length === 0 ||
        item.namaDokumen.toLowerCase().includes(keyword) ||
        item.kode.toLowerCase().includes(keyword) ||
        item.user.toLowerCase().includes(keyword) ||
        item.aksiLabel.toLowerCase().includes(keyword);

      const matchAksi = filterAksi === "Semua" || item.aksiLabel === filterAksi;

      return matchSearch && matchAksi;
    });
  }, [filterAksi, historisPenyimpanan, searchTerm]);

  const totalInputBaru = useMemo(
    () =>
      historisPenyimpanan.filter((item) => item.aksiLabel === "Input Baru")
        .length,
    [historisPenyimpanan],
  );

  const totalPindahLokasi = useMemo(
    () =>
      historisPenyimpanan.filter((item) => item.aksiLabel === "Pindah Lokasi")
        .length,
    [historisPenyimpanan],
  );

  const totalPerubahanData = useMemo(
    () =>
      historisPenyimpanan.filter((item) => item.aksiLabel === "Perubahan Data")
        .length,
    [historisPenyimpanan],
  );

  const {
    paginatedItems: paginatedData,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filteredData, OPERATIONAL_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [filterAksi, resetPage, searchTerm]);

  const handleExport = async () => {
    await exportToExcel({
      filename: "historis-penyimpanan",
      sheetName: "Historis Penyimpanan",
      title: "Historis Penyimpanan Dokumen",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Tanggal", key: "tanggal", width: 16 },
        { header: "Jam", key: "jam", width: 10 },
        { header: "Kode", key: "kode", width: 18 },
        { header: "Nama Dokumen", key: "namaDokumen", width: 30 },
        { header: "Aksi", key: "aksi", width: 18 },
        { header: "Lokasi Lama", key: "lokasiLama", width: 30 },
        { header: "Lokasi Baru", key: "lokasiBaru", width: 30 },
        { header: "User", key: "user", width: 18 },
      ],
      data: filteredData.map((item, idx) => ({
        no: idx + 1,
        tanggal: formatDateOnly(item.tanggal),
        jam: item.jam,
        kode: item.kode,
        namaDokumen: item.namaDokumen,
        aksi: item.aksiLabel,
        lokasiLama: item.lokasiLama,
        lokasiBaru: item.lokasiBaru,
        user: formatPersonName(item.user),
      })),
    });
  };

  return (
    <DashboardPageShell>
      <FeatureHeader
        title="Historis Penyimpanan"
        subtitle="Riwayat perubahan lokasi dan aktivitas dokumen arsip digital."
        icon={<Archive />}
        actions={
          <SetupExcelButton onClick={handleExport} />
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Total Aktivitas
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {historisPenyimpanan.length}
            </p>
          </div>
          <Archive className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Input Baru
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalInputBaru}
            </p>
          </div>
          <CirclePlus className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Pindah Lokasi
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalPindahLokasi}
            </p>
          </div>
          <ArrowRightLeft
            className="h-7 w-7 text-slate-900"
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Perubahan Data
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalPerubahanData}
            </p>
          </div>
          <Pencil className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
      </div>

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} mb-6`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
          <div>
            <SetupSearchInput
              label="Cari"
              placeholder="Cari dokumen, aksi, atau user..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Filter Aksi</label>
            <SetupSelect
              value={filterAksi}
              onChange={(event) =>
                setFilterAksi(
                  event.target.value as (typeof ACTION_FILTERS)[number],
                )
              }
            >
              {ACTION_FILTERS.map((aksi) => (
                <option key={aksi} value={aksi}>
                  {aksi}
                </option>
              ))}
            </SetupSelect>
          </div>
        </div>
      </div>

      <SetupTableCard variant="report">
          <SetupDataTable variant="report" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {HISTORIS_PENYIMPANAN_TABLE_COLUMN_WIDTHS.map((width, index) => (
                <SetupDataTableCol
                  key={`${index}-${width ?? "flex"}`}
                  style={width ? { width } : undefined}
                />
              ))}
            </SetupDataTableColGroup>
            <SetupDataTableHead className="ltr:text-left rtl:text-right">
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>No</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tanggal</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Jam</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Kode</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Nama Dokumen
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Jenis Aksi
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Lokasi Lama
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Lokasi Baru
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>User</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-100">
              {paginatedData.map((item, idx) => (
                <SetupDataTableRow
                  key={item.id}
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer hover:bg-gray-50/50`}
                  onDoubleClick={() => setSelectedItem(item)}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span
                      className="block truncate tabular-nums"
                      title={formatDateOnly(item.tanggal)}
                    >
                      {formatDateOnly(item.tanggal)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span className="block truncate tabular-nums" title={item.jam}>
                      {item.jam}
                    </span>
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
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={item.aksiLabel} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span className="block truncate" title={item.lokasiLama}>
                      {item.lokasiLama}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-medium text-gray-900`}>
                    <span className="block truncate" title={item.lokasiBaru}>
                      {item.lokasiBaru}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                    <span
                      className="block truncate"
                      title={formatPersonName(item.user)}
                    >
                      {formatPersonName(item.user)}
                    </span>
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
                      label={`Buka aksi untuk historis penyimpanan ${item.kode}`}
                      menuLabel={`Aksi historis penyimpanan ${item.kode}`}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {filteredData.length === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={10}
                  icon={Archive}
                  tone="neutral"
                  isFiltered={searchTerm.trim().length > 0 || filterAksi !== "Semua"}
                  description="Riwayat perpindahan, input, dan perubahan lokasi dokumen akan tampil di sini."
                >
                  Belum ada data historis penyimpanan yang sesuai.
                </SetupDataTableEmptyRow>
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

      {selectedItem ? (
        <DashboardModal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title="Detail Historis Penyimpanan"
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
                  Informasi Aktivitas
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ringkasan aktivitas penyimpanan dan perubahan lokasi dokumen.
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
                  <SetupStatusBadge status={selectedItem.aksiLabel} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <DetailInfoItem
                    label="Tanggal"
                    value={formatDateOnly(selectedItem.tanggal)}
                  />
                  <DetailInfoItem label="Jam" value={selectedItem.jam} />
                  <DetailInfoItem
                    label="User"
                    value={formatPersonName(selectedItem.user)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Lokasi Penyimpanan
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Lokasi sebelum dan sesudah aktivitas tercatat.
                </p>
              </div>
              <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2">
                <DetailInfoItem
                  label="Lokasi Lama"
                  value={selectedItem.lokasiLama}
                />
                <DetailInfoItem
                  label="Lokasi Baru"
                  value={selectedItem.lokasiBaru}
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
};

function DetailInfoItem({ label, value }: DetailInfoItemProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}
