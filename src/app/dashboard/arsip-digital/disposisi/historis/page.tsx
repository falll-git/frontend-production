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
  SetupDataTableCol
} from "@/components/ui/SetupDataTable";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  XCircle,
} from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupViewButton from "@/components/ui/SetupViewButton";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import { disposisiArsipService } from "@/services/disposisi-arsip.service";
import type { Disposisi } from "@/types/arsip.types";
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
  SETUP_PAGE_TABLE_CARD_CLASS,
} from "@/components/ui/setupPageStyles";

function formatPersonName(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

const HISTORIS_DISPOSISI_TABLE_COLUMN_WIDTHS = [
  "52px",
  "160px",
  null,
  "108px",
  "112px",
  "112px",
  "152px",
  "108px",
] as const;

type DetailFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

function DetailField({
  label,
  children,
  className = "",
  contentClassName = "",
}: DetailFieldProps) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div
        className={`min-h-[48px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}

export default function HistorisDisposisiPage() {
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { openPreview } = useDocumentPreviewContext();
  const searchParams = useSearchParams();
  const filterLemariId = searchParams.get("lemariId");
  const filterKantorId = searchParams.get("kantorId");
  const [reportScope, setReportScope] = useState<"my" | "all">("my");
  const [myReportFilter, setMyReportFilter] = useState<
    "all" | "requested" | "approved"
  >("all");
  const [historyItems, setHistoryItems] = useState<Disposisi[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Disposisi | null>(null);
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const result = await disposisiArsipService.getHistory({
          office_id: filterKantorId || undefined,
          cabinet_id: filterLemariId || undefined,
        });
        if (!ignore) setHistoryItems(result);
      } catch (error) {
        if (!ignore) {
          setHistoryItems([]);
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat riwayat disposisi arsip.",
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

  const completedDisposisi = useMemo(
    () => historyItems.filter((item) => item.statusKey !== "PENDING"),
    [historyItems],
  );

  const filteredByLocation = completedDisposisi;

  const data = useMemo(() => {
    if (reportScope === "all") {
      return filteredByLocation;
    }

    if (!currentUserId) return [];

    return filteredByLocation.filter((item) => {
      if (myReportFilter === "requested") {
        return item.requester?.id === currentUserId;
      }

      if (myReportFilter === "approved") {
        if (item.actor?.id) {
          return item.actor.id === currentUserId;
        }
        return item.owner?.id === currentUserId;
      }

      return (
        item.requester?.id === currentUserId ||
        item.actor?.id === currentUserId ||
        item.owner?.id === currentUserId
      );
    });
  }, [reportScope, myReportFilter, currentUserId, filteredByLocation]);

  const totalApproved = useMemo(
    () => data.filter((item) => item.statusKey === "APPROVED").length,
    [data],
  );

  const totalRejected = useMemo(
    () => data.filter((item) => item.statusKey === "REJECTED").length,
    [data],
  );
  const {
    paginatedItems: paginatedData,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(data, OPERATIONAL_TABLE_PAGE_SIZE);

  const canViewSelectedDocument =
    Boolean(
      selectedItem &&
        selectedItem.statusKey === "APPROVED" &&
        selectedItem.canViewDocument &&
        selectedItem.document?.fileUrl,
    );

  useEffect(() => {
    resetPage();
  }, [filterKantorId, filterLemariId, myReportFilter, reportScope, resetPage]);

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
        title="Historis Disposisi"
        subtitle="Riwayat pengajuan akses dan keputusan dokumen arsip digital."
        icon={<History />}
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} mb-8`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cakupan Laporan</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setReportScope("my")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  reportScope === "my"
                    ? "bg-[#157ec3] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                Laporan Saya
              </button>
              <button
                type="button"
                onClick={() => setReportScope("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  reportScope === "all"
                    ? "bg-[#157ec3] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                Semua Disposisi
              </button>
            </div>
          </div>

          {reportScope === "my" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Filter Saya</span>
              <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                {([
                  ["all", "Semua"],
                  ["requested", "Permohonan"],
                  ["approved", "Persetujuan"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMyReportFilter(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      myReportFilter === key
                        ? "bg-[#157ec3] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Total Riwayat
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{data.length}</p>
          </div>
          <History className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Disetujui
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{totalApproved}</p>
          </div>
          <CheckCircle2 className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Ditolak
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{totalRejected}</p>
          </div>
          <XCircle className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
      </div>

      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className="overflow-x-auto">
          <SetupDataTable className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {HISTORIS_DISPOSISI_TABLE_COLUMN_WIDTHS.map((width, index) => (
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
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  {reportScope === "my" && myReportFilter === "requested"
                    ? "Pemilik"
                    : "Pemohon"}
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tgl Pengajuan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tgl Aksi</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  <span className="sr-only">View</span>
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {paginatedData.map((item, idx) => {
                const relatedUser =
                  reportScope === "my" && myReportFilter === "requested"
                    ? item.pemilik
                    : item.pemohon;
                const canView =
                  item.statusKey === "APPROVED" &&
                  item.canViewDocument &&
                  Boolean(item.document?.fileUrl);

                return (
                  <SetupDataTableRow
                    key={item.id}
                    onDoubleClick={() => setSelectedItem(item)}
                    className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer hover:bg-gray-50`}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                      <span
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums"
                        title={item.document?.kode ?? "-"}
                      >
                        {item.document?.kode ?? "-"}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                      <span className="block truncate" title={item.document?.namaDokumen ?? "-"}>
                        {item.document?.namaDokumen ?? "-"}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                      <span className="block truncate" title={formatPersonName(relatedUser || "-")}>
                        {formatPersonName(relatedUser || "-")}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span className="block truncate tabular-nums" title={formatDateOnly(item.tglPengajuan)}>
                        {formatDateOnly(item.tglPengajuan)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span className="block truncate tabular-nums" title={item.tglAksi ? formatDateOnly(item.tglAksi) : "-"}>
                        {item.tglAksi ? formatDateOnly(item.tglAksi) : "-"}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge
                        status={item.statusKey === "APPROVED" ? "Disetujui" : "Ditolak"}
                      />
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      {canView ? (
                        <div
                          className="flex items-center justify-center"
                          onClick={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                        >
                          <SetupViewButton
                            onClick={() =>
                              openPreview(
                                item.document!.fileUrl!,
                                item.document!.namaDokumen,
                              )
                            }
                            title="View dokumen"
                            label="View"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">-</span>
                      )}
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                );
              })}
              {data.length === 0 ? (
                <SetupDataTableRow>
                  <SetupDataTableCell
                    colSpan={8}
                    className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}
                  >
                    {isLoadingHistory
                      ? "Memuat riwayat disposisi..."
                      : "Belum ada riwayat disposisi pada tab ini."}
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </div>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          onPageChange={setPage}
        />
      </div>

      {selectedItem ? (
        <DashboardModal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title="Detail Disposisi"
          description={selectedItem.document?.kode ?? undefined}
          maxWidth="4xl"
          bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
          footerClassName="flex flex-col justify-end gap-3 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row"
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="uiverse-modal-button uiverse-modal-button--neutral"
              >
                Tutup
              </button>
              {canViewSelectedDocument ? (
                <SetupViewButton
                  onClick={() =>
                    openPreview(
                      selectedItem.document!.fileUrl!,
                      selectedItem.document!.namaDokumen,
                    )
                  }
                  title="View dokumen"
                />
              ) : null}
            </>
          }
        >
          <div className="space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Informasi Disposisi
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ringkasan permintaan akses dokumen dan hasil keputusan yang telah diproses.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailField label="Kode Dokumen">
                  <span
                    className="inline-flex rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 tabular-nums"
                    title={selectedItem.document?.kode ?? "-"}
                  >
                    {selectedItem.document?.kode ?? "-"}
                  </span>
                </DetailField>
                <DetailField label="Jenis Dokumen" contentClassName="font-medium text-gray-900">
                  {selectedItem.document?.jenisDokumen ?? "-"}
                </DetailField>
                <DetailField label="Nama Dokumen" contentClassName="font-semibold text-gray-900">
                  {selectedItem.document?.namaDokumen ?? "-"}
                </DetailField>
                <DetailField label="Lokasi Penyimpanan" contentClassName="leading-7 text-gray-700">
                  {selectedItem.document?.storage?.locationLabel ?? "-"}
                </DetailField>
                <DetailField label="Pemohon" contentClassName="font-semibold text-gray-900">
                  {formatPersonName(selectedItem.pemohon)}
                </DetailField>
                <DetailField label="Pemilik Dokumen" contentClassName="font-semibold text-gray-900">
                  {formatPersonName(selectedItem.pemilik)}
                </DetailField>
                <DetailField label="Status Akhir">
                  <SetupStatusBadge
                    status={selectedItem.statusKey === "APPROVED" ? "Disetujui" : "Ditolak"}
                  />
                </DetailField>
                <DetailField label="Akses Berlaku Sampai" contentClassName="font-medium text-gray-900">
                  {selectedItem.tglExpired ? formatDateOnly(selectedItem.tglExpired) : "-"}
                </DetailField>
                <DetailField label="Tanggal Pengajuan" contentClassName="font-medium text-gray-900">
                  {formatDateOnly(selectedItem.tglPengajuan)}
                </DetailField>
                <DetailField label="Tanggal Aksi" contentClassName="font-medium text-gray-900">
                  {selectedItem.tglAksi ? formatDateOnly(selectedItem.tglAksi) : "-"}
                </DetailField>
                <DetailField label="Alasan Pengajuan" className="md:col-span-2" contentClassName="leading-7 text-gray-700">
                  {selectedItem.alasanPengajuan || "-"}
                </DetailField>
                <DetailField label="Catatan Aksi" className="md:col-span-2" contentClassName="leading-7 text-gray-700">
                  {selectedItem.alasanAksi || "-"}
                </DetailField>
              </div>
            </section>
          </div>
        </DashboardModal>
      ) : null}
    </DashboardPageShell>
  );
}
