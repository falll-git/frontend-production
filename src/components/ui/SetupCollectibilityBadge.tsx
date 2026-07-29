import type { ReactNode } from "react";

export const COLLECTIBILITY_LEVELS = [1, 2, 3, 4, 5] as const;

export type CollectibilityLevel = (typeof COLLECTIBILITY_LEVELS)[number];

export const COLLECTIBILITY_LABELS: Record<CollectibilityLevel, string> = {
  1: "Lancar",
  2: "Dalam Perhatian Khusus",
  3: "Kurang Lancar",
  4: "Diragukan",
  5: "Macet",
};

export const COLLECTIBILITY_CHART_COLORS: Record<CollectibilityLevel, string> = {
  1: "#00B050",
  2: "#92D050",
  3: "#FFD966",
  4: "#FFFF00",
  5: "#FF0000",
};

const LEVEL_CLASS: Record<CollectibilityLevel | "unknown", string> = {
  1: "border-emerald-700 bg-emerald-700 text-white",
  2: "border-lime-400 bg-lime-300 text-lime-950",
  3: "border-yellow-300 bg-yellow-200 text-yellow-950",
  4: "border-yellow-400 bg-yellow-400 text-yellow-950",
  5: "border-red-600 bg-red-600 text-white",
  unknown: "border-gray-200 bg-gray-50 text-gray-700",
};

const SIZE_CLASS = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

type SetupCollectibilityBadgeProps = {
  value: string | number | null | undefined;
  label?: ReactNode;
  size?: "sm" | "md";
  wrap?: boolean;
  className?: string;
  textClassName?: string;
};

export function getCollectibilityLevel(
  value: string | number | null | undefined,
): CollectibilityLevel | null {
  if (typeof value === "number") {
    return COLLECTIBILITY_LEVELS.includes(value as CollectibilityLevel)
      ? (value as CollectibilityLevel)
      : null;
  }

  const text = String(value ?? "").trim();
  if (!text || text === "-") return null;

  const normalized = text.replace(/\s+/g, " ");
  const prefixedMatch = normalized.match(/\bKOL\s*([1-5])\b/i);
  const leadingMatch = normalized.match(/^([1-5])(?:\b|\s*[-/])/);
  const firstStandaloneMatch = normalized.match(/\b([1-5])\b/);
  const rawLevel =
    prefixedMatch?.[1] ?? leadingMatch?.[1] ?? firstStandaloneMatch?.[1];
  const level = Number(rawLevel);

  if (COLLECTIBILITY_LEVELS.includes(level as CollectibilityLevel)) {
    return level as CollectibilityLevel;
  }

  const normalizedName = normalized.toUpperCase();
  const nameLevel = Object.entries(COLLECTIBILITY_LABELS).find(
    ([, label]) => label.toUpperCase() === normalizedName,
  )?.[0];

  if (normalizedName === "DPK") return 2;

  return nameLevel ? (Number(nameLevel) as CollectibilityLevel) : null;
}

export function formatCollectibilityLabel(
  value: string | number | null | undefined,
  fallback?: string | number | null,
) {
  const level = getCollectibilityLevel(value) ?? getCollectibilityLevel(fallback);

  if (level) return `${level} - ${COLLECTIBILITY_LABELS[level]}`;

  const fallbackText = String(fallback ?? "").trim();
  if (fallbackText) return fallbackText;

  const valueText = String(value ?? "").trim();
  return valueText || "-";
}

export function getCollectibilityChartColor(
  value: string | number | null | undefined,
  fallback = "#94a3b8",
) {
  const level = getCollectibilityLevel(value);
  return level ? COLLECTIBILITY_CHART_COLORS[level] : fallback;
}

export default function SetupCollectibilityBadge({
  value,
  label,
  size = "sm",
  wrap = false,
  className = "",
  textClassName = "",
}: SetupCollectibilityBadgeProps) {
  const level = getCollectibilityLevel(value);
  const displayValue = formatCollectibilityLabel(value);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-semibold ${SIZE_CLASS[size]} ${
        LEVEL_CLASS[level ?? "unknown"]
      } ${className}`.trim()}
    >
      <span
        className={`${wrap ? "whitespace-normal" : "whitespace-nowrap"} ${textClassName}`.trim()}
      >
        {label ?? displayValue}
      </span>
    </span>
  );
}
