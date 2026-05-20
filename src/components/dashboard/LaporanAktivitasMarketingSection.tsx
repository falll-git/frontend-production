"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, SearchX } from "lucide-react";

import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
} from "@/components/ui/SetupDataTable";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import { formatDateDisplay } from "@/lib/utils/date";
import { debiturService } from "@/services/debitur.service";
import type { DebtorMarketingReportActivity } from "@/types/debitur.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type JenisAktivitas = "ACTION_PLAN" | "HASIL_KUNJUNGAN" | "LANGKAH_PENANGANAN";

type AktivitasFilter = "SEMUA" | JenisAktivitas;
type SortFilter = "TERBARU" | "TERLAMA";

type AktivitasMarketingItem = {
  id: string;
  tanggal: string | null;
  jenisAktivitas: JenisAktivitas;
  namaNasabah: string;
  status: string;
  sortTimestamp: number;
};

const aktivitasOptions: Array<{ value: AktivitasFilter; label: string }> = [
  { value: "SEMUA", label: "Semua Aktivitas" },
  { value: "ACTION_PLAN", label: "Action Plan" },
  { value: "HASIL_KUNJUNGAN", label: "Hasil Kunjungan" },
  { value: "LANGKAH_PENANGANAN", label: "Langkah Penanganan" },
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
  HASIL_KUNJUNGAN: {
    label: "Hasil Kunjungan",
    tone: "amber",
  },
  LANGKAH_PENANGANAN: {
    label: "Langkah Penanganan",
    tone: "emerald",
  },
};

function formatDisplayDate(value: string | null) {
  return formatDateDisplay(value);
}

function normalizeAktivitasKind(value: string | null | undefined): JenisAktivitas {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (
    normalized === "ACTION_PLAN" ||
    normalized === "HASIL_KUNJUNGAN" ||
    normalized === "LANGKAH_PENANGANAN"
  ) {
    return normalized;
  }

  return "ACTION_PLAN";
}

function getActivityDate(item: DebtorMarketingReportActivity) {
  return item.activity_date ?? item.target_date ?? item.created_at;
}

function mapActivityItem(item: DebtorMarketingReportActivity): AktivitasMarketingItem {
  const tanggal = getActivityDate(item);
  const sortTimestamp = tanggal ? Date.parse(tanggal) : 0;

  return {
    id: item.id,
    tanggal,
    jenisAktivitas: normalizeAktivitasKind(item.activity_kind),
    namaNasabah: item.debtor?.name ?? item.contract?.debtor?.name ?? "-",
    status: item.status,
    sortTimestamp: Number.isFinite(sortTimestamp) ? sortTimestamp : 0,
  };
}

export default function LaporanAktivitasMarketingSection({
  widget,
}: {
  widget?: DashboardMenuNode;
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

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await debiturService.getMarketingReport();
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

  return (
    <section className="animate-fade-in">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Activity className="h-6 w-6 text-gray-600" aria-hidden="true" />
          {widget?.name ?? "Laporan Aktivitas Marketing"}
        </h2>
      </div>

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
            placeholder="Cari nasabah atau status..."
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
          <SetupDataTable className="min-w-[42rem]">
            <SetupDataTableHead className="bg-gray-50">
              <SetupDataTableRow>
                <SetupDataTableHeaderCell>Tanggal</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Aktivitas</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Nasabah</SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
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
                    <SetupDataTableCell>{item.namaNasabah}</SetupDataTableCell>
                    <SetupDataTableCell>
                      <SetupStatusBadge status={item.status} />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                );
              })}
              {isLoading ? (
                <SetupDataTableEmptyRow colSpan={4}>
                  Memuat aktivitas marketing...
                </SetupDataTableEmptyRow>
              ) : null}
              {!isLoading && errorMessage ? (
                <SetupDataTableEmptyRow colSpan={4}>
                  {errorMessage}
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
          {!isLoading && !errorMessage && filteredItems.length === 0 ? (
            <div className="flex min-h-[13.75rem] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                Tidak ada aktivitas yang sesuai filter
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
