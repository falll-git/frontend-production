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
import { AlertCircle, BookOpen, FileText, Send } from "lucide-react";
import BasicDateInput from "@/components/ui/BasicDateInput";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import { useAppToast } from "@/components/ui/AppToastProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import DashboardNotice from "@/components/ui/DashboardNotice";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupPrimaryButton from "@/components/ui/SetupPrimaryButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
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
  SETUP_PAGE_SEARCH_CARD_CLASS,
} from "@/components/ui/setupPageStyles";

const REQUEST_PEMINJAMAN_MENU_URL =
  "/dashboard/arsip-digital/peminjaman/request";

const REQUEST_PEMINJAMAN_TABLE_COLUMN_WIDTHS = [
  "52px",
  "160px",
  "124px",
  null,
  null,
  "212px",
  "132px",
] as const;

export default function RequestPeminjamanPage() {
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability, status } = useProtectedAction();
  const { tempatPenyimpanan } = useArsipDigitalMasterData();
  const { dokumen, submitPeminjaman } = useArsipDigitalWorkflow();
  const canCreatePeminjaman = hasCapability(
    REQUEST_PEMINJAMAN_MENU_URL,
    "create",
  );
  const showCreateBlockedNotice =
    status === "authenticated" && !canCreatePeminjaman;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    tanggalPeminjaman: "",
    tanggalPengembalian: "",
    alasan: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const dokumenList = useMemo(() => {
    return dokumen.map((item) => {
      const tempat = tempatPenyimpanan.find(
        (storage) => String(storage.id) === item.tempatPenyimpananId,
      );

      return {
        id: item.id,
        kode: item.kode,
        jenisDokumen: item.jenisDokumen,
        namaDokumen: item.namaDokumen,
        detail: item.detail,
        status: item.statusPinjam,
        statusKey: item.statusPinjamKey ?? "AVAILABLE",
        lokasi: tempat
          ? `${tempat.namaKantor} - ${tempat.kodeLemari} (${tempat.rak})`
          : item.tempatPenyimpanan ?? "-",
      };
    });
  }, [dokumen, tempatPenyimpanan]);

  const filteredDokumen = dokumenList.filter(
    (doc) =>
      doc.namaDokumen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.kode.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const {
    paginatedItems: paginatedDokumen,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filteredDokumen, OPERATIONAL_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [resetPage, searchTerm]);

  const handleCheckbox = (id: string) => {
    if (!canCreatePeminjaman) return;

    const doc = dokumenList.find((item) => item.id === id);
    if (!doc || doc.statusKey !== "AVAILABLE") return;

    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (!canCreatePeminjaman) return;

    const availableDocs = filteredDokumen.filter(
      (item) => item.statusKey === "AVAILABLE",
    );
    if (selectedDocs.length === availableDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(availableDocs.map((item) => item.id));
    }
  };

  const handleSubmit = async () => {
    if (!ensureCapability(REQUEST_PEMINJAMAN_MENU_URL, "create")) return;

    if (selectedDocs.length === 0) {
      showToast("Pilih minimal satu dokumen untuk diajukan.", "warning");
      return;
    }

    if (
      !formData.tanggalPeminjaman ||
      !formData.tanggalPengembalian ||
      !formData.alasan.trim()
    ) {
      showToast("Mohon lengkapi field yang wajib dulu.", "warning");
      return;
    }

    if (formData.alasan.trim().length < 5) {
      showToast("Alasan peminjaman minimal 5 karakter.", "warning");
      return;
    }

    if (
      new Date(formData.tanggalPengembalian).getTime() <
      new Date(formData.tanggalPeminjaman).getTime()
    ) {
      showToast(
        "Tanggal pengembalian tidak boleh lebih awal dari tanggal peminjaman.",
        "warning",
      );
      return;
    }

    setIsLoading(true);
    try {
      const created = await submitPeminjaman({
        dokumenIds: selectedDocs,
        tanggalPeminjaman: formData.tanggalPeminjaman,
        tanggalPengembalian: formData.tanggalPengembalian,
        alasan: formData.alasan.trim(),
      });

      if (created === 0) {
        showToast("Tidak ada dokumen tersedia untuk diajukan.", "warning");
        return;
      }

      setShowModal(false);
      showToast(
        `Permohonan peminjaman berhasil diajukan (${created} dokumen).`,
        "success",
      );
      setSelectedDocs([]);
      setFormData({
        tanggalPeminjaman: "",
        tanggalPengembalian: "",
        alasan: "",
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Permohonan peminjaman gagal dikirim.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDocuments = dokumenList.filter((item) =>
    selectedDocs.includes(item.id),
  );

  return (
    <DashboardPageShell>
      <FeatureHeader
        title="Request Peminjaman"
        subtitle="Ajukan permohonan peminjaman dokumen fisik."
        icon={<BookOpen />}
      />

      {showCreateBlockedNotice && (
        <DashboardNotice
          title="Akses request belum aktif"
          tone="amber"
          icon={<AlertCircle className="h-5 w-5" />}
          className="mb-6 w-full"
        >
          <p className="text-sm leading-6 text-amber-800">
            Role Anda dapat membuka menu ini, tetapi belum memiliki izin
            membuat permohonan peminjaman.
          </p>
        </DashboardNotice>
      )}

      <DashboardNotice
        title="Prosedur Peminjaman:"
        className="mb-8 w-full"
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700 marker:text-slate-500">
          <li>Pilih dokumen dengan status tersedia.</li>
          <li>
            Klik tombol <span className="font-bold">&quot;Ajukan Pinjam&quot;</span>.
          </li>
          <li>Isi tanggal pinjam, tanggal kembali, dan alasan.</li>
          <li>Tunggu persetujuan sebelum dokumen diserahkan.</li>
        </ol>
      </DashboardNotice>

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} mb-6`}>
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex-1 w-full">
            <SetupSearchInput
              label="Cari Dokumen"
              placeholder="Cari berdasarkan nama atau kode..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <SetupPrimaryButton
            onClick={() => setShowModal(true)}
            disabled={!canCreatePeminjaman || selectedDocs.length === 0}
            icon={<Send className="h-4 w-4" aria-hidden="true" />}
            count={selectedDocs.length}
          >
            Ajukan Pinjam
          </SetupPrimaryButton>
        </div>
      </div>

      <SetupTableCard variant="workflow">
          <SetupDataTable variant="workflow" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {REQUEST_PEMINJAMAN_TABLE_COLUMN_WIDTHS.map((width, index) => (
                <SetupDataTableCol
                  key={`${index}-${width ?? "flex"}`}
                  style={width ? { width } : undefined}
                />
              ))}
            </SetupDataTableColGroup>
            <SetupDataTableHead className="ltr:text-left rtl:text-right">
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  <div className="flex justify-center">
                    <UiverseCheckbox
                      checked={
                        selectedDocs.length ===
                          filteredDokumen.filter((item) => item.statusKey === "AVAILABLE").length &&
                        filteredDokumen.filter((item) => item.statusKey === "AVAILABLE").length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      disabled={!canCreatePeminjaman}
                      ariaLabel="Pilih semua dokumen tersedia"
                      size={20}
                    />
                  </div>
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Kode
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Jenis Dokumen
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Nama Dokumen
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Keterangan
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Lokasi
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-100">
              {paginatedDokumen.map((doc) => (
                <SetupDataTableRow
                  key={doc.id}
                  className={`group transition-colors cursor-pointer hover:bg-blue-50/40 ${
                    selectedDocs.includes(doc.id) ? "bg-blue-50/60" : ""
                  } ${doc.statusKey !== "AVAILABLE" ? "bg-gray-50/50" : ""}`}
                  onClick={() => handleCheckbox(doc.id)}
                >
                  <SetupDataTableCell
                    className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-center">
                      <UiverseCheckbox
                        checked={selectedDocs.includes(doc.id)}
                        onCheckedChange={() => handleCheckbox(doc.id)}
                        disabled={
                          !canCreatePeminjaman ||
                          doc.statusKey !== "AVAILABLE"
                        }
                        ariaLabel={`Pilih dokumen ${doc.kode}`}
                        size={20}
                      />
                    </div>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <span
                      className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums"
                      title={doc.kode}
                    >
                      {doc.kode}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-800`}>
                    <span className="block truncate" title={doc.jenisDokumen}>
                      {doc.jenisDokumen}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-800`}>
                    <span className="block truncate" title={doc.namaDokumen}>
                      {doc.namaDokumen}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                    <span className="block truncate" title={doc.detail}>
                      {doc.detail}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-500`}>
                    <span className="block truncate" title={doc.lokasi}>
                      {doc.lokasi}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge
                      status={doc.statusKey === "AVAILABLE" ? "Tersedia" : doc.status}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {filteredDokumen.length === 0 ? (
                <SetupDataTableRow>
                  <SetupDataTableCell colSpan={7} className={SETUP_PAGE_MODERN_EMPTY_CELL_CLASS}>
                    Belum ada dokumen yang bisa diajukan.
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

      {showModal ? (
        <DashboardModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Ajukan Peminjaman"
          description={`${selectedDocuments.length} dokumen dipilih`}
          maxWidth="3xl"
          bodyClassName="space-y-6 p-6"
          footerClassName="flex flex-col justify-end gap-3 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="uiverse-modal-button uiverse-modal-button--neutral"
              >
                Batal
              </button>
              <SetupPrimaryButton
                onClick={() => void handleSubmit()}
                disabled={
                  !formData.tanggalPeminjaman ||
                  !formData.tanggalPengembalian ||
                  !formData.alasan.trim() ||
                  !canCreatePeminjaman ||
                  isLoading
                }
                icon={
                  isLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )
                }
              >
                {isLoading ? "Mengirim..." : "Ajukan Permohonan"}
              </SetupPrimaryButton>
            </>
          }
        >
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
              Dokumen yang Akan Dipinjam ({selectedDocuments.length})
            </p>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {selectedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-start gap-3 px-4 py-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {doc.namaDokumen}
                      </p>
                      <span className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                        {doc.kode}
                      </span>
                    </div>
                    <p className="truncate text-sm text-gray-500" title={doc.lokasi}>
                      {doc.lokasi}
                    </p>
                    <p className="truncate text-sm text-gray-500" title={doc.detail}>
                      Keterangan: {doc.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tanggal Peminjaman <span className="text-red-500">*</span>
              </label>
              <BasicDateInput
                value={formData.tanggalPeminjaman}
                onChange={(nextValue) =>
                  setFormData((prev) => ({
                    ...prev,
                    tanggalPeminjaman: nextValue,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tanggal Pengembalian <span className="text-red-500">*</span>
              </label>
              <BasicDateInput
                value={formData.tanggalPengembalian}
                onChange={(nextValue) =>
                  setFormData((prev) => ({
                    ...prev,
                    tanggalPengembalian: nextValue,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Alasan Peminjaman <span className="text-red-500">*</span>
            </label>
            <SetupTextarea
              value={formData.alasan}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, alasan: event.target.value }))
              }
              placeholder="Jelaskan kebutuhan peminjaman dokumen..."
              className="resize-none"
              rows={4}
            />
          </div>
        </DashboardModal>
      ) : null}
    </DashboardPageShell>
  );
}
