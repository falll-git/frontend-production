"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Eye, SearchX } from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import Pagination from "@/components/ui/Pagination";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
} from "@/components/ui/SetupDataTable";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupFilePreviewGroup from "@/components/ui/SetupFilePreviewGroup";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import VisitLocationDetails from "@/components/ui/VisitLocationDetails";
import { formatDateDisplay } from "@/lib/utils/date";
import {
  deriveDocumentFileName,
  detectDocumentFileType,
  toPreviewableFileUrl,
} from "@/lib/utils/file";
import { debiturService } from "@/services/debitur.service";
import type {
  DebtorFileMeta,
  DebtorMarketingReportActivity,
} from "@/types/debitur.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type JenisAktivitas = "ACTION_PLAN" | "VISIT_RESULT" | "HANDLING_STEP";

type AktivitasFilter = "SEMUA" | JenisAktivitas;
type SortFilter = "TERBARU" | "TERLAMA";

type AktivitasMarketingItem = {
  id: string;
  tanggal: string | null;
  targetDate: string | null;
  jenisAktivitas: JenisAktivitas;
  namaNasabah: string;
  noKontrak: string;
  ringkasan: string;
  status: string;
  sortTimestamp: number;
  source: DebtorMarketingReportActivity;
};

const aktivitasOptions: Array<{ value: AktivitasFilter; label: string }> = [
  { value: "SEMUA", label: "Semua Aktivitas" },
  { value: "ACTION_PLAN", label: "Action Plan" },
  { value: "VISIT_RESULT", label: "Hasil Kunjungan" },
  { value: "HANDLING_STEP", label: "Langkah Penanganan" },
];

const sortOptions: Array<{ value: SortFilter; label: string }> = [
  { value: "TERBARU", label: "Terbaru" },
  { value: "TERLAMA", label: "Terlama" },
];

const PAGE_SIZE = 10;

const aktivitasBadgeMeta: Record<
  JenisAktivitas,
  { label: string; tone: SetupStatusTone }
> = {
  ACTION_PLAN: {
    label: "Action Plan",
    tone: "blue",
  },
  VISIT_RESULT: {
    label: "Hasil Kunjungan",
    tone: "amber",
  },
  HANDLING_STEP: {
    label: "Langkah Penanganan",
    tone: "emerald",
  },
};

function formatDisplayDate(value: string | null) {
  return formatDateDisplay(value);
}

function normalizeAktivitasKind(value: string | null | undefined): JenisAktivitas {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "ACTION_PLAN") return "ACTION_PLAN";
  if (normalized === "VISIT_RESULT" || normalized === "HASIL_KUNJUNGAN") {
    return "VISIT_RESULT";
  }
  if (normalized === "HANDLING_STEP" || normalized === "LANGKAH_PENANGANAN") {
    return "HANDLING_STEP";
  }

  return "ACTION_PLAN";
}

function valueOrDash(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : "-";
}

function getActivityDate(item: DebtorMarketingReportActivity) {
  return item.activity_date ?? item.target_date ?? item.created_at;
}

function getActivitySummary(item: DebtorMarketingReportActivity) {
  const kind = normalizeAktivitasKind(item.activity_kind);
  if (kind === "ACTION_PLAN") return valueOrDash(item.action_plan ?? item.notes);
  if (kind === "VISIT_RESULT") {
    return valueOrDash(item.visit_result ?? item.conclusion ?? item.notes);
  }

  return valueOrDash(item.handling_step ?? item.handling_result ?? item.notes);
}

function mapActivityItem(item: DebtorMarketingReportActivity): AktivitasMarketingItem {
  const tanggal = getActivityDate(item);
  const sortTimestamp = tanggal ? Date.parse(tanggal) : 0;

  return {
    id: item.id,
    tanggal,
    targetDate: item.target_date,
    jenisAktivitas: normalizeAktivitasKind(item.activity_kind),
    namaNasabah: item.debtor?.name ?? item.contract?.debtor?.name ?? "-",
    noKontrak: item.contract?.no_kontrak ?? "-",
    ringkasan: getActivitySummary(item),
    status: item.status,
    sortTimestamp: Number.isFinite(sortTimestamp) ? sortTimestamp : 0,
    source: item,
  };
}

export default function LaporanAktivitasMarketingSection({
  widget,
  showTitle = true,
}: {
  widget?: DashboardMenuNode;
  showTitle?: boolean;
}) {
  const { openPreview } = useDocumentPreviewContext();
  const [selectedAktivitas, setSelectedAktivitas] =
    useState<AktivitasFilter>("SEMUA");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortFilter>("TERBARU");
  const [page, setPage] = useState(1);
  const [aktivitasItems, setAktivitasItems] = useState<AktivitasMarketingItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<AktivitasMarketingItem | null>(
    null,
  );

  const openFile = useCallback(
    (file: DebtorFileMeta) => {
      const url = toPreviewableFileUrl(file.url, file.name);
      if (!url) return;

      const fileName = deriveDocumentFileName(
        file.name ?? url,
        "aktivitas-marketing",
      );
      openPreview(url, fileName, detectDocumentFileType(url, fileName));
    },
    [openPreview],
  );

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await debiturService.getMarketingReport({ limit: 100 });
        if (!ignore) {
          setAktivitasItems(result.recent_activities.map(mapActivityItem));
        }
      } catch (error) {
        if (!ignore) {
          setAktivitasItems([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat aktivitas marketing",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadReport();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return aktivitasItems
      .filter((item) => {
        const matchesAktivitas =
          selectedAktivitas === "SEMUA" ||
          item.jenisAktivitas === selectedAktivitas;
        const matchesSearch =
          keyword.length === 0 ||
          item.namaNasabah.toLowerCase().includes(keyword) ||
          item.noKontrak.toLowerCase().includes(keyword) ||
          item.ringkasan.toLowerCase().includes(keyword) ||
          item.status.toLowerCase().includes(keyword);

        return matchesAktivitas && matchesSearch;
      })
      .sort((left, right) => {
        if (sortBy === "TERLAMA") {
          return left.sortTimestamp - right.sortTimestamp;
        }

        return right.sortTimestamp - left.sortTimestamp;
      });
  }, [aktivitasItems, searchTerm, selectedAktivitas, sortBy]);

  const lastPage = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  const activeMeta = activeItem
    ? aktivitasBadgeMeta[activeItem.jenisAktivitas]
    : null;

  return (
    <section className="animate-fade-in">
      {showTitle ? (
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Activity className="h-6 w-6 text-gray-600" aria-hidden="true" />
            {widget?.name ?? "Laporan Aktivitas Marketing"}
          </h2>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[13.75rem] flex-1 sm:flex-none">
            <SetupSelect
              value={selectedAktivitas}
              onChange={(event) => {
                setSelectedAktivitas(event.target.value as AktivitasFilter);
                setPage(1);
              }}
              aria-label="Filter jenis aktivitas marketing"
            >
              {aktivitasOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>

          <SetupSearchInput
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nasabah, kontrak, ringkasan, atau status..."
            containerClassName="min-w-[16.25rem] flex-[2]"
          />

          <div className="min-w-[9.375rem] flex-1 sm:flex-none">
            <SetupSelect
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SortFilter);
                setPage(1);
              }}
              aria-label="Urutan tanggal aktivitas marketing"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SetupSelect>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <SetupDataTable variant="workflow" density="compact" className="min-w-[60rem]">
              <SetupDataTableHead className="bg-gray-50">
                <SetupDataTableRow>
                  <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Aktivitas</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Nasabah / Kontrak</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Ringkasan</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Target</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
                  <SetupDataTableHeaderCell className="text-center">Aksi</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {paginatedItems.map((item) => {
                  const aktivitasMeta = aktivitasBadgeMeta[item.jenisAktivitas];

                  return (
                    <SetupDataTableRow
                      key={item.id}
                      title="Double-click untuk melihat detail aktivitas"
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      onDoubleClick={() => setActiveItem(item)}
                    >
                      <SetupDataTableCell>
                        {formatDisplayDate(item.tanggal)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupStatusBadge
                          status={aktivitasMeta.label}
                          label={aktivitasMeta.label}
                          tone={aktivitasMeta.tone}
                          showIcon={false}
                        />
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <div className="font-semibold text-gray-900">
                          {item.namaNasabah}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.noKontrak}
                        </div>
                      </SetupDataTableCell>
                      <SetupDataTableCell title={item.ringkasan}>
                        <span className="line-clamp-2">{item.ringkasan}</span>
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        {formatDisplayDate(item.targetDate)}
                      </SetupDataTableCell>
                      <SetupDataTableCell>
                        <SetupStatusBadge status={item.status} />
                      </SetupDataTableCell>
                      <SetupDataTableCell className="text-center">
                        <div
                          className="flex items-center justify-center"
                          onClick={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <SetupActionMenu
                            label={`Buka aksi aktivitas ${item.namaNasabah}`}
                            menuLabel={`Aksi aktivitas ${item.namaNasabah}`}
                            items={[
                              {
                                key: "detail",
                                label: "Detail",
                                icon: Eye,
                                tone: "blue",
                                onClick: () => setActiveItem(item),
                              },
                            ]}
                          />
                        </div>
                      </SetupDataTableCell>
                    </SetupDataTableRow>
                  );
                })}
                {isLoading ? (
                  <SetupDataTableEmptyRow colSpan={7}>
                    Memuat aktivitas marketing...
                  </SetupDataTableEmptyRow>
                ) : null}
                {!isLoading && errorMessage ? (
                  <SetupDataTableEmptyRow colSpan={7}>
                    {errorMessage}
                  </SetupDataTableEmptyRow>
                ) : null}
              </SetupDataTableBody>
            </SetupDataTable>
          </div>
          {!isLoading && !errorMessage && filteredItems.length === 0 ? (
            <div className="flex min-h-[13.75rem] items-center justify-center px-6 py-10">
              <SetupEmptyState
                title="Tidak ada aktivitas yang sesuai filter"
                description="Coba ubah jenis aktivitas, kata kunci, atau urutan data."
                icon={SearchX}
                isFiltered
                variant="table"
              />
            </div>
          ) : null}
          {!isLoading && !errorMessage && filteredItems.length > 0 ? (
            <Pagination
              page={currentPage}
              lastPage={lastPage}
              total={filteredItems.length}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      </div>

      <DashboardModal
        isOpen={Boolean(activeItem)}
        title={activeMeta ? `Detail ${activeMeta.label}` : "Detail Aktivitas"}
        description={
          activeItem
            ? activeItem.noKontrak !== "-"
              ? activeItem.noKontrak
              : activeItem.namaNasabah
            : undefined
        }
        onClose={() => setActiveItem(null)}
        maxWidth="4xl"
        bodyClassName="max-h-[70vh] space-y-5 overflow-y-auto p-6"
        footer={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => setActiveItem(null)}
          >
            Tutup
          </button>
        }
      >
        {activeItem ? (
          <>
            <SetupRecordDetailSection
              title="Aktivitas dan Nasabah"
              rows={[
                {
                  label: "Jenis Aktivitas",
                  value: activeMeta ? (
                    <SetupStatusBadge
                      status={activeMeta.label}
                      label={activeMeta.label}
                      tone={activeMeta.tone}
                      showIcon={false}
                    />
                  ) : (
                    "-"
                  ),
                },
                {
                  label: "Status",
                  value: <SetupStatusBadge status={activeItem.status} />,
                },
                { label: "Nasabah", value: activeItem.namaNasabah },
                { label: "Nomor Kontrak", value: activeItem.noKontrak },
              ]}
            />

            <SetupRecordDetailSection
              title="Jadwal Aktivitas"
              rows={[
                {
                  label: "Tanggal Aktivitas",
                  value: formatDisplayDate(activeItem.tanggal),
                },
                {
                  label: "Target Tanggal",
                  value: formatDisplayDate(activeItem.targetDate),
                },
              ]}
            />

            {activeItem.jenisAktivitas === "ACTION_PLAN" ? (
              <SetupRecordDetailSection
                title="Detail Action Plan"
                rows={[
                  {
                    label: "Action Plan",
                    value: valueOrDash(activeItem.source.action_plan),
                  },
                ]}
              />
            ) : null}

            {activeItem.jenisAktivitas === "VISIT_RESULT" ? (
              <>
                <SetupRecordDetailSection
                  title="Detail Hasil Kunjungan"
                  rows={[
                    {
                      label: "Hasil Kunjungan",
                      value: valueOrDash(activeItem.source.visit_result),
                    },
                    {
                      label: "Kesimpulan",
                      value: valueOrDash(activeItem.source.conclusion),
                    },
                  ]}
                />
                <section className="min-w-0 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-500">
                    Lokasi Kunjungan
                  </h3>
                  <VisitLocationDetails location={activeItem.source} />
                </section>
              </>
            ) : null}

            {activeItem.jenisAktivitas === "HANDLING_STEP" ? (
              <SetupRecordDetailSection
                title="Detail Langkah Penanganan"
                rows={[
                  {
                    label: "Langkah Penanganan",
                    value: valueOrDash(activeItem.source.handling_step),
                  },
                  {
                    label: "Hasil Penanganan",
                    value: valueOrDash(activeItem.source.handling_result),
                  },
                ]}
              />
            ) : null}

            <SetupRecordDetailSection
              title="Catatan dan File"
              rows={[
                {
                  label: "Catatan",
                  value: valueOrDash(activeItem.source.notes),
                },
                {
                  label: "Jumlah File",
                  value: String(
                    Array.isArray(activeItem.source.files) &&
                      activeItem.source.files.length > 0
                      ? activeItem.source.files.length
                      : activeItem.source.file
                        ? 1
                        : 0,
                  ),
                },
                {
                  label: "Aksi File",
                  value: (
                    <SetupFilePreviewGroup
                      file={activeItem.source.file}
                      files={activeItem.source.files}
                      align="start"
                      onOpen={openFile}
                    />
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </DashboardModal>
    </section>
  );
}
