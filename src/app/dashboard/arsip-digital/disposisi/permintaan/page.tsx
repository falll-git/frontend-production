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
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, Inbox, X } from "lucide-react";
import DashboardModal from "@/components/ui/DashboardModal";
import BasicDateInput from "@/components/ui/BasicDateInput";
import Pagination from "@/components/ui/Pagination";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { formatDateOnly, parseDateString } from "@/lib/utils/date";
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

const PERMINTAAN_DISPOSISI_TABLE_COLUMN_WIDTHS = [
  "56px",
  "168px",
  null,
  null,
  "124px",
  "128px",
  null,
  "216px",
  "72px",
] as const;

const INLINE_ACTION_BUTTON_CLASS =
  "inline-flex items-center justify-center p-1 text-gray-400 transition-colors focus:outline-none";

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

type SummaryFieldProps = {
  label: string;
  children: ReactNode;
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

export default function PermintaanDisposisiPage() {
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability, hasFeature } = useProtectedAction();
  const { disposisi, processDisposisi } = useArsipDigitalWorkflow();
  const menuUrl = "/dashboard/arsip-digital/disposisi/permintaan";
  const canUpdatePermintaanDisposisi = hasCapability(
    menuUrl,
    "update",
  );
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    kode: string;
    namaDokumen: string;
    detail: string;
    pemohon: string;
    tglPengajuan: string;
    tglExpired: string | null;
    alasan: string;
    ownerId: string | null;
  } | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [tanggalExpired, setTanggalExpired] = useState("");
  const [alasanAksi, setAlasanAksi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const todayKey = useMemo(() => new Date().toDateString(), []);

  const data = useMemo(() => {
    return disposisi
      .filter((item) => item.statusKey === "PENDING")
      .map((item) => ({
        id: item.id,
        kode: item.document?.kode ?? "-",
        namaDokumen: item.document?.namaDokumen ?? "-",
        detail: item.document?.detail ?? item.detail,
        pemohon: item.requester?.username ?? item.requester?.name ?? item.pemohon,
        tglPengajuan: item.tglPengajuan,
        tglExpired: item.tglExpired,
        alasan: item.alasanPengajuan,
        ownerId: item.owner?.id ?? null,
      }));
  }, [disposisi]);

  const approvedTodayCount = useMemo(() => {
    if (!user?.id) return 0;

    return disposisi.filter((item) => {
      if (item.owner?.id !== user.id || item.statusKey !== "APPROVED" || !item.tglAksi) {
        return false;
      }

      const actionDate = parseDateString(item.tglAksi);
      return actionDate?.toDateString() === todayKey;
    }).length;
  }, [disposisi, todayKey, user?.id]);

  const canProcessItem = (
    item: (typeof data)[0],
    type: "approve" | "reject",
  ) => {
    if (!canUpdatePermintaanDisposisi) return false;
    if (item.ownerId && item.ownerId === user?.id) return true;
    return hasFeature(menuUrl, type);
  };

  const {
    paginatedItems: paginatedData,
    meta: paginationMeta,
    setPage,
  } = useClientPagination(data, OPERATIONAL_TABLE_PAGE_SIZE);

  const handleAction = (
    item: (typeof data)[0],
    type: "approve" | "reject",
  ) => {
    if (!ensureCapability(menuUrl, "update")) {
      return;
    }

    if (!canProcessItem(item, type)) {
      showToast("Anda tidak memiliki akses untuk memproses permintaan ini.", "warning");
      return;
    }
    setSelectedItem(item);
    setActionType(type);
    setTanggalExpired(type === "approve" ? item.tglExpired ?? "" : "");
    setAlasanAksi("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!ensureCapability(menuUrl, "update")) {
      return;
    }
    if (!selectedItem || !actionType) return;

    if (!canProcessItem(selectedItem, actionType)) {
      showToast("Anda tidak memiliki akses untuk memproses permintaan ini.", "warning");
      return;
    }

    const trimmedReason = alasanAksi.trim();

    if (actionType === "approve" && !tanggalExpired) {
      showToast("Tanggal expired wajib diisi.", "warning");
      return;
    }

    if (trimmedReason.length < 3) {
      showToast("Catatan aksi minimal 3 karakter.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await processDisposisi({
        id: selectedItem.id,
        action: actionType,
        alasanAksi: trimmedReason,
        tanggalExpired,
      });

      if (!updated) {
        showToast("Data disposisi tidak valid atau sudah diproses.", "warning");
        return;
      }

      setShowModal(false);
      showToast(
        actionType === "approve"
          ? "Akses dokumen berhasil disetujui."
          : "Permintaan akses berhasil ditolak.",
        actionType === "approve" ? "success" : "warning",
      );
      setSelectedItem(null);
      setActionType(null);
      setTanggalExpired("");
      setAlasanAksi("");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Permintaan gagal diproses.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardPageShell>
      <FeatureHeader
        title="Permintaan Disposisi"
        subtitle="Kelola persetujuan permintaan akses dokumen dari pengguna lain."
        icon={<Inbox />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Total Permintaan
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{data.length}</p>
          </div>
          <Inbox className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Menunggu Aksi
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{data.length}</p>
          </div>
          <AlertTriangle className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
              Disetujui Hari Ini
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{approvedTodayCount}</p>
          </div>
          <CheckCircle2 className="h-7 w-7 text-slate-900" aria-hidden="true" />
        </div>
      </div>

      <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} mb-8`}>
        <div className="overflow-x-auto">
          <SetupDataTable className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {PERMINTAAN_DISPOSISI_TABLE_COLUMN_WIDTHS.map((width, index) => (
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
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Keterangan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Pemohon</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Tanggal</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>Alasan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Status</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>Aksi</SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
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
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span className="block truncate" title={item.detail}>
                        {item.detail}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                      <span className="block truncate" title={formatPersonName(item.pemohon)}>
                        {formatPersonName(item.pemohon)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span
                        className="block truncate tabular-nums"
                        title={formatDateOnly(item.tglPengajuan)}
                      >
                        {formatDateOnly(item.tglPengajuan)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span className="block truncate" title={item.alasan}>
                        {item.alasan}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge status="Menunggu Persetujuan" />
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      {canProcessItem(item, "approve") || canProcessItem(item, "reject") ? (
                        <div className="flex items-center justify-center gap-3">
                          {canProcessItem(item, "approve") ? (
                            <button
                              type="button"
                              onClick={() => handleAction(item, "approve")}
                              className={`${INLINE_ACTION_BUTTON_CLASS} hover:text-emerald-600`}
                              title="Setujui"
                            >
                              <Check className="h-5 w-5" aria-hidden="true" />
                              <span className="sr-only">Setujui</span>
                            </button>
                          ) : null}
                          {canProcessItem(item, "reject") ? (
                            <button
                              type="button"
                              onClick={() => handleAction(item, "reject")}
                              className={`${INLINE_ACTION_BUTTON_CLASS} hover:text-red-600`}
                              title="Tolak"
                            >
                              <X className="h-5 w-5" aria-hidden="true" />
                              <span className="sr-only">Tolak</span>
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">-</span>
                      )}
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))
              ) : (
                <SetupDataTableRow>
                  <SetupDataTableCell colSpan={9} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                    Tidak ada permintaan disposisi yang menunggu aksi.
                  </SetupDataTableCell>
                </SetupDataTableRow>
              )}
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

      {showModal && selectedItem && actionType ? (
        <DashboardModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          closeDisabled={isLoading}
          title={actionType === "approve" ? "Setujui Disposisi" : "Tolak Disposisi"}
          description="Review permintaan akses dokumen."
          maxWidth="3xl"
          bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
          footerClassName="flex flex-col justify-end gap-3 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="uiverse-modal-button uiverse-modal-button--neutral"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={
                  isLoading ||
                  !alasanAksi.trim() ||
                  (actionType === "approve" && !tanggalExpired)
                }
                className={`uiverse-modal-button ${
                  actionType === "approve"
                    ? "uiverse-modal-button--primary"
                    : "uiverse-modal-button--danger"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isLoading ? (
                  <>
                    <div
                      className="button-spinner uiverse-modal-button__spinner"
                      style={
                        {
                          ["--spinner-size"]: "18px",
                          ["--spinner-border"]: "2px",
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    {actionType === "approve" ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <X className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{actionType === "approve" ? "Setujui" : "Tolak"}</span>
                  </>
                )}
              </button>
            </>
          }
        >
          <div className="space-y-8">
            <section className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  {actionType === "approve" ? (
                    <CheckCircle2 className="h-5 w-5 text-slate-900" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-slate-900" aria-hidden="true" />
                  )}
                  <h3 className="text-base font-semibold text-gray-900">
                    Ringkasan Dokumen
                  </h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Pastikan data permintaan sesuai sebelum memproses akses dokumen.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SummaryField label="Kode Dokumen">
                  <span
                    className="inline-flex rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 tabular-nums"
                    title={selectedItem.kode}
                  >
                    {selectedItem.kode}
                  </span>
                </SummaryField>
                <SummaryField label="Nama Dokumen" contentClassName="font-semibold text-gray-900">
                  {selectedItem.namaDokumen}
                </SummaryField>
                <SummaryField label="Pemohon" contentClassName="font-semibold text-gray-900">
                  {formatPersonName(selectedItem.pemohon)}
                </SummaryField>
                <SummaryField label="Expired Diminta" contentClassName="font-medium text-gray-900">
                  {selectedItem.tglExpired ? formatDateOnly(selectedItem.tglExpired) : "-"}
                </SummaryField>
                <SummaryField label="Keterangan" className="md:col-span-2">
                  {selectedItem.detail || "-"}
                </SummaryField>
                <SummaryField label="Alasan Pengajuan" className="md:col-span-2">
                  {selectedItem.alasan || "-"}
                </SummaryField>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Tindak Lanjut
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Isi keputusan dan catatan yang akan tersimpan pada histori disposisi.
                </p>
              </div>

              {actionType === "approve" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tanggal Expired Akses <span className="text-red-500">*</span>
                  </label>
                  <BasicDateInput
                    value={tanggalExpired}
                    onChange={setTanggalExpired}
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Alasan {actionType === "approve" ? "Persetujuan" : "Penolakan"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SetupTextarea
                  value={alasanAksi}
                  onChange={(event) => setAlasanAksi(event.target.value)}
                  placeholder={`Masukkan alasan ${actionType === "approve" ? "persetujuan" : "penolakan"}...`}
                  className="resize-none"
                  rows={4}
                />
              </div>
            </section>
          </div>
        </DashboardModal>
      ) : null}
    </DashboardPageShell>
  );
}
