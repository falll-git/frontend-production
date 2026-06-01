"use client";

import { useEffect, useRef, useState } from "react";
import { Cell, Label, Pie, PieChart, Tooltip } from "recharts";

export interface DonutNPFChartItem {
  kol: number;
  label: string;
  outstandingPokok: number;
  color: string;
}

interface LabelViewBox {
  cx?: number;
  cy?: number;
}

function formatRatio(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DonutNPFChart({
  data,
  ratio,
  onSegmentClick,
}: {
  data: DonutNPFChartItem[];
  ratio: number;
  onSegmentClick?: (kol: number) => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const hasChartData = data.some((item) => item.outstandingPokok > 0);

  useEffect(() => {
    const node = chartContainerRef.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      if (nextWidth <= 0) return;
      setChartWidth((current) =>
        current === nextWidth ? current : nextWidth,
      );
    };

    updateWidth();
    const frame = window.requestAnimationFrame(updateWidth);
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(node);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  if (!hasChartData) {
    return (
      <div className="flex h-[300px] min-h-[300px] w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center text-sm font-medium text-gray-500">
        Belum ada distribusi kolektibilitas
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div
        ref={chartContainerRef}
        className="flex h-[300px] min-h-[300px] w-full min-w-[1px] max-w-[360px] justify-center"
      >
        {chartWidth > 0 ? (
          <PieChart width={Math.min(chartWidth, 360)} height={300}>
            <Pie
              data={data}
              dataKey="outstandingPokok"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="88%"
              paddingAngle={2}
              isAnimationActive={false}
              stroke="#ffffff"
              strokeWidth={4}
              cursor={onSegmentClick ? "pointer" : undefined}
              onClick={(entry) => {
                if (!onSegmentClick) return;
                const item = entry as Partial<DonutNPFChartItem>;
                if (typeof item.kol === "number") onSegmentClick(item.kol);
              }}
            >
              <Label
                content={({ viewBox }) => {
                  const box = viewBox as LabelViewBox | undefined;
                  const cx = box?.cx ?? 0;
                  const cy = box?.cy ?? 0;

                  return (
                    <g>
                      <text
                        x={cx}
                        y={cy - 4}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-gray-900 text-[28px] font-bold"
                      >
                        {formatRatio(ratio)}%
                      </text>
                      <text
                        x={cx}
                        y={cy + 18}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-gray-500 text-xs"
                      >
                        Rasio NPF
                      </text>
                    </g>
                  );
                }}
              />
              {data.map((item) => (
                <Cell
                  key={item.kol}
                  fill={item.color}
                  cursor={onSegmentClick ? "pointer" : undefined}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | string | undefined) =>
                formatRupiah(Number(value ?? 0))
              }
              contentStyle={{
                borderRadius: 12,
                borderColor: "#e2e8f0",
                fontSize: 12,
              }}
            />
          </PieChart>
        ) : null}
      </div>
    </div>
  );
}
