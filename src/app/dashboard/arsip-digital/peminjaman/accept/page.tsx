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
import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
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
  SETUP_PAGE_MODERN_EMPTY_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
} from "@/components/ui/setupPageStyles";

type ActionKind = "approve" | "reject" | "handover" | "return";

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

const INLINE_ACTION_BUTTON_CLASS =
  "inline-flex items-center justify-center p-1 text-gray-400 transition-colors focus:outline-none";

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getTahapLabel = (
  statusKey: "PENDING" | "APPROVED" | "HANDED_OVER" | "BORROWED",
) => {
  if (statusKey === "PENDING") return "Persetujuan";
  if (statusKey === "APPROVED") return "Penyerahan";
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
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    kode: string;
    namaDokumen: string;
    pemohon: string;
    tglPeminjaman: string;
    tglPengembalian: string;
    alasan: string;
    statusKey: "PENDING" | "APPROVED" | "HANDED_OVER" | "BORROWED";
  } | null>(null);
  const [actionType, setActionType] = useState<ActionKind | null>(null);
  const [tanggalAksi, setTanggalAksi] = useState("");
  const [catatanAksi, setCatatanAksi] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const data = useMemo(() => {
    return peminjaman
      .filter((item) =>
        ["PENDING", "APPROVED", "HANDED_OVER", "BORROWED"].includes(
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
        statusKey: item.statusKey as
          | "PENDING"
          | "APPROVED"
          | "HANDED_OVER"
          | "BORROWED",
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
    ["HANDED_OVER", "BORROWED"].includes(item.statusKey),
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
    <div className="animate-fade-in max-w-7xl mx-auto">
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
        <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
          <div className="overflow-x-auto">
            <SetupDataTable className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
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
                  <SetupDataTableRow key={item.id} className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} hover:bg-gray-50`}>
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
                      <div className="flex items-center justify-center gap-3">
                        {item.statusKey === "PENDING" &&
                        (canApprovePeminjaman || canRejectPeminjaman) ? (
                          <>
                            {canApprovePeminjaman ? (
                              <button
                                onClick={() => handleAction(item, "approve")}
                                className={`${INLINE_ACTION_BUTTON_CLASS} hover:text-emerald-600`}
                                title="Setujui"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : null}
                            {canRejectPeminjaman ? (
                              <button
                                onClick={() => handleAction(item, "reject")}
                                className={`${INLINE_ACTION_BUTTON_CLASS} hover:text-rose-600`}
                                title="Tolak"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : null}
                          </>
                        ) : null}

                        {canHandoverPeminjaman &&
                        item.statusKey === "APPROVED" ? (
                          <button
                            onClick={() => handleAction(item, "handover")}
                            className={`${INLINE_ACTION_BUTTON_CLASS} hover:text-amber-600`}
                            title="Serahkan Dokumen"
                          >
                            <Handshake className="w-4 h-4" />
                          </button>
                        ) : null}

                        {canReturnPeminjaman &&
                        ["HANDED_OVER", "BORROWED"].includes(item.statusKey) ? (
                          <button
                            onClick={() => handleAction(item, "return")}
                            className={`${INLINE_ACTION_BUTTON_CLASS} hover:text-emerald-600`}
                            title="Catat Pengembalian"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))}
                {data.length === 0 ? (
                  <SetupDataTableRow>
                    <SetupDataTableCell colSpan={9} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                      Tidak ada proses peminjaman yang sedang menunggu tindakan.
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
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <CheckCircle2 className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Semua Beres</h3>
          <p className="text-gray-500 mt-2">
            Tidak ada proses peminjaman yang sedang menunggu tindakan.
          </p>
        </div>
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
          bodyClassName="space-y-6 p-6"
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
                  isLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : actionType === "handover" ? (
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
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SummaryField label="Kode Dokumen">
              <span className="inline-flex rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                {selectedItem.kode}
              </span>
            </SummaryField>
            <SummaryField label="Nama Dokumen" contentClassName="font-semibold text-gray-900">
              {selectedItem.namaDokumen}
            </SummaryField>
            <SummaryField label="Peminjam" contentClassName="font-semibold text-gray-900">
              {formatPersonName(selectedItem.pemohon)}
            </SummaryField>
            <SummaryField label="Tahap">
              <SetupStatusBadge status={getTahapLabel(selectedItem.statusKey)} />
            </SummaryField>
            <SummaryField label="Tanggal Pinjam" contentClassName="font-medium text-gray-900">
              {formatDateOnly(selectedItem.tglPeminjaman)}
            </SummaryField>
            <SummaryField label="Tanggal Kembali" contentClassName="font-medium text-gray-900">
              {formatDateOnly(selectedItem.tglPengembalian)}
            </SummaryField>
            <SummaryField
              label="Alasan Peminjaman"
              className="md:col-span-2"
              contentClassName="leading-7 text-gray-700"
            >
              {selectedItem.alasan}
            </SummaryField>
          </section>

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
        </DashboardModal>
      ) : null}
    </div>
  );
}
