"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Files,
  HardDrive,
  Minus,
} from "lucide-react";

import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import { storageUsageService } from "@/services/storage-usage.service";
import type { DashboardMenuNode } from "@/types/rbac.types";
import type {
  StorageUsageDashboardData,
  StorageUsageStatusKey,
  StorageUsageTrendPoint,
} from "@/types/storage-usage.types";

type StorageOverviewWidgetProps = {
  widget: DashboardMenuNode;
};

type StorageUnit = "KB" | "MB" | "GB";

type StorageChartPoint = StorageUsageTrendPoint & {
  used_value: number;
  delta_value: number;
};

type StorageTooltipPayload = {
  dataKey?: string;
  name?: string;
  payload?: StorageChartPoint;
  value?: number;
};

type StorageTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: StorageTooltipPayload[];
  unit: StorageUnit;
};

const MB_BYTES = 1024 ** 2;
const GB_BYTES = 1024 ** 3;

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});
const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

function formatGb(value: number) {
  return `${numberFormatter.format(value)} GB`;
}

function formatStorageSize(bytes: number, fallbackGb = 0) {
  const safeBytes = Math.max(Number(bytes) || 0, 0);
  if (safeBytes === 0) return "0 MB";

  if (safeBytes < MB_BYTES) {
    const kb = safeBytes / 1024;
    return `${numberFormatter.format(Math.max(kb, 0.1))} KB`;
  }

  if (safeBytes < GB_BYTES) {
    const mb = safeBytes / MB_BYTES;
    return `${numberFormatter.format(Math.max(mb, 0.01))} MB`;
  }

  return formatGb(fallbackGb > 0 ? fallbackGb : safeBytes / GB_BYTES);
}

function formatSignedStorageSize(bytes: number) {
  if (bytes === 0) return "Tidak ada perubahan";
  const prefix = bytes > 0 ? "+" : "-";
  return `${prefix} ${formatStorageSize(Math.abs(bytes))}`;
}

function formatPercentage(value: number) {
  if (value > 0 && value < 0.01) return "<0,01%";
  return `${numberFormatter.format(Math.max(value, 0))}%`;
}

function formatPrice(value: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (normalizedCurrency === "IDR") {
    return `Rp ${new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(value)}`;
  }

  const prefix = normalizedCurrency === "USD" ? "$" : `${normalizedCurrency} `;
  const locale = normalizedCurrency === "USD" ? "en-US" : "id-ID";
  return `${prefix}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatRate(value: number, currency: string) {
  if (value <= 0) return "Gratis";
  return `${formatPrice(value, currency)}/GB/bulan`;
}

function getStatusTone(status: StorageUsageStatusKey): SetupStatusTone {
  if (status === "OVER_LIMIT") return "red";
  if (status === "NEAR_LIMIT") return "amber";
  return "emerald";
}

function getProgressColor(status: StorageUsageStatusKey) {
  if (status === "OVER_LIMIT") return "#ef4444";
  if (status === "NEAR_LIMIT") return "#f59e0b";
  return "#10b981";
}

function resolveChartUnit(points: StorageUsageTrendPoint[]): StorageUnit {
  const maxUsedBytes = points.reduce(
    (max, point) => Math.max(max, point.used_bytes),
    0,
  );
  if (maxUsedBytes < MB_BYTES) return "KB";
  return maxUsedBytes >= GB_BYTES ? "GB" : "MB";
}

function toUnitValue(bytes: number, unit: StorageUnit) {
  const divisor =
    unit === "GB" ? GB_BYTES : unit === "MB" ? MB_BYTES : 1024;
  const digits = unit === "GB" ? 4 : unit === "MB" ? 2 : 1;
  return Number(((Number(bytes) || 0) / divisor).toFixed(digits));
}

function formatUnitValue(value: number, unit: StorageUnit) {
  return `${numberFormatter.format(value)} ${unit}`;
}

function getLatestDelta(data: StorageUsageDashboardData) {
  return data.trend[data.trend.length - 1]?.delta_bytes ?? 0;
}

function resolveChartUpperBound(maxValue: number, unit: StorageUnit) {
  if (maxValue <= 0) {
    if (unit === "KB") return 128;
    if (unit === "MB") return 1;
    return 0.01;
  }

  if (unit === "KB") {
    if (maxValue <= 64) return 64;
    if (maxValue <= 128) return 128;
    if (maxValue <= 256) return 256;
    if (maxValue <= 512) return 512;
    return Math.ceil((maxValue * 1.15) / 128) * 128;
  }

  if (unit === "MB") {
    if (maxValue <= 0.25) return 0.25;
    if (maxValue <= 0.5) return 0.5;
    if (maxValue <= 1) return 1;
    if (maxValue <= 2) return 2;
    if (maxValue <= 5) return 5;
    if (maxValue <= 10) return 10;
    return Math.ceil(maxValue * 1.15);
  }

  if (maxValue <= 0.01) return 0.01;
  if (maxValue <= 0.05) return 0.05;
  if (maxValue <= 0.1) return 0.1;
  if (maxValue <= 0.25) return 0.25;
  if (maxValue <= 0.5) return 0.5;
  if (maxValue <= 1) return 1;
  return Math.ceil(maxValue * 1.15 * 10) / 10;
}

function useElementSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.floor(rect.width);
      const nextHeight = Math.floor(rect.height);

      if (nextWidth <= 0 || nextHeight <= 0) return;

      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    updateSize();
    const frame = window.requestAnimationFrame(updateSize);
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(node);
    window.addEventListener("resize", updateSize);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return [ref, size] as const;
}

function StorageProgressCircle({
  percentage,
  status,
}: {
  percentage: number;
  status: StorageUsageStatusKey;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.min(Math.max(percentage, 0), 100);
  const dashOffset = circumference - (safePercentage / 100) * circumference;
  const progressColor = getProgressColor(status);

  return (
    <div className="relative grid h-40 w-40 place-items-center">
      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900">
          {formatPercentage(percentage)}
        </p>
        <p className="text-sm font-semibold text-gray-500">Terpakai</p>
      </div>
    </div>
  );
}

function StorageWidgetSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="skeleton-line h-6 w-64" />
        <div className="skeleton-line h-8 w-24 rounded-full" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="skeleton-card h-[540px]" />
        <div className="skeleton-card h-[540px]" />
      </div>
    </section>
  );
}

function StorageTooltip({ active, label, payload, unit }: StorageTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-bold text-gray-900">{label}</p>
      <div className="mt-2 space-y-1 text-xs text-gray-600">
        {payload.map((item) => {
          const itemValue = Number(item.value ?? 0);
          const labelText =
            item.dataKey === "delta_value" ? "Perubahan harian" : "Total terpakai";
          return (
            <div
              key={`${item.dataKey}-${labelText}`}
              className="flex items-center justify-between gap-5"
            >
              <span>{labelText}</span>
              <span className="font-bold text-gray-900">
                {formatUnitValue(itemValue, unit)}
              </span>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-5">
          <span>Jumlah file</span>
          <span className="font-bold text-gray-900">
            {integerFormatter.format(point.file_count)}
          </span>
        </div>
        {point.is_estimated ? (
          <p className="pt-1 font-semibold text-amber-700">Data estimasi</p>
        ) : null}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 text-gray-500">{label}</span>
      <span className={`text-right font-bold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function StorageTrendChart({ data }: { data: StorageUsageDashboardData }) {
  const [lineChartRef, lineChartSize] = useElementSize();
  const chartUnit = useMemo(() => resolveChartUnit(data.trend), [data.trend]);
  const chartData = useMemo<StorageChartPoint[]>(
    () =>
      data.trend.map((item) => ({
        ...item,
        used_value: toUnitValue(item.used_bytes, chartUnit),
        delta_value: toUnitValue(item.delta_bytes, chartUnit),
      })),
    [chartUnit, data.trend],
  );
  const maxUsedValue = useMemo(
    () =>
      chartData.reduce(
        (max, item) => Math.max(max, item.used_value),
        0,
      ),
    [chartData],
  );
  const yAxisUpperBound = useMemo(
    () => resolveChartUpperBound(maxUsedValue, chartUnit),
    [chartUnit, maxUsedValue],
  );
  const estimatedCount = data.trend.filter((item) => item.is_estimated).length;
  const latestDelta = getLatestDelta(data);
  const hasUsageData = data.trend.some(
    (item) => item.used_bytes > 0 || item.delta_bytes !== 0,
  );
  const latestDeltaTone =
    latestDelta > 0
      ? "text-[#1773B0]"
      : latestDelta < 0
        ? "text-emerald-600"
        : "text-gray-500";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Riwayat 7 hari</p>
          <p className="text-xs text-gray-500">
            {data.usage.file_count > 0
              ? `${integerFormatter.format(data.usage.file_count)} file tercatat`
              : "Belum ada file tersimpan"}
            {estimatedCount > 0 ? `, ${estimatedCount} hari estimasi` : ""}
          </p>
        </div>
        <div className={`text-right text-sm font-bold ${latestDeltaTone}`}>
          {formatSignedStorageSize(latestDelta)}
          <p className="text-xs font-semibold text-gray-500">hari ini</p>
        </div>
      </div>

      {!hasUsageData ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-gray-900">
            Belum ada pemakaian storage.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Riwayat akan terisi otomatis setelah file mulai tersimpan.
          </p>
        </div>
      ) : (
        <div ref={lineChartRef} className="h-[340px] min-w-0">
          {lineChartSize.width > 0 && lineChartSize.height > 0 ? (
            <LineChart
              data={chartData}
              height={lineChartSize.height}
              margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
              width={lineChartSize.width}
            >
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
              <YAxis
                axisLine={false}
                domain={[0, yAxisUpperBound]}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => formatUnitValue(Number(value), chartUnit)}
                tickLine={false}
                tickCount={6}
                width={72}
              />
              <XAxis
                axisLine={false}
                dataKey="label"
                height={28}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip content={<StorageTooltip unit={chartUnit} />} />
              <Line
                activeDot={{ r: 5, strokeWidth: 0 }}
                dataKey="used_value"
                dot={{ r: 3, strokeWidth: 1 }}
                name="Total terpakai"
                stroke="#1773B0"
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DeltaIcon({ value }: { value: number }) {
  if (value > 0) return <ArrowUpRight className="h-4 w-4" aria-hidden="true" />;
  if (value < 0) return <ArrowDownRight className="h-4 w-4" aria-hidden="true" />;
  return <Minus className="h-4 w-4" aria-hidden="true" />;
}

export default function StorageOverviewWidget({
  widget,
}: StorageOverviewWidgetProps) {
  const [data, setData] = useState<StorageUsageDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await storageUsageService.getSummary(7);
        if (!ignore) setData(result);
      } catch {
        if (!ignore) {
          setErrorMessage("Ringkasan storage belum bisa dimuat.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadSummary();

    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) return <StorageWidgetSkeleton />;

  if (errorMessage || !data) {
    return (
      <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-red-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-semibold">
            {errorMessage ?? "Ringkasan storage tidak tersedia."}
          </p>
        </div>
      </section>
    );
  }

  const statusTone = getStatusTone(data.usage.status_key);
  const progressColor = getProgressColor(data.usage.status_key);
  const latestDelta = getLatestDelta(data);
  const remainingLabel = data.usage.overage_gb > 0 ? "Kelebihan" : "Sisa";
  const remainingValue = formatStorageSize(
    data.usage.overage_gb > 0
      ? data.usage.overage_bytes
      : data.usage.remaining_bytes,
    data.usage.overage_gb > 0 ? data.usage.overage_gb : data.usage.remaining_gb,
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold text-gray-800">
          <HardDrive className="h-6 w-6 flex-none text-gray-600" aria-hidden="true" />
          <span className="truncate">{widget.name}</span>
        </h2>
        <SetupStatusBadge status={data.usage.status_label} tone={statusTone} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex justify-center">
            <StorageProgressCircle
              percentage={data.usage.used_percentage}
              status={data.usage.status_key}
            />
          </div>

          <div className="mt-6 space-y-3">
            <MetricRow
              label="Terpakai"
              value={formatStorageSize(data.usage.used_bytes, data.usage.used_gb)}
            />
            <MetricRow label="Kuota" value={formatGb(data.config.free_quota_gb)} />
            <MetricRow
              label={data.usage.overage_gb > 0 ? remainingLabel : "Sisa kuota"}
              value={remainingValue}
              valueClassName={
                data.usage.overage_gb > 0 ? "text-red-600" : "text-emerald-600"
              }
            />
            <MetricRow
              label="File tersimpan"
              value={integerFormatter.format(data.usage.file_count)}
            />
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(data.usage.used_percentage, 100)}%`,
                  backgroundColor: progressColor,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>0 GB</span>
              <span>{formatGb(data.config.free_quota_gb)}</span>
            </div>
          </div>

          <div
            className={`mt-5 flex items-center gap-2 text-sm font-bold ${
              latestDelta > 0
                ? "text-[#1773B0]"
                : latestDelta < 0
                  ? "text-emerald-600"
                  : "text-gray-500"
            }`}
          >
            <DeltaIcon value={latestDelta} />
            <span>{formatSignedStorageSize(latestDelta)} hari ini</span>
          </div>

          <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">Biaya bulan ini</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(data.billing.estimated_cost, data.config.currency)}
              </p>
              <p className="pb-1 text-right text-xs font-semibold text-gray-500">
                {data.billing.estimated_cost > 0
                  ? "Perhitungan sementara"
                  : `Masih dalam kuota ${formatGb(data.config.free_quota_gb)}`}
              </p>
            </div>

            {data.billing.estimated_cost > 0 ? (
              <div className="mt-4 space-y-2">
                {data.billing.tier_breakdown.map((tier) => (
                  <div
                    key={`${tier.from_gb}-${tier.to_gb ?? "up"}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-semibold text-gray-600">{tier.label}</span>
                    <span className="text-right font-bold text-gray-900">
                      {formatRate(tier.price_per_gb, data.config.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Files className="h-4 w-4 text-gray-500" aria-hidden="true" />
                Pemakaian saat ini
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Diperbarui{" "}
                {data.updated_at ? new Date(data.updated_at).toLocaleString("id-ID") : "-"}
              </p>
            </div>
            <p className="text-right text-sm font-bold text-gray-900">
              {formatStorageSize(data.usage.used_bytes, data.usage.used_gb)}
            </p>
          </div>

          <StorageTrendChart data={data} />
        </div>
      </div>
    </section>
  );
}
