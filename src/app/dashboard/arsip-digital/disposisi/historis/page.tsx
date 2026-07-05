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
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileBadge2,
  History,
  XCircle,
} from "lucide-react";

import InputDokumenSectionTitle from "@/components/arsip-digital/input-dokumen/InputDokumenSectionTitle";
import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupViewButton from "@/components/ui/SetupViewButton";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import { disposisiArsipService } from "@/services/disposisi-arsip.service";
import type { Disposisi } from "@/types/arsip.types";
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
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
} from "@/components/ui/setupPageStyles";

function formatPersonName(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

const HISTORIS_DISPOSISI_TABLE_COLUMN_WIDTHS = [
  "52px",
  "160px",
  null,
  "128px",
  "124px",
  "124px",
  "152px",
  "80px",
] as const;
const REVOKE_ACCESS_FEATURE = "revoke";

function getDisposisiStatusLabel(
  statusKey: Disposisi["statusKey"],
): Disposisi["status"] {
  if (statusKey === "APPROVED") return "Disetujui";
  if (statusKey === "REJECTED") return "Ditolak";
  if (statusKey === "REVOKED") return "Dicabut";
  return "Menunggu Persetujuan";
}

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

type DetailInfoItemProps = {
  label: string;
  value?: React.ReactNode;
  helper?: React.ReactNode;
  className?: string;
};

function DetailInfoItem({
  label,
  value = "-",
  helper,
  className = "",
}: DetailInfoItemProps) {
  return (
    <div
      className={`space-y-1 rounded-xl border border-gray-200 bg-white px-4 py-3 ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      {helper ? <div className="text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
}

function DetailKeyValueRow({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-2 border-b border-slate-100 py-3 last:border-b-0 md:grid-cols-[144px_minmax(0,1fr)] ${className}`.trim()}
    >
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{children}</div>
    </div>
  );
}

export default function HistorisDisposisiPage() {
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { ensureCapability, ensureFeature, hasCapability, hasFeature } =
    useProtectedAction();
  const { openPreview } = useDocumentPreviewContext();
  const searchParams = useSearchParams();
  const filterLemariId = searchParams.get("lemariId");
  const filterKantorId = searchParams.get("kantorId");
  const menuUrl = "/dashboard/arsip-digital/disposisi/historis";
  const [reportScope, setReportScope] = useState<"my" | "all">("my");
  const [myReportFilter, setMyReportFilter] = useState<
    "all" | "requested" | "approved"
  >("all");
  const [historyItems, setHistoryItems] = useState<Disposisi[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Disposisi | null>(null);
  const [isRevokingAccess, setIsRevokingAccess] = useState(false);
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
  const canUpdateHistorisDisposisi = hasCapability(menuUrl, "update");
  const canRevokeHistorisDisposisi = hasFeature(
    menuUrl,
    REVOKE_ACCESS_FEATURE,
  );
  const canRevokeAccess = (item: Disposisi) =>
    canUpdateHistorisDisposisi &&
    canRevokeHistorisDisposisi &&
    item.statusKey === "APPROVED" &&
    item.isActiveAccess;

  useEffect(() => {
    resetPage();
  }, [filterKantorId, filterLemariId, myReportFilter, reportScope, resetPage]);

  async function handleRevokeAccess(item: Disposisi) {
    if (isRevokingAccess) return;
    if (!ensureCapability(menuUrl, "update")) return;
    if (!ensureFeature(menuUrl, REVOKE_ACCESS_FEATURE)) return;

    const confirmed = window.confirm("Cabut akses dokumen ini?");
    if (!confirmed) return;

    setIsRevokingAccess(true);
    try {
      const updated = await disposisiArsipService.revoke(item.id);
      setHistoryItems((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedItem((current) =>
        current?.id === updated.id ? updated : current,
      );
      showToast("Akses dokumen berhasil dicabut.", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mencabut akses dokumen.",
        "error",
      );
    } finally {
      setIsRevokingAccess(false);
    }
  }

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

      <SetupTableCard variant="workflow">
          <SetupDataTable variant="workflow" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
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
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {paginatedData.map((item, idx) => {
                const relatedUser =
                  reportScope === "my" && myReportFilter === "requested"
                    ? item.pemilik
                    : item.pemohon;

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
                        status={getDisposisiStatusLabel(item.statusKey)}
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
                          ...(canRevokeAccess(item)
                            ? [
                                {
                                  key: "revoke",
                                  label: "Cabut Akses",
                                  icon: XCircle,
                                  tone: "red" as const,
                                  disabled: isRevokingAccess,
                                  onClick: () => handleRevokeAccess(item),
                                },
                              ]
                            : []),
                        ]}
                        label={`Buka aksi untuk disposisi ${item.document?.kode ?? item.id}`}
                        menuLabel={`Aksi disposisi ${item.document?.kode ?? item.id}`}
                      />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                );
              })}
              {data.length === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={8}
                  icon={History}
                  tone="neutral"
                  isFiltered={
                    reportScope !== "all" ||
                    myReportFilter !== "all" ||
                    Boolean(filterKantorId) ||
                    Boolean(filterLemariId)
                  }
                  description={
                    isLoadingHistory
                      ? undefined
                      : "Riwayat tindak lanjut disposisi arsip akan tampil di sini."
                  }
                >
                  {isLoadingHistory
                    ? "Memuat riwayat disposisi..."
                    : "Belum ada riwayat disposisi pada tab ini."}
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
          title="Detail Disposisi"
          description={selectedItem.document?.kode ?? undefined}
          maxWidth="5xl"
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
              <InputDokumenSectionTitle
                title="Informasi Disposisi"
                description="Ringkasan permintaan akses dokumen dan hasil keputusan yang telah diproses."
              />
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
                <div className="space-y-4 self-start rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Identitas Dokumen
                      </p>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                          {selectedItem.document?.namaDokumen ?? "-"}
                        </h3>
                        <p className="text-base font-medium text-slate-500">
                          {selectedItem.document?.kode ?? "-"}
                        </p>
                      </div>
                    </div>
                    <SetupStatusBadge
                      status={getDisposisiStatusLabel(selectedItem.statusKey)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <DetailInfoItem
                      label="Tanggal Pengajuan"
                      value={formatDateOnly(selectedItem.tglPengajuan)}
                    />
                    <DetailInfoItem
                      label="Tanggal Aksi"
                      value={
                        selectedItem.tglAksi
                          ? formatDateOnly(selectedItem.tglAksi)
                          : "-"
                      }
                    />
                    <DetailInfoItem
                      label="Akses Berlaku Sampai"
                      value={
                        selectedItem.tglExpired
                          ? formatDateOnly(selectedItem.tglExpired)
                          : "-"
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailInfoItem
                      label="Jenis Dokumen"
                      value={selectedItem.document?.jenisDokumen ?? "-"}
                    />
                    <DetailInfoItem
                      label="Lokasi Penyimpanan"
                      value={selectedItem.document?.storage?.locationLabel ?? "-"}
                    />
                    <DetailInfoItem
                      label="Pemohon"
                      value={formatPersonName(selectedItem.pemohon)}
                    />
                    <DetailInfoItem
                      label="Pemilik Dokumen"
                      value={formatPersonName(selectedItem.pemilik)}
                    />
                  </div>
                </div>

                <div className="space-y-3 self-start rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                      <FileBadge2 className="size-5" strokeWidth={1.9} />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-950">
                        File Dokumen
                      </h4>
                      <p className="text-sm text-slate-500">
                        Preview mengikuti izin dan status disposisi.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <DetailKeyValueRow label="Nama File">
                      <span className="font-medium text-slate-900">
                        {selectedItem.document?.fileName ||
                          selectedItem.document?.namaDokumen ||
                          "-"}
                      </span>
                    </DetailKeyValueRow>
                    <DetailKeyValueRow label="Status Akses">
                      <SetupStatusBadge
                        status={
                          selectedItem.isActiveAccess ? "Aktif" : "Nonaktif"
                        }
                        label={
                          selectedItem.isActiveAccess ? "Aktif" : "Nonaktif"
                        }
                        tone={selectedItem.isActiveAccess ? "emerald" : "red"}
                      />
                    </DetailKeyValueRow>
                  </div>
                  <div className="flex items-center justify-end pt-1">
                    <SetupViewButton
                      onClick={() =>
                        canViewSelectedDocument
                          ? openPreview(
                              selectedItem.document!.fileUrl!,
                              selectedItem.document!.fileName ||
                                selectedItem.document!.namaDokumen,
                            )
                          : undefined
                      }
                      disabled={!canViewSelectedDocument}
                      title={
                        canViewSelectedDocument
                          ? "Preview dokumen"
                          : "Preview dokumen belum tersedia atau akses tidak aktif"
                      }
                      label="Preview"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <InputDokumenSectionTitle
                title="Catatan Keputusan"
                description="Alasan pengajuan dan catatan akhir dari proses disposisi."
              />
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailField label="Alasan Pengajuan" contentClassName="leading-7 text-gray-700">
                    {selectedItem.alasanPengajuan || "-"}
                  </DetailField>
                  <DetailField label="Catatan Aksi" contentClassName="leading-7 text-gray-700">
                    {selectedItem.alasanAksi || "-"}
                  </DetailField>
                </div>
              </div>
            </section>
          </div>
        </DashboardModal>
      ) : null}
    </DashboardPageShell>
  );
}
