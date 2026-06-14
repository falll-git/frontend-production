import type { ReactNode } from "react";

export const COLLECTIBILITY_LEVELS = [1, 2, 3, 4, 5] as const;

export type CollectibilityLevel = (typeof COLLECTIBILITY_LEVELS)[number];

export const COLLECTIBILITY_CHART_COLORS: Record<CollectibilityLevel, string> = {
  1: "#00B050",
  2: "#92D050",
  3: "#FFD966",
  4: "#FFFF00",
  5: "#FF0000",
};

const LEVEL_CLASS: Record<CollectibilityLevel | "unknown", string> = {
  1: "border-emerald-600 bg-emerald-500 text-white",
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

  return COLLECTIBILITY_LEVELS.includes(level as CollectibilityLevel)
    ? (level as CollectibilityLevel)
    : null;
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
  const displayValue =
    value === null || value === undefined || String(value).trim() === ""
      ? "-"
      : value;

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
