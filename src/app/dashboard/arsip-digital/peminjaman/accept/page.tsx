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
import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ClipboardCheck,
  Eye,
  FileBarChart2,
  Handshake,
  RotateCcw,
  X,
} from "lucide-react";
import BasicDateInput from "@/components/ui/BasicDateInput";
import { useAppToast } from "@/components/ui/AppToastProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupPrimaryButton from "@/components/ui/SetupPrimaryButton";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly } from "@/lib/utils/date";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
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
} from "@/components/ui/setupPageStyles";
import type { LoanStatusKey } from "@/types/arsip.types";

type ActionKind = "approve" | "reject" | "handover" | "return";
type ActiveLoanStatusKey = Extract<
  LoanStatusKey,
  "PENDING" | "APPROVED" | "HANDED_OVER" | "BORROWED" | "OVERDUE"
>;
type PeminjamanActionItem = {
  id: string;
  kode: string;
  namaDokumen: string;
  pemohon: string;
  tglPeminjaman: string;
  tglPengembalian: string;
  alasan: string;
  statusKey: ActiveLoanStatusKey;
  statusLabel: string;
};

const ACCEPT_PEMINJAMAN_TABLE_COLUMN_WIDTHS = [
  "52px",
  "132px",
  "160px",
  null,
  "108px",
  "112px",
  "112px",
  null,
  "84px",
] as const;

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getTahapLabel = (statusKey: ActiveLoanStatusKey) => {
  if (statusKey === "PENDING") return "Persetujuan";
  if (statusKey === "APPROVED") return "Penyerahan";
  if (statusKey === "OVERDUE") return "Terlambat";
  return "Pengembalian";
};

type SummaryFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

function SummaryField({
  label,
  children,
  className = "",
  contentClassName = "",
}: SummaryFieldProps) {
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

export default function AcceptPeminjamanPage() {
  const { showToast } = useAppToast();
  const { ensureCapability, ensureFeature, hasCapability, hasFeature } =
    useProtectedAction();
  const {
    peminjaman,
    approvePeminjaman,
    rejectPeminjaman,
    handoverPeminjaman,
    returnPeminjaman,
  } = useArsipDigitalWorkflow();
  const menuUrl = "/dashboard/arsip-digital/peminjaman/accept";
  const canUpdatePeminjaman = hasCapability(menuUrl, "update");
  const canApprovePeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "approve");
  const canRejectPeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "reject");
  const canHandoverPeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "handover");
  const canReturnPeminjaman =
    canUpdatePeminjaman && hasFeature(menuUrl, "return");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PeminjamanActionItem | null>(
    null,
  );
  const [detailItem, setDetailItem] = useState<PeminjamanActionItem | null>(null);
  const [actionType, setActionType] = useState<ActionKind | null>(null);
  const [tanggalAksi, setTanggalAksi] = useState("");
  const [catatanAksi, setCatatanAksi] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const data = useMemo(() => {
    return peminjaman
      .filter((item) =>
        ["PENDING", "APPROVED", "HANDED_OVER", "BORROWED", "OVERDUE"].includes(
          item.statusKey,
        ),
      )
      .map((item) => ({
        id: item.id,
        kode: item.document?.kode ?? "-",
        namaDokumen: item.document?.namaDokumen ?? item.detail,
        pemohon: item.borrower?.username ?? item.borrower?.name ?? item.peminjam,
        tglPeminjaman: item.tglPinjam,
        tglPengembalian: item.tglKembali,
        alasan: item.alasan,
        statusKey: item.statusKey as ActiveLoanStatusKey,
        statusLabel: item.status,
      }));
  }, [peminjaman]);

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setActionType(null);
    setTanggalAksi("");
    setCatatanAksi("");
  };

  const handleAction = (item: (typeof data)[0], type: ActionKind) => {
    if (!ensureCapability(menuUrl, "update")) {
      return;
    }

    if (!ensureFeature(menuUrl, type)) {
      return;
    }
    setSelectedItem(item);
    setActionType(type);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!ensureCapability(menuUrl, "update")) {
      return;
    }
    if (!selectedItem || !actionType) return;

    if (!ensureFeature(menuUrl, actionType)) {
      return;
    }

    const trimmedNote = catatanAksi.trim();

    if ((actionType === "approve" || actionType === "reject") && trimmedNote.length < 3) {
      showToast("Catatan persetujuan minimal 3 karakter.", "warning");
      return;
    }

    if (actionType === "handover" && !tanggalAksi) {
      showToast("Tanggal penyerahan wajib diisi.", "warning");
      return;
    }

    if (actionType === "return") {
      if (!tanggalAksi) {
        showToast("Tanggal pengembalian wajib diisi.", "warning");
        return;
      }

      if (trimmedNote.length < 3) {
        showToast("Catatan pengembalian minimal 3 karakter.", "warning");
        return;
      }
    }

    setIsLoading(true);
    try {
      switch (actionType) {
        case "approve":
          await approvePeminjaman({
            id: selectedItem.id,
            approvalNote: trimmedNote,
          });
          showToast("Permintaan peminjaman berhasil disetujui.", "success");
          break;
        case "reject":
          await rejectPeminjaman({
            id: selectedItem.id,
            rejectionNote: trimmedNote,
          });
          showToast("Permintaan peminjaman berhasil ditolak.", "warning");
          break;
        case "handover":
          await handoverPeminjaman({
            id: selectedItem.id,
            handoverAt: tanggalAksi,
            handoverNote: trimmedNote,
          });
          showToast("Dokumen berhasil diserahkan ke peminjam.", "success");
          break;
        case "return":
          await returnPeminjaman({
            id: selectedItem.id,
            returnedAt: tanggalAksi,
            returnNote: trimmedNote,
          });
          showToast("Pengembalian dokumen berhasil dicatat.", "success");
          break;
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Aksi peminjaman gagal diproses.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = data.filter((item) => item.statusKey === "PENDING").length;
  const approvedCount = data.filter((item) => item.statusKey === "APPROVED").length;
  const borrowedCount = data.filter((item) =>
    ["HANDED_OVER", "BORROWED", "OVERDUE"].includes(item.statusKey),
  ).length;
  const {
    paginatedItems: paginatedData,
    meta: paginationMeta,
    setPage,
  } = useClientPagination(data, OPERATIONAL_TABLE_PAGE_SIZE);

  const requiresDate = actionType === "handover" || actionType === "return";
  const requiresNote = true;

  const confirmLabel =
    actionType === "approve"
      ? "Setujui"
      : actionType === "reject"
        ? "Tolak"
        : actionType === "handover"
          ? "Serahkan"
          : "Simpan Pengembalian";

  return (
    <DashboardPageShell>
      <FeatureHeader
        title="Accept Peminjaman"
        subtitle="Kelola persetujuan, penyerahan, dan pengembalian dokumen fisik."
        icon={<ClipboardCheck />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Menunggu Persetujuan
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{pendingCount}</p>
          </div>
          <FileBarChart2 className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Siap Diserahkan
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{approvedCount}</p>
          </div>
          <Handshake className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Sedang Dipinjam
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{borrowedCount}</p>
          </div>
          <BookOpen className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
      </div>

      {data.length > 0 ? (
        <SetupTableCard variant="workflow">
            <SetupDataTable variant="workflow" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
              <SetupDataTableColGroup>
                {ACCEPT_PEMINJAMAN_TABLE_COLUMN_WIDTHS.map((width, index) => (
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
                    Tahap
                  </SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Kode
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
                  <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                    Alasan
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
                    className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer hover:bg-gray-50`}
                    onDoubleClick={() => setDetailItem(item)}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                      <SetupStatusBadge status={getTahapLabel(item.statusKey)} />
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
                      <span className="block truncate" title={formatPersonName(item.pemohon)}>
                        {formatPersonName(item.pemohon)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span className="block truncate tabular-nums" title={formatDateOnly(item.tglPeminjaman)}>
                        {formatDateOnly(item.tglPeminjaman)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span className="block truncate tabular-nums" title={formatDateOnly(item.tglPengembalian)}>
                        {formatDateOnly(item.tglPengembalian)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span className="block truncate" title={item.alasan}>
                        {item.alasan}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <div
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
                              onClick: () => setDetailItem(item),
                            },
                            ...(item.statusKey === "PENDING" &&
                            canApprovePeminjaman
                              ? [
                                  {
                                    key: "approve",
                                    label: "Setujui",
                                    icon: Check,
                                    tone: "emerald" as const,
                                    onClick: () => handleAction(item, "approve"),
                                  },
                                ]
                              : []),
                            ...(item.statusKey === "PENDING" && canRejectPeminjaman
                              ? [
                                  {
                                    key: "reject",
                                    label: "Tolak",
                                    icon: X,
                                    tone: "red" as const,
                                    onClick: () => handleAction(item, "reject"),
                                  },
                                ]
                              : []),
                            ...(item.statusKey === "APPROVED" &&
                            canHandoverPeminjaman
                              ? [
                                  {
                                    key: "handover",
                                    label: "Serahkan Dokumen",
                                    icon: Handshake,
                                    tone: "amber" as const,
                                    onClick: () => handleAction(item, "handover"),
                                  },
                                ]
                              : []),
                            ...(["HANDED_OVER", "BORROWED", "OVERDUE"].includes(
                              item.statusKey,
                            ) && canReturnPeminjaman
                              ? [
                                  {
                                    key: "return",
                                    label: "Catat Pengembalian",
                                    icon: RotateCcw,
                                    tone: "emerald" as const,
                                    onClick: () => handleAction(item, "return"),
                                  },
                                ]
                              : []),
                          ]}
                          label={`Buka aksi untuk peminjaman ${item.kode}`}
                          menuLabel={`Aksi peminjaman ${item.kode}`}
                        />
                      </div>
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}
                {data.length === 0 ? (
                  <SetupDataTableEmptyRow
                    colSpan={9}
                    icon={ClipboardCheck}
                    description="Permintaan baru, dokumen siap serah, dan pengembalian aktif akan muncul di sini."
                  >
                    Tidak ada proses peminjaman yang sedang menunggu tindakan.
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
      ) : (
        <SetupEmptyState
          title="Tidak ada proses peminjaman yang menunggu tindakan."
          description="Permintaan baru, dokumen siap serah, dan pengembalian aktif akan muncul di sini."
          icon={ClipboardCheck}
          variant="panel"
        />
      )}

      {showModal && selectedItem ? (
        <DashboardModal
          isOpen={showModal}
          onClose={closeModal}
          title={
            actionType === "approve"
              ? "Setujui Peminjaman"
              : actionType === "reject"
                ? "Tolak Peminjaman"
                : actionType === "handover"
                  ? "Serah Terima Dokumen"
                  : "Catat Pengembalian"
          }
          description="Tinjau data peminjaman dan lanjutkan prosesnya."
          maxWidth="3xl"
          bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
          footerClassName="flex flex-col justify-end gap-3 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row"
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                className="uiverse-modal-button uiverse-modal-button--neutral"
              >
                Batal
              </button>
              <SetupPrimaryButton
                onClick={() => void handleSubmit()}
                disabled={
                  (requiresNote && !catatanAksi.trim()) ||
                  (requiresDate && !tanggalAksi) ||
                  isLoading
                }
                className={actionType === "reject" ? "uiverse-modal-button--danger" : ""}
                icon={
                  actionType === "handover" ? (
                    <Handshake className="h-4 w-4" aria-hidden="true" />
                  ) : actionType === "return" ? (
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  ) : actionType === "reject" ? (
                    <X className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )
                }
              >
                {isLoading ? "Memproses..." : confirmLabel}
              </SetupPrimaryButton>
            </>
          }
        >
          <div className="space-y-8">
            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Informasi Peminjaman
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ringkasan dokumen, peminjam, dan tahap proses saat ini.
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
                  <SetupStatusBadge status={getTahapLabel(selectedItem.statusKey)} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SummaryField label="Peminjam" contentClassName="font-semibold text-gray-900">
                    {formatPersonName(selectedItem.pemohon)}
                  </SummaryField>
                  <SummaryField label="Tanggal Pinjam" contentClassName="font-medium text-gray-900">
                    {formatDateOnly(selectedItem.tglPeminjaman)}
                  </SummaryField>
                  <SummaryField label="Tanggal Kembali" contentClassName="font-medium text-gray-900">
                    {formatDateOnly(selectedItem.tglPengembalian)}
                  </SummaryField>
                </div>
                <SummaryField
                  label="Alasan Peminjaman"
                  contentClassName="leading-7 text-gray-700"
                >
                  {selectedItem.alasan}
                </SummaryField>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Tindak Lanjut
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Isi catatan dan tanggal sesuai aksi yang diproses.
                </p>
              </div>
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                {requiresDate ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {actionType === "handover" ? "Tanggal Penyerahan" : "Tanggal Pengembalian"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <BasicDateInput
                      value={tanggalAksi}
                      onChange={setTanggalAksi}
                    />
                  </div>
                ) : null}

                {requiresNote ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Catatan <span className="text-red-500">*</span>
                    </label>
                    <SetupTextarea
                      value={catatanAksi}
                      onChange={(event) => setCatatanAksi(event.target.value)}
                      placeholder="Tambahkan catatan singkat..."
                      className="resize-none"
                      rows={4}
                    />
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </DashboardModal>
      ) : null}

      {detailItem ? (
        <DashboardModal
          isOpen={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          title="Detail Peminjaman"
          description={detailItem.kode}
          maxWidth="4xl"
          bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
          footerClassName="flex justify-end border-t border-gray-100 bg-gray-50 p-6"
          footer={
            <button
              type="button"
              onClick={() => setDetailItem(null)}
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
                  Detail status peminjaman fisik dokumen.
                </p>
              </div>
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Identitas Dokumen
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {detailItem.namaDokumen}
                    </h3>
                    <p className="text-base font-medium text-slate-500">
                      {detailItem.kode}
                    </p>
                  </div>
                  <SetupStatusBadge status={getTahapLabel(detailItem.statusKey)} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SummaryField label="Peminjam" contentClassName="font-semibold text-gray-900">
                    {formatPersonName(detailItem.pemohon)}
                  </SummaryField>
                  <SummaryField label="Tanggal Pinjam" contentClassName="font-medium text-gray-900">
                    {formatDateOnly(detailItem.tglPeminjaman)}
                  </SummaryField>
                  <SummaryField label="Tanggal Kembali" contentClassName="font-medium text-gray-900">
                    {formatDateOnly(detailItem.tglPengembalian)}
                  </SummaryField>
                </div>
                <SummaryField
                  label="Alasan Peminjaman"
                  contentClassName="leading-7 text-gray-700"
                >
                  {detailItem.alasan}
                </SummaryField>
              </div>
            </section>
          </div>
        </DashboardModal>
      ) : null}
    </DashboardPageShell>
  );
}
