"use client";

import dynamic from "next/dynamic";
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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, FileText, Send, UserRound } from "lucide-react";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import BasicDateInput from "@/components/ui/BasicDateInput";
import InputDokumenSectionTitle from "@/components/arsip-digital/input-dokumen/InputDokumenSectionTitle";
import Pagination from "@/components/ui/Pagination";
import SetupPrimaryButton from "@/components/ui/SetupPrimaryButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_WIDTH_2XL_CLASS,
} from "@/components/ui/setupPageStyles";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import { arsipService } from "@/services/arsip.service";
import type { Dokumen } from "@/types/arsip.types";

const UiverseCheckbox = dynamic(
  () => import("@/components/ui/UiverseCheckbox"),
  { ssr: false },
);
const DashboardModal = dynamic(
  () => import("@/components/ui/DashboardModal"),
  { ssr: false },
);
const DashboardNotice = dynamic(
  () => import("@/components/ui/DashboardNotice"),
  { ssr: false },
);

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const PENGAJUAN_TABLE_COLUMN_WIDTHS: Array<string | null> = [
  "56px",
  "184px",
  "144px",
  null,
  null,
  "152px",
  "108px",
];

function ModalInfoItem({
  label,
  value,
  helper,
  className = "",
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  className?: string;
}) {
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

export default function PengajuanDisposisiPageClient() {
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability } = useProtectedAction();
  const { submitDisposisi } = useArsipDigitalWorkflow();
  const canCreatePengajuanDisposisi = hasCapability(
    "/dashboard/arsip-digital/disposisi/pengajuan",
    "create",
  );
  const [requestableDocs, setRequestableDocs] = useState<Dokumen[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [tanggalExpired, setTanggalExpired] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDocsLoading, setIsDocsLoading] = useState(true);

  const loadRequestableDocs = useCallback(async () => {
    if (!canCreatePengajuanDisposisi) {
      setRequestableDocs([]);
      setIsDocsLoading(false);
      return;
    }

    setIsDocsLoading(true);
    try {
      const rows = await arsipService.getRequestable();
      setRequestableDocs(rows);
    } catch (error) {
      setRequestableDocs([]);
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat dokumen yang bisa diajukan.",
        "error",
      );
    } finally {
      setIsDocsLoading(false);
    }
  }, [canCreatePengajuanDisposisi, showToast]);

  useEffect(() => {
    void loadRequestableDocs();
  }, [loadRequestableDocs]);

  const dokumenList = useMemo(() => {
    return requestableDocs
      .map((item) => ({
        id: item.id,
        kode: item.kode,
        jenisDokumen: item.jenisDokumen,
        namaDokumen: item.namaDokumen,
        detail: item.detail,
        pemilik:
          item.owner?.name ??
          item.owner?.username ??
          item.creator?.name ??
          item.creator?.username ??
          item.userInput,
      }));
  }, [requestableDocs]);

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
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === filteredDokumen.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDokumen.map((item) => item.id));
    }
  };

  const handleSubmit = async () => {
    if (
      !ensureCapability(
        "/dashboard/arsip-digital/disposisi/pengajuan",
        "create",
      )
    ) {
      return;
    }

    if (selectedDocs.length === 0) {
      showToast("Pilih minimal satu dokumen untuk diajukan.", "warning");
      return;
    }

    if (!alasan.trim()) {
      showToast("Alasan pengajuan wajib diisi.", "warning");
      return;
    }

    if (alasan.trim().length < 5) {
      showToast("Alasan pengajuan minimal 5 karakter.", "warning");
      return;
    }

    if (!tanggalExpired) {
      showToast("Tanggal expired akses wajib diisi.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const created = await submitDisposisi({
        dokumenIds: selectedDocs,
        alasanPengajuan: alasan.trim(),
        tanggalExpired,
      });

      if (created === 0) {
        showToast("Tidak ada dokumen yang bisa diajukan.", "warning");
        return;
      }

      setShowModal(false);
      showToast(
        `Pengajuan akses berhasil dikirim (${created} dokumen).`,
        "success",
      );
      setSelectedDocs([]);
      setAlasan("");
      setTanggalExpired("");
      await loadRequestableDocs();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Pengajuan gagal dikirim.",
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
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Pengajuan Disposisi"
        subtitle="Ajukan permohonan akses untuk melihat detail dokumen."
        icon={<Send />}
      />

      <DashboardNotice
        title="Cara Mengajukan:"
        className="w-full"
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700 marker:text-slate-500">
          <li>Pilih dokumen yang ingin Anda akses.</li>
          <li>
            Klik tombol{" "}
            <span className="font-semibold text-slate-800">
              &quot;Ajukan Disposisi&quot;
            </span>
            .
          </li>
          <li>Isi alasan pengajuan dengan jelas.</li>
          <li>Tunggu persetujuan dari pemilik dokumen.</li>
        </ol>
      </DashboardNotice>

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_2XL_CLASS}`}>
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex-1 w-full">
            <SetupSearchInput
              label="Cari Dokumen"
              placeholder="Cari berdasarkan nama dokumen atau kode..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <SetupPrimaryButton
            onClick={() => setShowModal(true)}
            disabled={!canCreatePengajuanDisposisi || selectedDocs.length === 0}
            icon={<Send className="h-4 w-4" aria-hidden="true" />}
            count={selectedDocs.length}
          >
            Ajukan Disposisi
          </SetupPrimaryButton>
        </div>
      </div>

      <SetupTableCard variant="workflow" className={SETUP_PAGE_WIDTH_2XL_CLASS}>
          <SetupDataTable variant="workflow" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {PENGAJUAN_TABLE_COLUMN_WIDTHS.map((width, index) => (
                <SetupDataTableCol
                  key={`${index}-${width ?? "flex"}`}
                  style={width ? { width } : undefined}
                />
              ))}
            </SetupDataTableColGroup>
            <SetupDataTableHead className="ltr:text-left rtl:text-right">
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  <div className="flex justify-center">
                    <UiverseCheckbox
                      checked={
                        selectedDocs.length === filteredDokumen.length &&
                        filteredDokumen.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      ariaLabel="Pilih semua dokumen"
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
                  Pemilik
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {isDocsLoading ? (
                <SetupDataTableEmptyRow
                  colSpan={7}
                  state="loading"
                  description="Daftar dokumen sedang disiapkan sesuai akses Anda."
                >
                  Memuat dokumen yang bisa diajukan...
                </SetupDataTableEmptyRow>
              ) : filteredDokumen.length > 0 ? (
                paginatedDokumen.map((doc) => (
                <SetupDataTableRow
                  key={doc.id}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedDocs.includes(doc.id) ? "bg-sky-50/50" : ""
                  }`}
                  onClick={() => handleCheckbox(doc.id)}
                >
                  <SetupDataTableCell
                    className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-center">
                      <UiverseCheckbox
                        checked={selectedDocs.includes(doc.id)}
                        onCheckedChange={() => handleCheckbox(doc.id)}
                        ariaLabel={`Pilih dokumen ${doc.kode}`}
                        size={20}
                      />
                    </div>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                      {doc.kode}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-medium text-gray-700`}
                    title={doc.jenisDokumen}
                  >
                    <span className="block truncate">{doc.jenisDokumen}</span>
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}
                    title={doc.namaDokumen}
                  >
                    <span className="block truncate">{doc.namaDokumen}</span>
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}
                    title={doc.detail}
                  >
                    <span className="block truncate">{doc.detail}</span>
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}
                    title={formatPersonName(doc.pemilik)}
                  >
                    <span className="block truncate">
                      {formatPersonName(doc.pemilik)}
                    </span>
                  </SetupDataTableCell>
                  <SetupDataTableCell
                    className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <SetupPrimaryButton
                      onClick={() => {
                        setSelectedDocs([doc.id]);
                        setShowModal(true);
                      }}
                      size="sm"
                    >
                      Ajukan
                    </SetupPrimaryButton>
                  </SetupDataTableCell>
                </SetupDataTableRow>
                ))
              ) : (
                <SetupDataTableEmptyRow
                  colSpan={7}
                  icon={Send}
                  isFiltered={searchTerm.trim().length > 0}
                  description={
                    searchTerm.trim()
                      ? "Ubah kata kunci pencarian untuk melihat dokumen lain yang bisa diajukan."
                      : "Dokumen yang dapat diajukan aksesnya akan muncul setelah tersedia dan sesuai akses Anda."
                  }
                >
                  Tidak ada dokumen yang bisa diajukan.
                </SetupDataTableEmptyRow>
              )}
            </SetupDataTableBody>
          </SetupDataTable>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          isLoading={isDocsLoading}
          onPageChange={setPage}
        />
      </SetupTableCard>

      <DashboardModal
        isOpen={showModal}
        title="Ajukan Disposisi"
        description={`${selectedDocuments.length} dokumen dipilih`}
        onClose={() => setShowModal(false)}
        maxWidth="4xl"
        bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
        footerClassName="flex flex-col justify-end gap-3 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="uiverse-modal-button uiverse-modal-button--neutral"
            >
              <span>Batal</span>
            </button>
            <SetupPrimaryButton
              onClick={() => void handleSubmit()}
              disabled={!alasan.trim() || !tanggalExpired || isLoading}
              icon={<Send className="h-4 w-4" aria-hidden="true" />}
            >
              {isLoading ? "Mengirim..." : "Kirim Pengajuan"}
            </SetupPrimaryButton>
          </>
        }
      >
        <div className="space-y-8">
          <section className="space-y-4">
            <InputDokumenSectionTitle
              title="Dokumen yang Diajukan"
              description="Ringkasan dokumen yang akan dimasukkan ke pengajuan disposisi."
            />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Paket Pengajuan
                    </p>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {selectedDocuments.length} Dokumen
                      </h3>
                      <p className="text-base font-medium text-slate-500">
                        Siap dikirim untuk persetujuan akses.
                      </p>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sky-600">
                    <FileText className="size-5" strokeWidth={1.9} aria-hidden="true" />
                  </div>
                </div>

                <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
                  {selectedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
                        <FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className="truncate text-sm font-semibold text-gray-900"
                            title={doc.namaDokumen}
                          >
                            {doc.namaDokumen}
                          </p>
                          <span className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 tabular-nums">
                            {doc.kode}
                          </span>
                        </div>
                        <p
                          className="truncate text-xs text-slate-500"
                          title={doc.detail}
                        >
                          {doc.detail || "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                    <UserRound className="size-5" strokeWidth={1.9} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-950">
                      Pemilik Dokumen
                    </h4>
                    <p className="text-sm text-slate-500">
                      Ringkasan PIC dari dokumen yang dipilih.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {selectedDocuments.slice(0, 4).map((doc) => (
                    <ModalInfoItem
                      key={doc.id}
                      label={doc.kode}
                      value={formatPersonName(doc.pemilik)}
                      helper={doc.namaDokumen}
                    />
                  ))}
                  {selectedDocuments.length > 4 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500">
                      +{selectedDocuments.length - 4} dokumen lain
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <InputDokumenSectionTitle
              title="Detail Pengajuan"
              description="Isi alasan dan batas waktu akses yang diminta."
            />
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="space-y-5">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-sky-600">
                      <CalendarDays className="size-5" strokeWidth={1.9} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Masa Berlaku Akses
                      </p>
                      <p className="text-xs text-slate-500">
                        Tanggal akses otomatis berakhir.
                      </p>
                    </div>
                  </div>
                  <div className="max-w-xl space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Tanggal Expired Akses <span className="text-red-500">*</span>
                    </label>
                    <BasicDateInput
                      value={tanggalExpired}
                      onChange={setTanggalExpired}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Alasan Pengajuan <span className="text-red-500">*</span>
                  </label>
                  <SetupTextarea
                    value={alasan}
                    onChange={(event) => setAlasan(event.target.value)}
                    placeholder="Jelaskan alasan Anda membutuhkan akses ke dokumen ini..."
                    className="min-h-[148px] resize-none"
                    rows={5}
                  />
                  <p className="text-xs text-slate-500">
                    Jelaskan kebutuhan akses dengan singkat dan jelas.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DashboardModal>
    </DashboardPageShell>
  );
}
