"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, User } from "lucide-react";

import ProtectedLink from "@/components/rbac/ProtectedLink";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DashboardModal from "@/components/ui/DashboardModal";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupViewButton from "@/components/ui/SetupViewButton";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
} from "@/components/ui/SetupDataTable";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
} from "@/components/ui/setupPageStyles";
import { useAuth } from "@/components/auth/AuthProvider";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import { formatDateOnly } from "@/lib/utils/date";
import {
  deriveDocumentFileName,
  detectDocumentFileType,
  toPreviewableFileUrl,
} from "@/lib/utils/file";
import { hasDashboardCapability } from "@/lib/rbac";
import { debiturService } from "@/services/debitur.service";
import type {
  DebtorContract,
  DebtorDocument,
  DebtorDocumentChecklistStatus,
  DebtorFileMeta,
  DebtorMarketingTimelineEntry,
  DebtorWarningLetter,
  DebtorWorkflow,
  DebtorWorkflowClaim,
  DebtorWorkflowCollectibility,
  DebtorWorkflowDeposit,
  DebtorWorkflowIdebUpload,
  DebtorWorkflowLegalProgress,
  DebtorWorkflowPrint,
} from "@/types/debitur.types";

type TabType =
  | "info"
  | "summary"
  | "ideb"
  | "historis"
  | "dokumen"
  | "notaris"
  | "sp"
  | "claim"
  | "titipan";

type TabConfig = {
  id: TabType;
  label: string;
  legal?: boolean;
};

const TABS: TabConfig[] = [
  { id: "info", label: "Data Utama" },
  { id: "summary", label: "Laporan Summary" },
  { id: "ideb", label: "Hasil IDEB", legal: true },
  { id: "historis", label: "Historis Kol" },
  { id: "dokumen", label: "Dokumen" },
  { id: "notaris", label: "Notaris", legal: true },
  { id: "sp", label: "Surat Peringatan", legal: true },
  { id: "claim", label: "Progress Claim Asuransi", legal: true },
  { id: "titipan", label: "Dana Titipan", legal: true },
];

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function statusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "-";
  if (["ACTIVE", "AKTIF", "BERJALAN"].includes(normalized)) return "Aktif";
  if (["INACTIVE", "NONAKTIF"].includes(normalized)) return "Nonaktif";
  if (["CLOSED", "LUNAS", "SELESAI", "DONE"].includes(normalized)) return "Selesai";
  if (["PENDING", "MENUNGGU"].includes(normalized)) return "Menunggu";
  if (["IN_PROGRESS", "PROGRESS", "PROSES", "DALAM_PROSES"].includes(normalized)) {
    return "Dalam Proses";
  }
  if (["CANCELLED", "BATAL"].includes(normalized)) return "Dibatalkan";
  if (["TERUPLOAD", "UPLOADED"].includes(normalized)) return "Terupload";
  if (["GAGAL", "FAILED"].includes(normalized)) return "Gagal";
  if (["PENGAJUAN"].includes(normalized)) return "Pengajuan";
  if (["VERIFIKASI"].includes(normalized)) return "Verifikasi";
  if (["DISETUJUI"].includes(normalized)) return "Disetujui";
  if (["DITOLAK"].includes(normalized)) return "Ditolak";
  if (["CAIR"].includes(normalized)) return "Cair";
  if (["DIKIRIM", "SENT"].includes(normalized)) return "Dikirim";
  return normalized
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function collectibilityLabel(collectibility: DebtorContract["latest_collectibility"]) {
  if (!collectibility) return null;
  const code = display(collectibility.code ?? collectibility.level);
  const name = display(collectibility.name);
  if (code === "-" && name === "-") return null;
  if (code !== "-" && name !== "-" && code !== name) return `${code} - ${name}`;
  return code !== "-" ? code : name;
}

function documentTypeLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "AKAD") return "Akad";
  if (normalized === "HAFTSHEET") return "Haftsheet";
  if (normalized === "SURAT_PERINGATAN") return "Surat Peringatan";
  if (normalized === "FORMULIR_ASURANSI") return "Formulir Asuransi";
  if (normalized === "SKL") return "Keterangan Lunas";
  if (normalized === "SAMSAT") return "Samsat";
  return display(value);
}

function periodLabel(value: string | null | undefined) {
  if (!value) return "-";
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

function hasAnyMenuCapability(
  role: string | null,
  roleId: string | null | undefined,
  paths: string[],
) {
  return paths.some((path) => hasDashboardCapability(path, role, roleId, "read"));
}

function InfoItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
        {display(value)}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-gray-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-medium text-gray-500">
      {children}
    </div>
  );
}

function FileButton({
  file,
  label = "View",
  onOpen,
}: {
  file: DebtorFileMeta | null | undefined;
  label?: string;
  onOpen: (file: DebtorFileMeta) => void;
}) {
  if (!file?.url) return <span className="text-gray-400">-</span>;

  return (
    <SetupViewButton
      label={label}
      title={file.name ? `View ${file.name}` : "View dokumen"}
      onClick={() => onOpen(file)}
    />
  );
}

function HeaderActions({
  collectibility,
}: {
  collectibility: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <ProtectedLink
        href="/dashboard/informasi-debitur"
        className={SETUP_PAGE_BACK_BUTTON_CLASS}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Kembali</span>
      </ProtectedLink>
      {collectibility ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>{collectibility}</span>
        </div>
      ) : null}
    </div>
  );
}

function DataUtamaTab({ workflow }: { workflow: DebtorWorkflow }) {
  const debtor = workflow.debtor;
  const mainContract = workflow.contracts[0] ?? debtor.latest_contract;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Informasi Nasabah">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoItem label="No Debitur" value={debtor.debtor_number} />
          <InfoItem label="No Identitas" value={debtor.identity_number} />
          <InfoItem label="Nama Nasabah" value={debtor.name} />
          <InfoItem label="Telepon" value={debtor.phone} />
          <InfoItem label="Cabang" value={debtor.branch?.name} />
          <InfoItem
            label="Marketing"
            value={
              debtor.marketing_user?.division_name
                ? `${debtor.marketing_user.name} / ${debtor.marketing_user.division_name}`
                : debtor.marketing_user?.name
            }
          />
          <InfoItem label="Status" value={statusLabel(debtor.status)} />
          <InfoItem label="Jumlah Dokumen" value={debtor.documents_count} />
          <InfoItem label="Alamat" value={debtor.address} wide />
          <InfoItem label="Keterangan" value={debtor.description} wide />
        </div>
      </SectionCard>

      <SectionCard title="Informasi Pembiayaan">
        {mainContract ? (
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem label="No Kontrak" value={mainContract.no_kontrak} />
            <InfoItem label="Produk" value={mainContract.product?.name} />
            <InfoItem label="Jenis Akad" value={mainContract.akad_type?.name} />
            <InfoItem label="Tanggal Akad" value={formatDateOnly(mainContract.tanggal_akad)} />
            <InfoItem
              label="Jatuh Tempo"
              value={formatDateOnly(mainContract.tanggal_jatuh_tempo)}
            />
            <InfoItem label="Tenor" value={mainContract.tenor ? `${mainContract.tenor} Bulan` : "-"} />
            <InfoItem label="Plafond" value={formatCurrency(mainContract.plafond)} />
            <InfoItem label="Pokok" value={formatCurrency(mainContract.pokok)} />
            <InfoItem label="Margin" value={formatCurrency(mainContract.margin)} />
            <InfoItem
              label="Outstanding"
              value={formatCurrency(mainContract.total_outstanding)}
            />
            <InfoItem label="Objek Pembiayaan" value={mainContract.objek_pembiayaan} wide />
            <InfoItem label="Agunan" value={mainContract.agunan} wide />
          </div>
        ) : (
          <EmptyState>Belum ada kontrak pembiayaan untuk debitur ini.</EmptyState>
        )}
      </SectionCard>
    </div>
  );
}

function SummaryTab({
  workflow,
  onOpenFile,
}: {
  workflow: DebtorWorkflow;
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const [selectedEntry, setSelectedEntry] = useState<DebtorMarketingTimelineEntry | null>(null);
  const timeline = workflow.marketing.timeline;
  const rows = timeline.rows.length
    ? timeline.rows
    : [
        {
          id: "action-plan",
          label: "Action Plan",
          description: "Rencana tindak lanjut",
        },
        {
          id: "hasil-kunjungan",
          label: "Hasil Kunjungan",
          description: "Ringkasan hasil lapangan",
        },
        {
          id: "langkah-penanganan",
          label: "Langkah Penanganan",
          description: "Eksekusi penanganan",
        },
      ];
  const dates = timeline.dates;
  const entriesByCell = new Map<string, DebtorMarketingTimelineEntry[]>();

  for (const entry of timeline.entries) {
    if (!entry.date) continue;
    const key = `${entry.row_id}:${entry.date}`;
    entriesByCell.set(key, [...(entriesByCell.get(key) ?? []), entry]);
  }

  if (timeline.entries.length === 0 || dates.length === 0) {
    return <EmptyState>Belum ada aktivitas marketing untuk debitur ini.</EmptyState>;
  }

  return (
    <>
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Laporan Summary</h2>
          <p className="mt-1 text-sm text-gray-500">
            Timeline progres penanganan debitur dari action plan sampai realisasi terakhir.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <div
            className="grid min-w-[1080px]"
            style={{
              gridTemplateColumns: `220px repeat(${dates.length}, minmax(220px, 1fr))`,
            }}
          >
            <div className="border-b border-r border-gray-200 bg-gray-50 p-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-600">
              Aktivitas
            </div>
            {dates.map((date) => (
              <div
                key={date}
                className="border-b border-r border-gray-200 bg-gray-50 p-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-600 last:border-r-0"
              >
                {formatDateOnly(date)}
              </div>
            ))}
            {rows.map((row) => (
              <div key={row.id} className="contents">
                <div className="min-h-[190px] border-r border-t border-gray-100 bg-white p-4">
                  <p className="text-sm font-bold text-gray-900">{row.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{row.description}</p>
                </div>
                {dates.map((date) => {
                  const cellEntries = entriesByCell.get(`${row.id}:${date}`) ?? [];
                  return (
                    <div
                      key={`${row.id}-${date}`}
                      className="min-h-[190px] border-r border-t border-gray-100 bg-white p-4 last:border-r-0"
                    >
                      {cellEntries.length ? (
                        <div className="space-y-3">
                          {cellEntries.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => setSelectedEntry(entry)}
                              className="block w-full rounded-lg border border-sky-200 bg-sky-50 p-4 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-100"
                            >
                              <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                                {formatDateOnly(entry.date)}
                              </p>
                              <p className="mt-2 text-sm font-bold leading-6 text-sky-900">
                                {entry.summary}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <SetupStatusBadge status={statusLabel(entry.status)} />
                                {entry.target_date ? (
                                  <span className="text-xs font-semibold text-sky-700">
                                    Target {formatDateOnly(entry.target_date)}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-sky-400">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <DashboardModal
        isOpen={selectedEntry !== null}
        title={selectedEntry?.title ?? "Detail Aktivitas"}
        onClose={() => setSelectedEntry(null)}
        maxWidth="2xl"
      >
        {selectedEntry ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="Tanggal" value={formatDateOnly(selectedEntry.date)} />
                <InfoItem label="Status" value={statusLabel(selectedEntry.status)} />
                <InfoItem label="Kontrak" value={selectedEntry.contract?.no_kontrak} />
                <InfoItem label="Target Tanggal" value={formatDateOnly(selectedEntry.target_date)} />
                <InfoItem label="Ringkasan" value={selectedEntry.summary} wide />
                <InfoItem label="Detail" value={selectedEntry.detail} wide />
                <InfoItem label="Alamat Kunjungan" value={selectedEntry.visit_address} wide />
              </div>
            </div>
            <div className="flex justify-end">
              <FileButton file={selectedEntry.file} onOpen={onOpenFile} />
            </div>
          </div>
        ) : null}
      </DashboardModal>
    </>
  );
}

function IdebTab({
  items,
  onOpenFile,
}: {
  items: DebtorWorkflowIdebUpload[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const [selectedIdeb, setSelectedIdeb] = useState<DebtorWorkflowIdebUpload | null>(null);

  return (
    <>
      <div>
        <h2 className="text-lg font-bold text-gray-900">Riwayat Pengecekan IDEB</h2>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat upload dan hasil pengecekan IDEB nasabah.
        </p>
      </div>
      <TableCard>
        <SetupDataTable className="min-w-[900px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Bulan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tahun</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tgl Upload</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Kesimpulan
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Aksi
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>
                  {item.month
                    ? new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
                        new Date(item.year || 2000, item.month - 1, 1),
                      )
                    : "-"}
                </SetupDataTableCell>
                <SetupDataTableCell>{item.year || "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.created_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge
                    status={statusLabel(item.status)}
                    label={item.summary_detail?.conclusion ?? statusLabel(item.status)}
                    showIcon={false}
                  />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupViewButton
                    label="Detail"
                    title="Detail hasil IDEB"
                    onClick={() => setSelectedIdeb(item)}
                  />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={7}>
                Belum ada hasil IDEB untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>

      <DashboardModal
        isOpen={selectedIdeb !== null}
        title={
          selectedIdeb
            ? `Hasil IDEB - ${selectedIdeb.summary_detail?.debtor_name ?? selectedIdeb.debtor?.name ?? "Debitur"}`
            : "Hasil IDEB"
        }
        description={
          selectedIdeb?.month && selectedIdeb.year
            ? new Intl.DateTimeFormat("id-ID", {
                month: "long",
                year: "numeric",
              }).format(new Date(selectedIdeb.year, selectedIdeb.month - 1, 1))
            : undefined
        }
        onClose={() => setSelectedIdeb(null)}
        maxWidth="3xl"
      >
        {selectedIdeb ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <SetupStatusBadge status={statusLabel(selectedIdeb.status)} />
            </div>
            <SectionCard title="Ringkasan Hasil IDEB">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem
                  label="Nama Nasabah"
                  value={selectedIdeb.summary_detail?.debtor_name ?? selectedIdeb.debtor?.name}
                />
                <InfoItem
                  label="No Identitas"
                  value={selectedIdeb.summary_detail?.identity_number ?? selectedIdeb.debtor?.identity_number}
                />
                <InfoItem
                  label="No Kontrak"
                  value={selectedIdeb.summary_detail?.contract_number ?? selectedIdeb.contract?.no_kontrak}
                />
                <InfoItem
                  label="Kolektibilitas Berjalan"
                  value={selectedIdeb.summary_detail?.current_collectibility}
                />
                <InfoItem
                  label="OS Pokok"
                  value={formatCurrency(selectedIdeb.summary_detail?.outstanding_pokok)}
                />
                <InfoItem
                  label="Status Pembiayaan"
                  value={selectedIdeb.summary_detail?.financing_status}
                />
              </div>
            </SectionCard>

            <SectionCard title="Riwayat Kolektibilitas di BPRS Lain">
              <TableCard>
                <SetupDataTable className="min-w-[640px]">
                  <SetupDataTableHead>
                    <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                      <SetupDataTableHeaderCell>Nama BPRS</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                        Kolektibilitas
                      </SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell>OS Pokok</SetupDataTableHeaderCell>
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody>
                    {(selectedIdeb.summary_detail?.other_bprs ?? []).map((bprs) => (
                      <SetupDataTableRow key={`${bprs.name}-${bprs.collectibility}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                        <SetupDataTableCell className="font-semibold">{bprs.name}</SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                          {display(bprs.collectibility)}
                        </SetupDataTableCell>
                        <SetupDataTableCell>{formatCurrency(bprs.outstanding_pokok)}</SetupDataTableCell>
                      </SetupDataTableRow>
                    ))}
                    {(selectedIdeb.summary_detail?.other_bprs ?? []).length === 0 ? (
                      <SetupDataTableEmptyRow colSpan={3}>
                        Belum ada riwayat BPRS lain di hasil IDEB ini.
                      </SetupDataTableEmptyRow>
                    ) : null}
                  </SetupDataTableBody>
                </SetupDataTable>
              </TableCard>
            </SectionCard>

            <SectionCard title="Kesimpulan">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-semibold leading-6 text-gray-900">
                {selectedIdeb.summary_detail?.conclusion ?? "-"}
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <FileButton file={selectedIdeb.file} onOpen={onOpenFile} />
            </div>
          </div>
        ) : null}
      </DashboardModal>
    </>
  );
}

function HistorisKolTab({ items }: { items: DebtorWorkflowCollectibility[] }) {
  return (
    <TableCard>
      <SetupDataTable className="min-w-[980px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Periode</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kol</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>OS Pokok</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>OS Margin</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>DPD</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {items.map((item, index) => (
            <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell>{periodLabel(item.period_month)}</SetupDataTableCell>
              <SetupDataTableCell>{item.contract_number}</SetupDataTableCell>
              <SetupDataTableCell>{item.code ?? item.name ?? "-"}</SetupDataTableCell>
              <SetupDataTableCell>{formatCurrency(item.outstanding_pokok)}</SetupDataTableCell>
              <SetupDataTableCell>{formatCurrency(item.outstanding_margin)}</SetupDataTableCell>
              <SetupDataTableCell>{display(item.dpd)}</SetupDataTableCell>
              <SetupDataTableCell>{display(item.notes)}</SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {items.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={8}>
              Belum ada historis kolektibilitas untuk debitur ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </TableCard>
  );
}

function DokumenTab({
  items,
  checklist,
  onOpenFile,
}: {
  items: DebtorDocument[];
  checklist: DebtorDocumentChecklistStatus[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const shouldUseChecklist = checklist.length > 0;

  return (
    <TableCard>
      <SetupDataTable className="min-w-[920px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Dokumen</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kategori</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              Status
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              File
            </SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {shouldUseChecklist
            ? checklist.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="font-semibold">{item.name}</SetupDataTableCell>
                  <SetupDataTableCell>{item.category ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>
                    {item.document?.description ?? item.description ?? "-"}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge
                      status={item.status === "ADA" ? "Ada" : "Belum Ada"}
                      showIcon={false}
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.document?.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))
            : items.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className="font-semibold">
                    {item.document_checklist?.name ?? item.document_type}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{item.category}</SetupDataTableCell>
                  <SetupDataTableCell>{display(item.description)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status="Ada" showIcon={false} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
          {(shouldUseChecklist ? checklist.length : items.length) === 0 ? (
            <SetupDataTableEmptyRow colSpan={6}>
              Belum ada checklist atau dokumen debitur.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </TableCard>
  );
}

function NotarisTab({
  items,
  onOpenFile,
}: {
  items: DebtorWorkflowLegalProgress[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  return (
    <TableCard>
      <SetupDataTable className="min-w-[1050px]">
        <SetupDataTableHead>
          <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
              No
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Jenis Akta</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Notaris</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Diterima</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Estimasi</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell>Selesai</SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              Status
            </SetupDataTableHeaderCell>
            <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
              File
            </SetupDataTableHeaderCell>
          </SetupDataTableRow>
        </SetupDataTableHead>
        <SetupDataTableBody>
          {items.map((item, index) => (
            <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                {index + 1}
              </SetupDataTableCell>
              <SetupDataTableCell>{display(item.deed_type)}</SetupDataTableCell>
              <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
              <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
              <SetupDataTableCell>{formatDateOnly(item.received_at)}</SetupDataTableCell>
              <SetupDataTableCell>{formatDateOnly(item.estimated_completed_at)}</SetupDataTableCell>
              <SetupDataTableCell>{formatDateOnly(item.completed_at)}</SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <SetupStatusBadge status={statusLabel(item.status)} />
              </SetupDataTableCell>
              <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                <FileButton file={item.file} onOpen={onOpenFile} />
              </SetupDataTableCell>
            </SetupDataTableRow>
          ))}
          {items.length === 0 ? (
            <SetupDataTableEmptyRow colSpan={9}>
              Belum ada progress notaris untuk debitur ini.
            </SetupDataTableEmptyRow>
          ) : null}
        </SetupDataTableBody>
      </SetupDataTable>
    </TableCard>
  );
}

function SuratPeringatanTab({
  letters,
  prints,
  onOpenFile,
}: {
  letters: DebtorWarningLetter[];
  prints: DebtorWorkflowPrint[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const warningPrints = prints.filter(
    (item) => String(item.document_type).toUpperCase() === "SURAT_PERINGATAN",
  );

  return (
    <div className="space-y-5">
      <SectionCard title="Surat Peringatan Terupload">
        <TableCard>
          <SetupDataTable className="min-w-[900px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal Terbit</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal Kirim</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Keterangan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {letters.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{item.letter_type}</SetupDataTableCell>
                  <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{formatDateOnly(item.issued_at)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatDateOnly(item.sent_at)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell>{display(item.notes)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {letters.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={8}>
                  Belum ada surat peringatan terupload.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>

      <SectionCard title="Dokumen Surat Peringatan Tercetak">
        <TableCard>
          <SetupDataTable className="min-w-[760px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nomor Dokumen</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal Cetak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {warningPrints.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{item.generated_number}</SetupDataTableCell>
                  <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{formatDateOnly(item.printed_at)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.generated_file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {warningPrints.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={5}>
                  Belum ada cetak surat peringatan.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>
    </div>
  );
}

function ClaimTab({
  insuranceProgress,
  claims,
  onOpenFile,
}: {
  insuranceProgress: DebtorWorkflowLegalProgress[];
  claims: DebtorWorkflowClaim[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionCard title="Progress Asuransi">
        <TableCard>
          <SetupDataTable className="min-w-[980px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Asuransi</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Perusahaan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>No Polis</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nilai Cover</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {insuranceProgress.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{display(item.insurance_type)}</SetupDataTableCell>
                  <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{display(item.policy_number)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.coverage_amount)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {insuranceProgress.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={8}>
                  Belum ada progress asuransi.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>

      <SectionCard title="Claim Asuransi">
        <TableCard>
          <SetupDataTable className="min-w-[980px]">
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Jenis Claim</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Tanggal Pengajuan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nilai Claim</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Disetujui</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Pencairan</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  File
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {claims.map((item, index) => (
                <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell>{item.claim_type}</SetupDataTableCell>
                  <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                  <SetupDataTableCell>{formatDateOnly(item.submitted_at)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.claim_amount)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.approved_amount)}</SetupDataTableCell>
                  <SetupDataTableCell>{formatCurrency(item.disbursed_amount)}</SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupStatusBadge status={statusLabel(item.status)} />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <FileButton file={item.file} onOpen={onOpenFile} />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}
              {claims.length === 0 ? (
                <SetupDataTableEmptyRow colSpan={9}>
                  Belum ada claim asuransi.
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        </TableCard>
      </SectionCard>
    </div>
  );
}

function TitipanTab({ deposits }: { deposits: DebtorWorkflowDeposit[] }) {
  const totalNominal = deposits.reduce((total, item) => total + item.nominal, 0);
  const totalRemaining = deposits.reduce(
    (total, item) => total + item.remaining_amount,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoItem label="Total Titipan" value={formatCurrency(totalNominal)} />
        <InfoItem label="Sisa Titipan" value={formatCurrency(totalRemaining)} />
        <InfoItem label="Jumlah Rekening" value={formatNumber(deposits.length)} />
      </div>

      <TableCard>
        <SetupDataTable className="min-w-[980px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Titipan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Pihak Ketiga</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nominal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Dibayar</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Diproses</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Sisa</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {deposits.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{item.deposit_type?.name ?? item.type}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.nominal)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.paid_amount)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.processed_amount)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.remaining_amount)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
            {deposits.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={9}>
                Belum ada dana titipan untuk debitur ini.
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </div>
  );
}

function CetakLegalTab({
  prints,
  onOpenFile,
}: {
  prints: DebtorWorkflowPrint[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  const legalPrints = prints.filter(
    (item) => String(item.document_type).toUpperCase() !== "SURAT_PERINGATAN",
  );

  if (legalPrints.length === 0) return null;

  return (
    <SectionCard title="Dokumen Legal Tercetak">
      <TableCard>
        <SetupDataTable className="min-w-[820px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Dokumen</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nomor Dokumen</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tanggal Cetak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                File
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {legalPrints.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{documentTypeLabel(item.document_type)}</SetupDataTableCell>
                <SetupDataTableCell>{item.generated_number}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{formatDateOnly(item.printed_at)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <FileButton file={item.generated_file} onOpen={onOpenFile} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </SectionCard>
  );
}

function KJPPSection({
  items,
  onOpenFile,
}: {
  items: DebtorWorkflowLegalProgress[];
  onOpenFile: (file: DebtorFileMeta) => void;
}) {
  if (items.length === 0) return null;

  return (
    <SectionCard title="Progress KJPP">
      <TableCard>
        <SetupDataTable className="min-w-[960px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Jenis Appraisal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>KJPP</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Kontrak</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>No Laporan</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Nilai Appraisal</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Status
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                File
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => (
              <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                  {index + 1}
                </SetupDataTableCell>
                <SetupDataTableCell>{display(item.appraisal_type)}</SetupDataTableCell>
                <SetupDataTableCell>{item.third_party?.name ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{item.contract?.no_kontrak ?? "-"}</SetupDataTableCell>
                <SetupDataTableCell>{display(item.report_number)}</SetupDataTableCell>
                <SetupDataTableCell>{formatCurrency(item.appraisal_value)}</SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <SetupStatusBadge status={statusLabel(item.status)} />
                </SetupDataTableCell>
                <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                  <FileButton file={item.file} onOpen={onOpenFile} />
                </SetupDataTableCell>
              </SetupDataTableRow>
            ))}
          </SetupDataTableBody>
        </SetupDataTable>
      </TableCard>
    </SectionCard>
  );
}

export default function DebtorWorkflowDetailClient({ debtorId }: { debtorId: string }) {
  const { role, user } = useAuth();
  const { openPreview } = useDocumentPreviewContext();
  const [workflow, setWorkflow] = useState<DebtorWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canViewLegal = hasAnyMenuCapability(role, user?.role_id, [
    "/dashboard/legal/laporan",
    "/dashboard/legal/upload-ideb",
    "/dashboard/legal/progress/notaris",
    "/dashboard/legal/progress/asuransi",
    "/dashboard/legal/progress/kjpp",
    "/dashboard/legal/progress/klaim",
    "/dashboard/legal/titipan/asuransi",
    "/dashboard/legal/titipan/notaris",
    "/dashboard/legal/titipan/angsuran",
    "/dashboard/legal/cetak/surat-peringatan",
  ]);

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => !tab.legal || canViewLegal),
    [canViewLegal],
  );

  const resolvedActiveTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id ?? "info";

  const loadWorkflow = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setWorkflow(await debiturService.getDebtorWorkflow(debtorId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat detail debitur",
      );
      setWorkflow(null);
    } finally {
      setIsLoading(false);
    }
  }, [debtorId]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  const openFile = useCallback(
    (file: DebtorFileMeta) => {
      const url = toPreviewableFileUrl(file.url, file.name);
      if (!url) return;
      const fileName = deriveDocumentFileName(file.name ?? url, "dokumen-debitur");
      openPreview(url, fileName, detectDocumentFileType(url, fileName));
    },
    [openPreview],
  );

  const mainContract: DebtorContract | null =
    workflow?.contracts[0] ?? workflow?.debtor.latest_contract ?? null;

  const headerCollectibility = collectibilityLabel(mainContract?.latest_collectibility ?? null);

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title={workflow?.debtor.name ?? "Detail Debitur"}
        subtitle={
          mainContract?.no_kontrak ??
          workflow?.debtor.debtor_number ??
          "Workflow informasi debitur"
        }
        icon={<User />}
        actions={
          <HeaderActions collectibility={headerCollectibility} />
        }
      />

      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-500 shadow-sm">
          Memuat detail debitur...
        </div>
      ) : errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : workflow ? (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex overflow-x-auto border-b border-gray-100 bg-white p-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    resolvedActiveTab === tab.id
                      ? "bg-[#157ec3] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-5">
              {resolvedActiveTab === "info" ? <DataUtamaTab workflow={workflow} /> : null}
              {resolvedActiveTab === "summary" ? (
                <SummaryTab workflow={workflow} onOpenFile={openFile} />
              ) : null}
              {resolvedActiveTab === "ideb" ? (
                <IdebTab items={workflow.ideb_uploads} onOpenFile={openFile} />
              ) : null}
              {resolvedActiveTab === "historis" ? (
                <HistorisKolTab items={workflow.collectibilities} />
              ) : null}
              {resolvedActiveTab === "dokumen" ? (
                <DokumenTab
                  items={workflow.documents}
                  checklist={workflow.document_checklist_status}
                  onOpenFile={openFile}
                />
              ) : null}
              {resolvedActiveTab === "notaris" ? (
                <div className="space-y-5">
                  <NotarisTab
                    items={workflow.legal.notary_progress}
                    onOpenFile={openFile}
                  />
                  <KJPPSection
                    items={workflow.legal.kjpp_progress}
                    onOpenFile={openFile}
                  />
                </div>
              ) : null}
              {resolvedActiveTab === "sp" ? (
                <SuratPeringatanTab
                  letters={workflow.legal.warning_letters}
                  prints={workflow.legal.prints}
                  onOpenFile={openFile}
                />
              ) : null}
              {resolvedActiveTab === "claim" ? (
                <ClaimTab
                  insuranceProgress={workflow.legal.insurance_progress}
                  claims={workflow.legal.claims}
                  onOpenFile={openFile}
                />
              ) : null}
              {resolvedActiveTab === "titipan" ? (
                <div className="space-y-5">
                  <TitipanTab deposits={workflow.legal.deposits} />
                  <CetakLegalTab prints={workflow.legal.prints} onOpenFile={openFile} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </DashboardPageShell>
  );
}
