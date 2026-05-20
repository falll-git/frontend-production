"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Label,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Database, HardDrive } from "lucide-react";

import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import { storageUsageService } from "@/services/storage-usage.service";
import type { DashboardMenuNode } from "@/types/rbac.types";
import type {
  StorageUsageDashboardData,
  StorageUsageStatusKey,
} from "@/types/storage-usage.types";

type StorageOverviewWidgetProps = {
  widget: DashboardMenuNode;
};

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

function formatGb(value: number) {
  return `${numberFormatter.format(value)} GB`;
}

function formatStorageSize(bytes: number, fallbackGb: number) {
  if (bytes > 0 && bytes < 1024 ** 3) {
    const mb = bytes / 1024 ** 2;
    return `${numberFormatter.format(Math.max(mb, 0.01))} MB`;
  }

  return formatGb(fallbackGb);
}

function formatPrice(value: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();
  const prefix = normalizedCurrency === "USD" ? "$" : `${normalizedCurrency} `;
  const locale = normalizedCurrency === "USD" ? "en-US" : "id-ID";
  return `${prefix}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)}`;
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
    <div className="relative grid h-44 w-44 place-items-center">
      <svg className="h-44 w-44 -rotate-90" viewBox="0 0 120 120">
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
        <p className="text-3xl font-bold text-gray-900">
          {numberFormatter.format(Math.round(percentage))}%
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
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="skeleton-card h-[600px]" />
        <div className="skeleton-card h-[600px]" />
      </div>
    </section>
  );
}

function StorageTrendChart({
  data,
  className = "h-[280px]",
}: {
  data: StorageUsageDashboardData;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const chartData = useMemo(
    () =>
      data.trend.map((item) => ({
        ...item,
        used_gb: Number(item.used_gb.toFixed(2)),
      })),
    [data.trend],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.floor(rect.width);
      const nextHeight = Math.floor(rect.height);

      if (nextWidth <= 0 || nextHeight <= 0) return;

      setChartSize((current) =>
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

  return (
    <div ref={containerRef} className={`w-full min-w-0 ${className}`}>
      {chartSize.width > 0 && chartSize.height > 0 ? (
        <RechartsAreaChart
          width={chartSize.width}
          height={chartSize.height}
          data={chartData}
          margin={{ top: 18, right: 18, bottom: 18, left: 4 }}
        >
          <defs>
            <linearGradient id="storageUsedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1773B0" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#1773B0" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
          <YAxis
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(value) => `${value} GB`}
            tickLine={false}
            width={68}
          >
            <Label
              angle={-90}
              offset={0}
              position="insideLeft"
              style={{
                fill: "#64748b",
                fontSize: 12,
                fontWeight: 600,
                textAnchor: "middle",
              }}
              value="Storage terpakai (GB)"
            />
          </YAxis>
          <XAxis
            axisLine={false}
            dataKey="label"
            height={38}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
          >
            <Label
              offset={-2}
              position="insideBottom"
              style={{
                fill: "#64748b",
                fontSize: 12,
                fontWeight: 600,
                textAnchor: "middle",
              }}
              value="Tanggal penggunaan"
            />
          </XAxis>
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
            formatter={(value) => [formatGb(Number(value)), "Storage"]}
            labelClassName="text-sm font-semibold text-gray-900"
            contentStyle={{
              borderRadius: 8,
              borderColor: "#e5e7eb",
              boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
            }}
          />
          <ReferenceLine
            y={data.config.free_quota_gb}
            stroke="#94a3b8"
            strokeDasharray="6 6"
            label={{
              value: `Limit ${formatGb(data.config.free_quota_gb)}`,
              fill: "#475569",
              fontSize: 12,
              position: "insideTopRight",
            }}
          />
          <Area
            dataKey="used_gb"
            fill="url(#storageUsedGradient)"
            fillOpacity={1}
            name="Storage"
            stroke="#1773B0"
            strokeWidth={2.5}
            type="monotone"
          />
        </RechartsAreaChart>
      ) : null}
    </div>
  );
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

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold text-gray-800">
          <HardDrive className="h-6 w-6 flex-none text-gray-600" aria-hidden="true" />
          <span className="truncate">{widget.name}</span>
        </h2>
        <SetupStatusBadge status={data.usage.status_label} tone={statusTone} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-h-[600px] flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex justify-center pt-8">
            <StorageProgressCircle
              percentage={data.usage.used_percentage}
              status={data.usage.status_key}
            />
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Terpakai</span>
              <span className="font-bold text-gray-900">
                {formatStorageSize(data.usage.used_bytes, data.usage.used_gb)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Kuota awal</span>
              <span className="font-bold text-gray-900">
                {formatGb(data.config.free_quota_gb)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {data.usage.overage_gb > 0 ? "Kelebihan" : "Sisa"}
              </span>
              <span
                className={`font-bold ${
                  data.usage.overage_gb > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatStorageSize(
                  data.usage.overage_gb > 0
                    ? data.usage.overage_bytes
                    : data.usage.remaining_bytes,
                  data.usage.overage_gb > 0
                    ? data.usage.overage_gb
                    : data.usage.remaining_gb,
                )}
              </span>
            </div>
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

          <div className="mt-auto translate-y-[-56px] rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Estimasi Kelebihan
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(data.usage.estimated_overage_cost, data.config.currency)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatPrice(data.config.overage_price_per_gb, data.config.currency)}
                  /GB setelah {formatGb(data.config.free_quota_gb)}
                </p>
              </div>
              <Database className="h-8 w-8 text-gray-900" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <StorageTrendChart data={data} className="min-h-[600px] flex-1" />
        </div>
      </div>
    </section>
  );
}
