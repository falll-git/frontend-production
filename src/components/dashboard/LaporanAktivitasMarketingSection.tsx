"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, SearchX } from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
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
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import SetupViewButton from "@/components/ui/SetupViewButton";
import { formatDateDisplay } from "@/lib/utils/date";
import { debiturService } from "@/services/debitur.service";
import type { DebtorMarketingReportActivity } from "@/types/debitur.types";
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-gray-900">
        {valueOrDash(value)}
      </p>
    </div>
  );
}

export default function LaporanAktivitasMarketingSection({
  widget,
  showTitle = true,
}: {
  widget?: DashboardMenuNode;
  showTitle?: boolean;
}) {
  const [selectedAktivitas, setSelectedAktivitas] =
    useState<AktivitasFilter>("SEMUA");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortFilter>("TERBARU");
  const [aktivitasItems, setAktivitasItems] = useState<AktivitasMarketingItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<AktivitasMarketingItem | null>(
    null,
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
              onChange={(event) =>
                setSelectedAktivitas(event.target.value as AktivitasFilter)
              }
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
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari nasabah, kontrak, ringkasan, atau status..."
            containerClassName="min-w-[16.25rem] flex-[2]"
          />

          <div className="min-w-[9.375rem] flex-1 sm:flex-none">
            <SetupSelect
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortFilter)}
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
                  <SetupDataTableHeaderCell>Aksi</SetupDataTableHeaderCell>
                </SetupDataTableRow>
              </SetupDataTableHead>
              <SetupDataTableBody>
                {filteredItems.map((item) => {
                  const aktivitasMeta = aktivitasBadgeMeta[item.jenisAktivitas];

                  return (
                    <SetupDataTableRow
                      key={item.id}
                      className="transition-colors hover:bg-gray-50"
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
                      <SetupDataTableCell>
                        <SetupViewButton
                          label="Detail"
                          title="Lihat detail aktivitas"
                          onClick={() => setActiveItem(item)}
                        />
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
        </div>
      </div>

      <DashboardModal
        isOpen={Boolean(activeItem)}
        title={activeMeta?.label ?? "Detail Aktivitas"}
        description="Detail aktivitas marketing bersifat read-only dari dashboard."
        onClose={() => setActiveItem(null)}
        maxWidth="3xl"
        bodyClassName="max-h-[75dvh] space-y-4 overflow-y-auto p-5"
      >
        {activeItem ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {activeMeta ? (
                <SetupStatusBadge
                  status={activeMeta.label}
                  label={activeMeta.label}
                  tone={activeMeta.tone}
                  showIcon={false}
                />
              ) : null}
              <SetupStatusBadge status={activeItem.status} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow label="Nasabah" value={activeItem.namaNasabah} />
              <DetailRow label="Kontrak" value={activeItem.noKontrak} />
              <DetailRow
                label="Tanggal Aktivitas"
                value={formatDisplayDate(activeItem.tanggal)}
              />
              <DetailRow
                label="Target Tanggal"
                value={formatDisplayDate(activeItem.targetDate)}
              />
            </div>

            <div className="grid gap-3">
              {activeItem.jenisAktivitas === "ACTION_PLAN" ? (
                <DetailRow
                  label="Action Plan"
                  value={activeItem.source.action_plan}
                />
              ) : null}
              {activeItem.jenisAktivitas === "VISIT_RESULT" ? (
                <>
                  <DetailRow
                    label="Alamat Kunjungan"
                    value={activeItem.source.visit_address}
                  />
                  <DetailRow
                    label="Hasil Kunjungan"
                    value={activeItem.source.visit_result}
                  />
                  <DetailRow
                    label="Kesimpulan"
                    value={activeItem.source.conclusion}
                  />
                </>
              ) : null}
              {activeItem.jenisAktivitas === "HANDLING_STEP" ? (
                <>
                  <DetailRow
                    label="Langkah Penanganan"
                    value={activeItem.source.handling_step}
                  />
                  <DetailRow
                    label="Hasil Penanganan"
                    value={activeItem.source.handling_result}
                  />
                </>
              ) : null}
              <DetailRow label="Catatan" value={activeItem.source.notes} />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                File Pendukung
              </p>
              {activeItem.source.file?.url ? (
                <a
                  href={activeItem.source.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Buka File
                </a>
              ) : (
                <p className="mt-1 text-sm font-medium text-gray-900">-</p>
              )}
            </div>
          </>
        ) : null}
      </DashboardModal>
    </section>
  );
}
