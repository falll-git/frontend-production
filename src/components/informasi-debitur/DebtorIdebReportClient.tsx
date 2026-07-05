"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Download,
  Eye,
  FileSearch,
  RefreshCw,
} from "lucide-react";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DashboardModal from "@/components/ui/DashboardModal";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu, {
  type SetupActionMenuItem,
} from "@/components/ui/SetupActionMenu";
import SetupCollectibilityBadge from "@/components/ui/SetupCollectibilityBadge";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
  SetupTableCard,
} from "@/components/ui/SetupDataTable";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_ICON_CLASS,
  SETUP_PAGE_SEARCH_INPUT_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEARCH_WRAPPER_CLASS,
} from "@/components/ui/setupPageStyles";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { debiturService } from "@/services/debitur.service";
import type {
  DebtorIdebComparison,
  DebtorIdebReportUpload,
  DebtorIdebSummaryDetail,
} from "@/types/debitur.types";
import type { PaginationMeta } from "@/types/api.types";

type IdebRecord = Record<string, unknown>;
type FacilityFilter = "ALL" | "ACTIVE" | "PAID_OFF" | "PROBLEM" | "ARREARS";

const FACILITY_FILTERS: Array<{ value: FacilityFilter; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "PAID_OFF", label: "Lunas" },
  { value: "PROBLEM", label: "Macet / Hapus Buku" },
  { value: "ARREARS", label: "Ada Tunggakan" },
];

const IDEB_REPORT_PAGE_SIZE = 10;
const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: IDEB_REPORT_PAGE_SIZE,
  lastPage: 1,
};

function asRecord(value: unknown): IdebRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as IdebRecord)
    : null;
}

function textValue(record: IdebRecord | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function numberValue(record: IdebRecord | null | undefined, keys: string[]) {
  const text = textValue(record, keys);
  if (!text) return 0;
  const normalized = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatPeriod(value: string | null | undefined) {
  if (!value) return "-";
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

function downloadBrowserFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getFacilities(item: DebtorIdebReportUpload | null): IdebRecord[] {
  return sortFacilitiesByRisk(
    (item?.summary_detail?.facilities || []).filter((entry) => asRecord(entry)) as IdebRecord[],
  );
}

function isPaidOffFacility(facility: IdebRecord) {
  const condition = display(textValue(facility, ["condition", "condition_code", "status"])).toUpperCase();
  return condition.includes("LUNAS") || condition.startsWith("02");
}

function isWriteOffFacility(facility: IdebRecord) {
  const condition = display(textValue(facility, ["condition", "condition_code", "status"])).toUpperCase();
  return condition.includes("HAPUS") || condition.startsWith("03");
}

function facilityCollectibility(facility: IdebRecord) {
  return textValue(facility, ["collectibility", "collectibility_code", "kol"]);
}

function facilityCollectibilityLevel(value: unknown) {
  const text = String(value ?? "").trim();
  const match = /(?:^|\D)([1-5])(?:\D|$)/.exec(text);
  return match ? Number(match[1]) : null;
}

function facilityOutstanding(facility: IdebRecord) {
  return numberValue(facility, ["outstanding", "baki_debet", "outstanding_pokok"]);
}

function facilityPlafond(facility: IdebRecord) {
  return numberValue(facility, ["plafond", "initial_plafond", "plafon", "plafon_awal"]);
}

function facilityArrears(facility: IdebRecord) {
  return (
    numberValue(facility, ["principal_arrears", "tunggakan_pokok"]) +
    numberValue(facility, ["interest_arrears", "tunggakan_bunga"]) +
    numberValue(facility, ["penalty", "denda"])
  );
}

function facilityDaysPastDue(facility: IdebRecord) {
  const value = numberValue(facility, ["days_past_due", "dpd", "jumlah_hari_tunggakan"]);
  return value > 0 ? value : null;
}

function facilityRiskSortValue(facility: IdebRecord) {
  return {
    collectibility: facilityCollectibilityLevel(facilityCollectibility(facility)) ?? 0,
    dpd: facilityDaysPastDue(facility) ?? 0,
    arrears: facilityArrears(facility),
    outstanding: facilityOutstanding(facility),
    plafond: facilityPlafond(facility),
  };
}

function sortFacilitiesByRisk(facilities: IdebRecord[]) {
  return [...facilities].sort((left, right) => {
    const leftRisk = facilityRiskSortValue(left);
    const rightRisk = facilityRiskSortValue(right);
    return (
      rightRisk.collectibility - leftRisk.collectibility ||
      rightRisk.dpd - leftRisk.dpd ||
      rightRisk.arrears - leftRisk.arrears ||
      rightRisk.outstanding - leftRisk.outstanding ||
      rightRisk.plafond - leftRisk.plafond ||
      display(textValue(left, ["reporter_name", "reporter_code"])).localeCompare(
        display(textValue(right, ["reporter_name", "reporter_code"])),
      )
    );
  });
}

function worstCollectibility(item: DebtorIdebReportUpload | null, facilities: IdebRecord[]) {
  const explicit =
    item?.worst_collectibility ??
    item?.summary_detail?.current_collectibility ??
    item?.current_collectibility ??
    null;
  const explicitLevel = facilityCollectibilityLevel(explicit);
  const calculatedLevel = facilities.reduce<number | null>((current, facility) => {
    const level = facilityCollectibilityLevel(facilityCollectibility(facility));
    if (level === null) return current;
    return current === null ? level : Math.max(current, level);
  }, null);

  if (calculatedLevel !== null && (explicitLevel === null || calculatedLevel > explicitLevel)) {
    return calculatedLevel;
  }

  return explicit ?? calculatedLevel;
}

function facilityCreditDisplay(facility: IdebRecord) {
  const creditType = textValue(facility, ["credit_type", "credit_type_code"]);
  const scheme = textValue(facility, ["financing_scheme", "financing_scheme_code"]);
  return [creditType, scheme].filter(Boolean).join(" / ") || "-";
}

function facilityCollateralSummary(facility: IdebRecord) {
  const collaterals = Array.isArray(facility.collaterals)
    ? facility.collaterals.map((item) => asRecord(item)).filter(Boolean)
    : [];
  if (collaterals.length === 0) return "-";
  return collaterals
    .map((item) =>
      [
        textValue(item, ["jenisAgunanKet", "jenis_agunan", "type", "collateral_type"]),
        textValue(item, ["buktiKepemilikan", "bukti_kepemilikan", "ownership_proof"]),
      ]
        .filter(Boolean)
        .join(" - "),
    )
    .filter(Boolean)
    .join("; ") || "-";
}

function reporterBreakdown(item: DebtorIdebReportUpload) {
  const stats = asRecord(item.summary_detail?.summary);
  const buckets = [
    ["Bank Umum", numberValue(stats, ["bank_creditor_count"])],
    ["BPR/BPRS", numberValue(stats, ["bpr_bprs_creditor_count"])],
    ["Lembaga Pembiayaan", numberValue(stats, ["lp_creditor_count"])],
    ["Lainnya", numberValue(stats, ["other_creditor_count"])],
  ].filter((entry): entry is [string, number] => Number(entry[1]) > 0);
  if (buckets.length > 0) {
    return buckets.map(([label, value]) => `${formatNumber(value)} ${label}`).join(", ");
  }

  const reporters = item.report_summary?.priority_reporters ?? [];
  if (reporters.length === 0) return "-";
  const reporterCount = item.report_summary?.reporter_count ?? item.reporter_count;
  const extraCount = Math.max(reporterCount - reporters.length, 0);
  return `${reporters
    .map((reporter, index) => `${index + 1}) ${reporter.reporter_name}`)
    .join("  ")}${extraCount > 0 ? `  +${formatNumber(extraCount)} lembaga lainnya` : ""}`;
}

function getCollaterals(item: DebtorIdebReportUpload | null, facilities: IdebRecord[]) {
  const canonicalCollaterals = item?.report_summary?.collaterals ?? [];
  if (canonicalCollaterals.length > 0) {
    return canonicalCollaterals.map((collateral) => ({
      collateral,
      reporter:
        textValue(collateral, ["reporter_name", "reporter_code"]) ||
        (textValue(collateral, ["source"]) === "A01" ? "Data Internal A01" : "-"),
      accountNumber: textValue(collateral, [
        "account_number",
        "facility_number",
        "no_rekening",
      ]),
    }));
  }

  return facilities.flatMap((facility) => {
    const reporter = textValue(facility, ["reporter_name", "reporter_code"]);
    const accountNumber = textValue(facility, ["account_number", "no_rekening", "noRekening"]);
    const collaterals = Array.isArray(facility.collaterals)
      ? facility.collaterals.map((entry) => asRecord(entry)).filter((entry): entry is IdebRecord => entry !== null)
      : [];
    return collaterals.map((collateral) => ({ collateral, reporter, accountNumber }));
  });
}

function getGuarantors(facilities: IdebRecord[]) {
  return facilities.flatMap((facility) => {
    const reporter = textValue(facility, ["reporter_name", "reporter_code"]);
    const accountNumber = textValue(facility, ["account_number", "no_rekening", "noRekening"]);
    const guarantors = Array.isArray(facility.guarantors)
      ? facility.guarantors.map((entry) => asRecord(entry)).filter((entry): entry is IdebRecord => entry !== null)
      : [];
    return guarantors.map((guarantor) => ({ guarantor, reporter, accountNumber }));
  });
}

function getHistoryRows(summary: DebtorIdebSummaryDetail | null | undefined) {
  const entries = Array.isArray(summary?.monthly_collectibility_history)
    ? summary.monthly_collectibility_history
        .map((entry) => asRecord(entry))
        .filter((entry): entry is IdebRecord => entry !== null)
    : [];
  const periodSet = new Set<string>();
  const rowMap = new Map<
    string,
    {
      key: string;
      reporter: string;
      accountNumber: string;
      periods: Map<string, string>;
    }
  >();

  entries.forEach((entry, index) => {
    const period =
      textValue(entry, ["period_month", "period", "month_label", "label"]) ||
      `Periode ${index + 1}`;
    const reporter = textValue(entry, ["reporter_name", "reporter", "reporter_code"]) || "-";
    const accountNumber = textValue(entry, ["account_number", "no_rekening", "noRekening"]) || "-";
    const collectibility = textValue(entry, ["collectibility", "collectibility_code", "kol"]) || "-";
    const key = `${reporter}|${accountNumber}`;
    periodSet.add(period);
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        key,
        reporter,
        accountNumber,
        periods: new Map(),
      });
    }
    rowMap.get(key)?.periods.set(period, collectibility);
  });

  return {
    periods: Array.from(periodSet).slice(-24),
    rows: Array.from(rowMap.values()).slice(0, 60),
  };
}

function summaryMetric(item: DebtorIdebReportUpload | null) {
  const facilities = getFacilities(item);
  const activeFacilities = facilities.filter(
    (facility) => !isPaidOffFacility(facility) && !isWriteOffFacility(facility),
  );
  const paidOffFacilities = facilities.filter(isPaidOffFacility);
  const writeOffFacilities = facilities.filter(isWriteOffFacility);
  const reportSummary = item?.report_summary;
  return {
    activeFacilitiesCount:
      reportSummary?.active_facilities_count ??
      item?.active_facilities_count ??
      activeFacilities.length,
    paidOffFacilitiesCount:
      reportSummary?.paid_off_facilities_count ??
      item?.paid_off_facilities_count ??
      paidOffFacilities.length,
    writeOffFacilitiesCount:
      reportSummary?.write_off_facilities_count ??
      item?.write_off_facilities_count ??
      writeOffFacilities.length,
    activeOutstanding:
      reportSummary?.active_outstanding ??
      item?.active_outstanding ??
      activeFacilities.reduce((total, facility) => total + facilityOutstanding(facility), 0),
    paidOffPlafond:
      reportSummary?.paid_off_plafond ??
      item?.paid_off_plafond ??
      paidOffFacilities.reduce((total, facility) => total + facilityPlafond(facility), 0),
    writeOffOutstanding:
      reportSummary?.write_off_outstanding ??
      item?.write_off_outstanding ??
      writeOffFacilities.reduce(
        (total, facility) => total + facilityOutstanding(facility),
        0,
      ),
    totalArrears:
      reportSummary?.total_arrears ??
      item?.total_arrears ??
      facilities.reduce((total, facility) => total + facilityArrears(facility), 0),
    totalPlafond:
      reportSummary?.total_plafond ??
      item?.total_plafond ??
      facilities.reduce((total, facility) => total + facilityPlafond(facility), 0),
    activeArrears:
      reportSummary?.active_arrears ??
      item?.active_arrears ??
      activeFacilities.reduce((total, facility) => total + facilityArrears(facility), 0),
    highestDaysPastDue:
      reportSummary?.highest_days_past_due ??
      facilities.reduce(
        (highest, facility) => Math.max(highest, facilityDaysPastDue(facility) ?? 0),
        0,
      ),
    activeWorstCollectibility:
      reportSummary?.active_worst_collectibility ??
      item?.active_worst_collectibility ??
      null,
    reporterCount: reportSummary?.reporter_count ?? item?.reporter_count ?? 0,
    worstCollectibility:
      reportSummary?.worst_collectibility ??
      item?.worst_collectibility ??
      worstCollectibility(item, facilities),
  };
}

function filterFacilities(facilities: IdebRecord[], filter: FacilityFilter) {
  if (filter === "ACTIVE") return facilities.filter((facility) => !isPaidOffFacility(facility));
  if (filter === "PAID_OFF") return facilities.filter(isPaidOffFacility);
  if (filter === "PROBLEM") {
    return facilities.filter((facility) => {
      const kol = display(textValue(facility, ["collectibility", "collectibility_code", "kol"]));
      return isWriteOffFacility(facility) || /^5\b|KOL\s*5/i.test(kol);
    });
  }
  if (filter === "ARREARS") return facilities.filter((facility) => facilityArrears(facility) > 0);
  return sortFacilitiesByRisk(facilities);
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{display(value)}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: "slate" | "green" | "blue" | "red";
}) {
  const toneClass = {
    slate: "text-slate-900",
    green: "text-emerald-600",
    blue: "text-blue-700",
    red: "text-red-600",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <div className={`mt-3 text-2xl font-bold ${toneClass}`}>{value}</div>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
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
    <section className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DebtorIdebReportClient() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<DebtorIdebReportUpload[]>([]);
  const [selected, setSelected] = useState<DebtorIdebReportUpload | null>(null);
  const [search, setSearch] = useState("");
  const [linkStatus, setLinkStatus] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<FacilityFilter>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [comparison, setComparison] = useState<DebtorIdebComparison | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const activationRef = useRef<{ id: string; time: number } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await debiturService.getIdebReports({
        page,
        limit: IDEB_REPORT_PAGE_SIZE,
        search,
        link_status: linkStatus,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat Laporan IDEB",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [linkStatus, page, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let ignore = false;

    async function loadComparison() {
      if (!selected?.debtor_id) {
        setComparison(null);
        setComparisonError(null);
        setIsLoadingComparison(false);
        return;
      }

      setIsLoadingComparison(true);
      setComparisonError(null);
      try {
        const result = await debiturService.getIdebComparison(selected.debtor_id, selected.id);
        if (!ignore) setComparison(result);
      } catch (error) {
        if (!ignore) {
          setComparison(null);
          setComparisonError(
            error instanceof Error
              ? error.message
              : "Perbandingan dengan F01 internal belum tersedia.",
          );
        }
      } finally {
        if (!ignore) setIsLoadingComparison(false);
      }
    }

    void loadComparison();

    return () => {
      ignore = true;
    };
  }, [selected]);

  const openDetail = async (item: DebtorIdebReportUpload) => {
    try {
      const detail = await debiturService.getIdebReportDetail(item.id);
      setSelected(detail);
      setFacilityFilter("ALL");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat detail IDEB",
        "error",
      );
    }
  };

  const activateRow = (item: DebtorIdebReportUpload) => {
    const now = Date.now();
    if (activationRef.current?.id === item.id && now - activationRef.current.time < 550) {
      activationRef.current = null;
      void openDetail(item);
      return;
    }
    activationRef.current = { id: item.id, time: now };
  };

  const exportPdf = async (target: DebtorIdebReportUpload | null = selected) => {
    if (!target) return;
    setIsExporting(true);
    try {
      const result = await debiturService.downloadIdebResumePdf(target.id);
      downloadBrowserFile(result.blob, result.fileName);
      showToast("Resume IDEB berhasil diexport", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal export resume IDEB",
        "error",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFacilities = useMemo(() => getFacilities(selected), [selected]);
  const filteredFacilities = useMemo(
    () => filterFacilities(selectedFacilities, facilityFilter),
    [facilityFilter, selectedFacilities],
  );
  const selectedMetric = summaryMetric(selected);
  const identity = asRecord(selected?.summary_detail?.identity);
  const collateralRows = useMemo(
    () => getCollaterals(selected, selectedFacilities),
    [selected, selectedFacilities],
  );
  const guarantorRows = useMemo(() => getGuarantors(selectedFacilities), [selectedFacilities]);
  const historyMatrix = useMemo(
    () => getHistoryRows(selected?.summary_detail),
    [selected?.summary_detail],
  );
  return (
    <DashboardPageShell spacing="lg">
      <FeatureHeader
        title="Laporan IDEB"
        subtitle="Pantau hasil pengecekan IDEB untuk nasabah existing dan non-existing."
        icon={<FileSearch />}
        actions={
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={() => void load()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <section className={SETUP_PAGE_SEARCH_CARD_CLASS}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</label>
            <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
              <FileSearch className={SETUP_PAGE_SEARCH_ICON_CLASS} />
              <input
                className={SETUP_PAGE_SEARCH_INPUT_CLASS}
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Cari nama, NIK, atau nomor laporan..."
              />
            </div>
          </div>
          <div>
            <label className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Status Link</label>
            <select
              className="app-select"
              value={linkStatus}
              onChange={(event) => {
                setPage(1);
                setLinkStatus(event.target.value);
              }}
            >
              <option value="">Semua</option>
              <option value="TERHUBUNG">Terhubung</option>
              <option value="BELUM_TERHUBUNG">Belum Terhubung</option>
            </select>
          </div>
        </div>
      </section>

      <SetupTableCard variant="report">
        <SetupDataTable variant="report" density="compact" className="min-w-[1280px]">
          <SetupDataTableHead>
            <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                No
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Debitur IDEB</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Tgl IDEB / Periode</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                PJK
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Aktif
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Lunas
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Total Plafon
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Baki Debet
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                Tunggakan
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                KOL
              </SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell>Petugas / Uploader</SetupDataTableHeaderCell>
              <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                Aksi
              </SetupDataTableHeaderCell>
            </SetupDataTableRow>
          </SetupDataTableHead>
          <SetupDataTableBody>
            {items.map((item, index) => {
              const actionItems: SetupActionMenuItem[] = [
                {
                  key: "detail",
                  label: "Detail",
                  icon: Eye,
                  tone: "blue",
                  onClick: () => void openDetail(item),
                },
                {
                  key: "export",
                  label: "Export PDF",
                  icon: Download,
                  tone: "emerald",
                  disabled: isExporting,
                  onClick: () => void exportPdf(item),
                },
              ];

              return (
                <SetupDataTableRow
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  title="Double-click untuk melihat detail IDEB"
                  className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200`}
                  onClick={() => activateRow(item)}
                  onDoubleClick={() => void openDetail(item)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void openDetail(item);
                  }}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(meta.page - 1) * meta.limit + index + 1}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <p className="font-semibold text-slate-900">
                      {display(item.debtor_name ?? item.summary_detail?.debtor_name)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      NIK {display(item.identity_number ?? item.summary_detail?.identity_number)}
                    </p>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <p className="font-semibold text-slate-900">{formatDate(item.result_date)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatPeriod(item.period_month)}</p>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatNumber(item.reporter_count)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatNumber(item.active_facilities_count)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatNumber(item.paid_off_facilities_count)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(item.total_plafond)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(item.active_outstanding)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {formatCurrency(item.total_arrears)}
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupCollectibilityBadge value={item.worst_collectibility} wrap />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <SetupStatusBadge
                      status={item.link_status === "TERHUBUNG" ? "Terhubung" : "Belum Terhubung"}
                    />
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                    <p className="line-clamp-2 font-semibold text-slate-900">
                      {display(item.officer_name)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Diunggah: {display(item.uploader?.name)}
                    </p>
                  </SetupDataTableCell>
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                    >
                      <SetupActionMenu
                        label="Aksi IDEB"
                        menuLabel="Aksi laporan IDEB"
                        items={actionItems}
                      />
                    </div>
                  </SetupDataTableCell>
                </SetupDataTableRow>
              );
            })}
            {items.length === 0 ? (
              <SetupDataTableEmptyRow colSpan={13}>
                {isLoading ? "Memuat laporan IDEB..." : "Belum ada hasil IDEB."}
              </SetupDataTableEmptyRow>
            ) : null}
          </SetupDataTableBody>
        </SetupDataTable>
      </SetupTableCard>

      <Pagination
        page={meta.page}
        lastPage={meta.lastPage}
        total={meta.total}
        limit={meta.limit}
        isLoading={isLoading}
        onPageChange={setPage}
      />

      <DashboardModal
        isOpen={selected !== null}
        title={
          selected
            ? `Detail Pengecekan IDEB - ${display(selected.debtor_name ?? selected.summary_detail?.debtor_name)}`
            : "Detail Pengecekan IDEB"
        }
        description={selected ? formatPeriod(selected.period_month) : undefined}
        maxWidth="5xl"
        onClose={() => setSelected(null)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="uiverse-modal-button uiverse-modal-button--neutral"
              onClick={() => setSelected(null)}
            >
              Tutup
            </button>
            <button
              type="button"
              className="uiverse-modal-button uiverse-modal-button--primary"
              onClick={() => void exportPdf()}
              disabled={isExporting || !selected}
            >
              <Download className="h-4 w-4" />
              Export Resume PDF
            </button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SetupStatusBadge
                status={selected.link_status === "TERHUBUNG" ? "Terhubung" : "Belum Terhubung"}
              />
              <div className="text-sm font-semibold text-slate-500">
                {formatDate(selected.result_date)}
              </div>
            </div>

            <SectionCard title="Profil Pokok Debitur">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="Nama Lengkap" value={selected.debtor_name ?? selected.summary_detail?.debtor_name} />
                <InfoItem label="Sektor Usaha" value={textValue(identity, ["business_field", "business_field_code"])} />
                <InfoItem
                  label="Tempat / Tanggal Lahir"
                  value={[
                    textValue(identity, ["birth_place"]),
                    formatDate(textValue(identity, ["birth_date"])),
                  ].filter((value) => value && value !== "-").join(" / ")}
                />
                <InfoItem label="Alamat Terakhir" value={textValue(identity, ["address"])} />
                <InfoItem label="Pekerjaan Utama" value={textValue(identity, ["occupation", "occupation_code", "workplace"])} />
                <InfoItem label="Nomor Telp" value={textValue(identity, ["phone", "mobile_phone", "nomor_telp"])} />
                <InfoItem label="NIK" value={selected.identity_number ?? selected.summary_detail?.identity_number} />
                <InfoItem label="Jenis Kelamin" value={textValue(identity, ["gender"])} />
              </div>
            </SectionCard>

            <SectionCard title="Resume Hasil IDEB">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="Tanggal Pengecekan IDEB" value={formatDate(selected.result_date)} />
                <InfoItem label="Petugas IDEB" value={selected.officer_name} />
                <InfoItem label="Diunggah Oleh" value={selected.uploader?.name} />
                <InfoItem label="Jumlah Lembaga / PJK" value={formatNumber(selectedMetric.reporterCount)} />
                <InfoItem label="Kualitas Terburuk" value={String(selectedMetric.worstCollectibility ?? "-")} />
                <InfoItem
                  label="Kualitas Terburuk Aktif"
                  value={String(selectedMetric.activeWorstCollectibility ?? "-")}
                />
                <InfoItem
                  label="DPD Tertinggi"
                  value={`${formatNumber(selectedMetric.highestDaysPastDue)} hari`}
                />
                <InfoItem
                  label="Tunggakan Aktif"
                  value={formatCurrency(selectedMetric.activeArrears)}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="KOL Terburuk"
                  value={<SetupCollectibilityBadge value={selectedMetric.worstCollectibility} size="md" wrap />}
                />
                <MetricCard
                  label="Total Baki Debet Aktif"
                  value={formatCurrency(selectedMetric.activeOutstanding)}
                  helper={`${formatNumber(selectedMetric.activeFacilitiesCount)} fasilitas aktif`}
                  tone="green"
                />
                <MetricCard
                  label="Total Plafon Lunas"
                  value={formatCurrency(selectedMetric.paidOffPlafond)}
                  helper={`${formatNumber(selectedMetric.paidOffFacilitiesCount)} fasilitas lunas`}
                  tone="blue"
                />
                <MetricCard
                  label="Pembiayaan Hapus Buku"
                  value={formatCurrency(selectedMetric.writeOffOutstanding)}
                  helper={`${formatNumber(selectedMetric.writeOffFacilitiesCount)} fasilitas`}
                  tone="red"
                />
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="font-semibold text-slate-900">
                  Jumlah Lembaga Pembuat Pelaporan/Kreditur:
                </span>{" "}
                {reporterBreakdown(selected)}
              </div>
              {(selected.report_summary?.data_quality_warnings.length ?? 0) > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  <p className="font-semibold">Catatan validasi data</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {selected.report_summary?.data_quality_warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="Ringkasan Posisi Fasilitas Kredit">
              <div className="mb-3 flex flex-wrap gap-2">
                {FACILITY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      facilityFilter === filter.value
                        ? "border-sky-300 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => setFacilityFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-sm font-semibold leading-6 text-slate-500">
                Daftar diurutkan dari risiko tertinggi berdasarkan KOL, DPD, tunggakan,
                dan baki debet.
              </p>
              <SetupTableCard variant="nested">
                <SetupDataTable variant="nested" density="compact" className="min-w-[1120px]">
                  <SetupDataTableHead>
                    <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                      <SetupDataTableHeaderCell>Pelapor</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell>Jenis Kredit / Pembiayaan</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell>Tanggal Akad</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>Plafon</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>Baki Debet</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>KOL</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>DPD</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>Tunggakan</SetupDataTableHeaderCell>
                      <SetupDataTableHeaderCell>Jaminan / Agunan</SetupDataTableHeaderCell>
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody>
                    {filteredFacilities.slice(0, 200).map((facility, index) => (
                      <SetupDataTableRow key={`${textValue(facility, ["reporter_name", "reporter_code"])}-${index}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                          <p className="line-clamp-2 font-semibold text-slate-900">
                            {display(textValue(facility, ["reporter_name", "reporter_code"]))}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {display(textValue(facility, ["branch_name", "branch_code"]))}
                          </p>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                          <p className="line-clamp-2">{facilityCreditDisplay(facility)}</p>
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                          {formatDate(textValue(facility, ["initial_akad_date", "akad_date"]))}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                          {formatCurrency(facilityPlafond(facility))}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                          {formatCurrency(facilityOutstanding(facility))}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                          <SetupCollectibilityBadge
                            value={facilityCollectibility(facility)}
                            wrap
                          />
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                          {facilityDaysPastDue(facility) === null
                            ? "-"
                            : `${formatNumber(facilityDaysPastDue(facility))} hari`}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                          {formatCurrency(facilityArrears(facility))}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                          <p className="line-clamp-2">{facilityCollateralSummary(facility)}</p>
                        </SetupDataTableCell>
                      </SetupDataTableRow>
                    ))}
                    {filteredFacilities.length > 0 ? (
                      <SetupDataTableRow className="bg-slate-100 font-bold text-slate-900">
                        <SetupDataTableCell colSpan={3} className={SETUP_PAGE_MODERN_CELL_CLASS}>
                          {facilityFilter === "ALL"
                            ? "Total keseluruhan"
                            : `Total filter ${
                                FACILITY_FILTERS.find((filter) => filter.value === facilityFilter)
                                  ?.label ?? "aktif"
                              }`}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                          {formatCurrency(filteredFacilities.reduce((total, facility) => total + facilityPlafond(facility), 0))}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                          {formatCurrency(filteredFacilities.reduce((total, facility) => total + facilityOutstanding(facility), 0))}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>-</SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>-</SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                          {formatCurrency(filteredFacilities.reduce((total, facility) => total + facilityArrears(facility), 0))}
                        </SetupDataTableCell>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>-</SetupDataTableCell>
                      </SetupDataTableRow>
                    ) : (
                      <SetupDataTableEmptyRow colSpan={9}>
                        Belum ada fasilitas IDEB pada filter ini.
                      </SetupDataTableEmptyRow>
                    )}
                  </SetupDataTableBody>
                </SetupDataTable>
              </SetupTableCard>
              {filteredFacilities.length > 200 ? (
                <p className="mt-2 text-xs text-slate-500">
                  Menampilkan 200 baris pertama dari {formatNumber(filteredFacilities.length)} fasilitas. Gunakan filter untuk mempersempit tampilan.
                </p>
              ) : null}
            </SectionCard>

            <SectionCard title="Histori KOL">
              <SetupTableCard variant="nested">
                <SetupDataTable variant="nested" density="compact" className="min-w-[960px]">
                  <SetupDataTableHead>
                    <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                      <SetupDataTableHeaderCell>Pelapor / Fasilitas</SetupDataTableHeaderCell>
                      {historyMatrix.periods.map((period) => (
                        <SetupDataTableHeaderCell
                          key={period}
                          className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}
                        >
                          {period}
                        </SetupDataTableHeaderCell>
                      ))}
                    </SetupDataTableRow>
                  </SetupDataTableHead>
                  <SetupDataTableBody>
                    {historyMatrix.rows.map((row) => (
                      <SetupDataTableRow key={row.key} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                        <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                          <p className="font-semibold text-slate-900">{row.reporter}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.accountNumber}</p>
                        </SetupDataTableCell>
                        {historyMatrix.periods.map((period) => (
                          <SetupDataTableCell
                            key={`${row.key}-${period}`}
                            className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
                          >
                            <SetupCollectibilityBadge value={row.periods.get(period)} wrap />
                          </SetupDataTableCell>
                        ))}
                      </SetupDataTableRow>
                    ))}
                    {historyMatrix.rows.length === 0 ? (
                      <SetupDataTableEmptyRow colSpan={Math.max(historyMatrix.periods.length + 1, 2)}>
                        Histori kolektibilitas belum tersedia pada file IDEB ini.
                      </SetupDataTableEmptyRow>
                    ) : null}
                  </SetupDataTableBody>
                </SetupDataTable>
              </SetupTableCard>
            </SectionCard>

            <SectionCard title="Perbandingan dengan F01 Internal">
              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <MetricCard label="Cocok" value={formatNumber(comparison?.summary.matched ?? 0)} />
                <MetricCard
                  label="Beda Data"
                  value={formatNumber(comparison?.summary.different ?? 0)}
                />
                <MetricCard
                  label="Fasilitas Eksternal"
                  value={formatNumber(comparison?.summary.external_only ?? 0)}
                />
                <MetricCard
                  label="Internal Tidak Muncul"
                  value={formatNumber(comparison?.summary.internal_only ?? 0)}
                />
              </div>

              {!selected.debtor_id ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  Belum terhubung ke debitur internal, sehingga perbandingan F01 belum tersedia.
                </div>
              ) : (
                <SetupTableCard variant="nested">
                  <SetupDataTable variant="nested" density="compact" className="min-w-[1040px]">
                    <SetupDataTableHead>
                      <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                        <SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Fasilitas IDEB</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>F01 Internal</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                          KOL
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                          Outstanding
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Perbedaan</SetupDataTableHeaderCell>
                      </SetupDataTableRow>
                    </SetupDataTableHead>
                    <SetupDataTableBody>
                      {(comparison?.items ?? []).map((item, index) => {
                        const external = item.external;
                        const internal = item.internal;
                        const differences =
                          item.differences.length > 0
                            ? item.differences.map((entry) => entry.label).join(", ")
                            : "Sesuai";

                        return (
                          <SetupDataTableRow
                            key={`${item.match_key ?? "comparison"}-${index}`}
                            className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                          >
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                              <SetupStatusBadge status={item.status_label} showIcon={false} />
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                              {external ? (
                                <>
                                  <p className="font-semibold text-slate-900">
                                    {display(external.reporter)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {display(external.account_number)}
                                  </p>
                                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                                    {display(external.product)}
                                  </p>
                                </>
                              ) : (
                                "-"
                              )}
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                              {internal ? (
                                <>
                                  <p className="font-semibold text-slate-900">
                                    {display(internal.no_kontrak)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {display(internal.facility_number)}
                                  </p>
                                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                                    {display(internal.product)}
                                  </p>
                                </>
                              ) : (
                                "-"
                              )}
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                              <div className="flex flex-col items-center gap-1">
                                {external ? (
                                  <SetupCollectibilityBadge value={external.collectibility} wrap />
                                ) : null}
                                {internal ? (
                                  <SetupCollectibilityBadge value={internal.collectibility} wrap />
                                ) : null}
                                {!external && !internal ? "-" : null}
                              </div>
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                              <div className="space-y-1">
                                <p>{formatCurrency(external?.outstanding)}</p>
                                <p className="text-xs text-slate-500">
                                  Internal: {formatCurrency(internal?.outstanding)}
                                </p>
                              </div>
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                              <span className="line-clamp-2 text-sm text-slate-700" title={differences}>
                                {differences}
                              </span>
                            </SetupDataTableCell>
                          </SetupDataTableRow>
                        );
                      })}

                      {isLoadingComparison ? (
                        <SetupDataTableEmptyRow colSpan={6}>
                          Memuat perbandingan IDEB dengan F01 internal...
                        </SetupDataTableEmptyRow>
                      ) : null}

                      {!isLoadingComparison && comparisonError ? (
                        <SetupDataTableEmptyRow colSpan={6}>
                          {comparisonError}
                        </SetupDataTableEmptyRow>
                      ) : null}

                      {!isLoadingComparison &&
                      !comparisonError &&
                      (!comparison || comparison.items.length === 0) ? (
                        <SetupDataTableEmptyRow colSpan={6}>
                          Belum ada data yang bisa dibandingkan.
                        </SetupDataTableEmptyRow>
                      ) : null}
                    </SetupDataTableBody>
                  </SetupDataTable>
                </SetupTableCard>
              )}
            </SectionCard>

            <div className="grid gap-5">
              <SectionCard title="Agunan">
                <SetupTableCard variant="nested">
                  <SetupDataTable variant="nested" density="compact" className="min-w-[760px]">
                    <SetupDataTableHead>
                      <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                        <SetupDataTableHeaderCell>Fasilitas</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Jenis / Bukti</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                          Nilai
                        </SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Lokasi</SetupDataTableHeaderCell>
                      </SetupDataTableRow>
                    </SetupDataTableHead>
                    <SetupDataTableBody>
                      {collateralRows.slice(0, 50).map(({ collateral, reporter, accountNumber }, index) => (
                        <SetupDataTableRow key={`${reporter}-${accountNumber}-collateral-${index}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            <p className="font-semibold text-slate-900">{display(reporter)}</p>
                            <p className="mt-1 text-xs text-slate-500">{display(accountNumber)}</p>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            <p className="line-clamp-2">
                              {[
                                textValue(collateral, ["jenisAgunanKet", "jenis_agunan", "type", "collateral_type"]),
                                textValue(collateral, ["buktiKepemilikan", "bukti_kepemilikan", "ownership_proof", "proof_number"]),
                              ].filter(Boolean).join(" - ") || "-"}
                            </p>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                            {formatCurrency(numberValue(collateral, ["nilaiAgunan", "nilai_agunan", "value", "independent_appraisal_value", "appraisal_value", "market_value"]))}
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            <p className="line-clamp-2">
                              {display(textValue(collateral, ["alamat", "address", "location", "lokasi"]))}
                            </p>
                          </SetupDataTableCell>
                        </SetupDataTableRow>
                      ))}
                      {collateralRows.length === 0 ? (
                        <SetupDataTableEmptyRow colSpan={4}>
                          Data agunan tidak tersedia.
                        </SetupDataTableEmptyRow>
                      ) : null}
                    </SetupDataTableBody>
                  </SetupDataTable>
                </SetupTableCard>
              </SectionCard>

              <SectionCard title="Penjamin">
                <SetupTableCard variant="nested">
                  <SetupDataTable variant="nested" density="compact" className="min-w-[680px]">
                    <SetupDataTableHead>
                      <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                        <SetupDataTableHeaderCell>Fasilitas</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Penjamin</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>No Identitas</SetupDataTableHeaderCell>
                        <SetupDataTableHeaderCell>Alamat</SetupDataTableHeaderCell>
                      </SetupDataTableRow>
                    </SetupDataTableHead>
                    <SetupDataTableBody>
                      {guarantorRows.slice(0, 50).map(({ guarantor, reporter, accountNumber }, index) => (
                        <SetupDataTableRow key={`${reporter}-${accountNumber}-guarantor-${index}`} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            <p className="font-semibold text-slate-900">{display(reporter)}</p>
                            <p className="mt-1 text-xs text-slate-500">{display(accountNumber)}</p>
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            {display(textValue(guarantor, ["name", "nama", "guarantor_name"]))}
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            {display(textValue(guarantor, ["identity_number", "noIdentitas", "no_identitas"]))}
                          </SetupDataTableCell>
                          <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                            <p className="line-clamp-2">
                              {display(textValue(guarantor, ["address", "alamat"]))}
                            </p>
                          </SetupDataTableCell>
                        </SetupDataTableRow>
                      ))}
                      {guarantorRows.length === 0 ? (
                        <SetupDataTableEmptyRow colSpan={4}>
                          Data penjamin tidak tersedia pada file IDEB ini.
                        </SetupDataTableEmptyRow>
                      ) : null}
                    </SetupDataTableBody>
                  </SetupDataTable>
                </SetupTableCard>
              </SectionCard>
            </div>

            <SectionCard title="Kesimpulan">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-900">
                {display(selected.summary_detail?.conclusion)}
              </div>
            </SectionCard>

          </div>
        ) : null}
      </DashboardModal>
    </DashboardPageShell>
  );
}
