"use client";

import {
  parseNumberCsv,
  parseStringCsv,
} from "@/components/builder/renderers/editors/parsing";
import type { BlockRenderer } from "../types";

// ---------------------------------------------------------------------------
// Chart palette — CSS custom properties defined in globals.css (shadcn theme).
// Fall back to Tailwind defaults when vars are not present.
// ---------------------------------------------------------------------------
const PALETTE = [
  "var(--chart-1, #2563eb)",
  "var(--chart-2, #16a34a)",
  "var(--chart-3, #d97706)",
  "var(--chart-4, #9333ea)",
  "var(--chart-5, #e11d48)",
];

function seriesColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

// Normalize a value to [0, 1]. Returns 0 when range is 0 (all values equal).
function normalize(v: number, min: number, max: number): number {
  if (max === min) return 0;
  return (v - min) / (max - min);
}

/** Global min/max across all series. Returns [0, 1] fallback when empty. */
function globalMinMax(allSeries: number[][]): { min: number; max: number } {
  const flat = allSeries.flat().filter((n) => Number.isFinite(n));
  if (flat.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  // If all values identical, widen range by 1 to avoid divide-by-zero.
  return { min, max: max > min ? max : min + 1 };
}

// ---------------------------------------------------------------------------
// Fixed SVG canvas geometry
// ---------------------------------------------------------------------------
const W = 300;
const H = 160;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 8;
/** Bottom padding leaving space for x-axis labels. */
const PLOT_BOTTOM = H - 24;

function plotX(index: number, total: number): number {
  const count = total <= 1 ? 1 : total - 1;
  return PAD_L + ((W - PAD_L - PAD_R) * index) / count;
}

/** Map normalized [0,1] value to SVG y coordinate (inverted y-axis). */
function plotY(normalized: number): number {
  return PAD_T + (PLOT_BOTTOM - PAD_T) * (1 - normalized);
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

type SeriesData = { name: string; values: number[] };

interface ChartBodyProps {
  series: SeriesData[];
  showGrid: boolean;
  showLegend: boolean;
  xLabels: string[];
}

function GridLines({ min, max }: { min: number; max: number }) {
  const fracs = [0.25, 0.5, 0.75, 1.0];
  return (
    <>
      {fracs.map((frac) => {
        const y = plotY(frac);
        const value = min + frac * (max - min);
        return (
          <g key={frac}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={PAD_L}
              y={y - 2}
              fontSize={8}
              fill="currentColor"
              fillOpacity={0.4}
            >
              {Math.round(value)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function XAxisLabels({ labels, total }: { labels: string[]; total: number }) {
  if (labels.length === 0) return null;
  return (
    <>
      {labels.slice(0, total).map((label, i) => (
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: stable positional label
          key={i}
          x={plotX(i, total)}
          y={H - 4}
          fontSize={8}
          fill="currentColor"
          fillOpacity={0.5}
          textAnchor="middle"
        >
          {label.slice(0, 6)}
        </text>
      ))}
    </>
  );
}

function Legend({ series, y }: { series: SeriesData[]; y: number }) {
  return (
    <g>
      {series.map((s, i) => (
        <g
          // biome-ignore lint/suspicious/noArrayIndexKey: stable positional legend entry
          key={i}
          transform={`translate(${PAD_L + i * 70}, ${y})`}
        >
          <rect width={8} height={8} rx={2} fill={seriesColor(i)} />
          <text x={11} y={7} fontSize={8} fill="currentColor" fillOpacity={0.7}>
            {s.name.slice(0, 8)}
          </text>
        </g>
      ))}
    </g>
  );
}

function NoDataPlaceholder() {
  return (
    <div className="flex h-24 items-center justify-center rounded border border-dashed border-muted-foreground/30">
      <span className="text-xs italic text-muted-foreground/60">
        데이터 없음
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line / Area chart
// ---------------------------------------------------------------------------

function LineAreaChart({
  series,
  isArea,
  showGrid,
  showLegend,
  xLabels,
}: ChartBodyProps & { isArea: boolean }) {
  const allData = series.map((s) => s.values);
  const { min, max } = globalMinMax(allData);
  const hasData = series.some((s) => s.values.length > 0);
  if (!hasData) return <NoDataPlaceholder />;

  const legendH = showLegend ? 14 : 0;
  const totalH = H + legendH;
  const maxLen = Math.max(...series.map((s) => s.values.length));

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" aria-hidden>
      <title>Chart</title>
      {showGrid && <GridLines min={min} max={max} />}
      {series.map((s, si) => {
        if (s.values.length === 0) return null;
        const pts = s.values.map((v, idx) => ({
          x: plotX(idx, s.values.length),
          y: plotY(normalize(v, min, max)),
        }));
        const color = seriesColor(si);
        const polylineStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
        if (isArea) {
          const first = pts[0];
          const last = pts[pts.length - 1];
          const baseY = plotY(normalize(Math.max(0, min), min, max));
          const areaD = [
            `M ${first.x} ${baseY}`,
            ...pts.map((p) => `L ${p.x} ${p.y}`),
            `L ${last.x} ${baseY}`,
            "Z",
          ].join(" ");
          return (
            <g
              // biome-ignore lint/suspicious/noArrayIndexKey: stable positional series
              key={si}
            >
              <polyline
                points={polylineStr}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              <path d={areaD} fill={color} fillOpacity={0.15} />
            </g>
          );
        }
        return (
          <polyline
            // biome-ignore lint/suspicious/noArrayIndexKey: stable positional series
            key={si}
            points={polylineStr}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        );
      })}
      <XAxisLabels labels={xLabels} total={maxLen} />
      {showLegend && <Legend series={series} y={H + 2} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Bar chart (grouped)
// ---------------------------------------------------------------------------

function BarChart({ series, showGrid, showLegend, xLabels }: ChartBodyProps) {
  const allData = series.map((s) => s.values);
  const { min: rawMin, max } = globalMinMax(allData);
  // Bar charts baseline at 0 unless all values are negative.
  const min = rawMin >= 0 ? 0 : rawMin;
  const hasData = series.some((s) => s.values.length > 0);
  if (!hasData) return <NoDataPlaceholder />;

  const numGroups = Math.max(...series.map((s) => s.values.length));
  const barAreaW = W - PAD_L - PAD_R;
  const groupW = numGroups > 0 ? barAreaW / numGroups : barAreaW;
  const barW = Math.max(2, groupW / Math.max(1, series.length) - 2);
  const legendH = showLegend ? 14 : 0;
  const totalH = H + legendH;

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" aria-hidden>
      <title>Chart</title>
      {showGrid && <GridLines min={min} max={max} />}
      {series.map((s, si) =>
        s.values.map((v, gi) => {
          const norm = normalize(v, min, max);
          const barH = Math.max(1, (PLOT_BOTTOM - PAD_T) * norm);
          const x = PAD_L + gi * groupW + si * (barW + 1);
          const y = plotY(norm);
          return (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: compound stable key
              key={`${si}-${gi}`}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={seriesColor(si)}
              rx={1}
            />
          );
        }),
      )}
      <XAxisLabels labels={xLabels} total={numGroups} />
      {showLegend && <Legend series={series} y={H + 2} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Donut chart
// ---------------------------------------------------------------------------

function DonutChart({
  series,
  showLegend,
}: {
  series: SeriesData[];
  showLegend: boolean;
}) {
  // Use the first series's data values as segment proportions.
  const firstValues = series[0]?.values ?? [];
  const positiveValues = firstValues.filter((v) => v > 0);
  if (positiveValues.length === 0) return <NoDataPlaceholder />;

  const total = positiveValues.reduce((a, b) => a + b, 0);
  const CX = W / 2;
  const CY = 68;
  const R_OUTER = 52;
  const R_INNER = 28;

  let currentAngle = -Math.PI / 2;
  const arcs = positiveValues.map((v, i) => {
    const angle = (v / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    currentAngle += angle;
    const endAngle = currentAngle;

    const x1 = CX + R_OUTER * Math.cos(startAngle);
    const y1 = CY + R_OUTER * Math.sin(startAngle);
    const x2 = CX + R_OUTER * Math.cos(endAngle);
    const y2 = CY + R_OUTER * Math.sin(endAngle);
    const ix1 = CX + R_INNER * Math.cos(endAngle);
    const iy1 = CY + R_INNER * Math.sin(endAngle);
    const ix2 = CX + R_INNER * Math.cos(startAngle);
    const iy2 = CY + R_INNER * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    return { d, color: seriesColor(i) };
  });

  const legendH = showLegend ? 14 : 0;
  const totalH = CY + R_OUTER + 10 + legendH;
  const legendSeries = series.map((s) => ({
    name: s.name,
    values: [] as number[],
  }));

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" aria-hidden>
      <title>Chart</title>
      {arcs.map((arc, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable positional arc
        <path key={i} d={arc.d} fill={arc.color} />
      ))}
      <text
        x={CX}
        y={CY + 4}
        textAnchor="middle"
        fontSize={10}
        fill="currentColor"
        fontWeight="600"
      >
        {total}
      </text>
      {showLegend && <Legend series={legendSeries} y={CY + R_OUTER + 4} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const ChartDetail: BlockRenderer = ({ vm }) => {
  const dv = vm.displayValue;
  const kind = typeof dv.kind === "string" ? dv.kind : "line";
  const title = typeof dv.title === "string" ? dv.title : "";
  const showLegend = dv.showLegend !== false;
  const showGrid = dv.showGrid !== false;
  const xLabels = parseStringCsv(
    typeof dv.xLabels === "string" ? dv.xLabels : undefined,
  );

  const rawSeries = Array.isArray(dv.series)
    ? (dv.series as Array<Record<string, unknown>>)
    : [];
  const series: SeriesData[] = rawSeries.map((s) => ({
    name: typeof s.name === "string" ? s.name : "",
    values: parseNumberCsv(typeof s.data === "string" ? s.data : undefined),
  }));

  const chartProps: ChartBodyProps = { series, showGrid, showLegend, xLabels };

  return (
    <div className="space-y-1">
      {title ? (
        <div className="text-xs font-semibold truncate">{title}</div>
      ) : null}
      {kind === "bar" ? (
        <BarChart {...chartProps} />
      ) : kind === "donut" ? (
        <DonutChart series={series} showLegend={showLegend} />
      ) : kind === "area" ? (
        <LineAreaChart {...chartProps} isArea />
      ) : (
        <LineAreaChart {...chartProps} isArea={false} />
      )}
    </div>
  );
};
