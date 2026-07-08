import { useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { useTagTrend, TREND_RANGE_META, type TrendRange } from "../hooks/useTagTrend";
import type { DataBinding } from "../types";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";

const LINE_COLORS = ["#38bdf8", "#4ade80", "#f59e0b", "#f472b6"];
const LEFT_PADDING = 34; // room for Y-axis value labels
const RIGHT_PADDING = 6;
const BOTTOM_PADDING = 14; // room for X-axis time labels
const HEADER_HEIGHT = 18;
const LEGEND_HEIGHT = 16;
const PLOT_TOP_PADDING = HEADER_HEIGHT + LEGEND_HEIGHT;
const Y_TICK_FRACTIONS = [0, 0.5, 1];
const X_TICK_FRACTIONS = [0, 0.5, 1];

function truncateLegend(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
}

function formatAxisValue(v: number): string {
  if (!Number.isFinite(v)) return "";
  const abs = Math.abs(v);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return v.toFixed(decimals);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatAxisTime(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatClockTime(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/**
 * Historical trend, drawn as plain SVG (the whole canvas is one <svg>, so no
 * chart library with its own DOM container applies here — see Sparkline in
 * the WebSocket test console for the same constraint). Plots the element's
 * primary + extra tag bindings (already wired via BindingSection) over the
 * window picked in ShapeStateSection.
 *
 * Self-labeled: an in-box title strip + tag-color legend (Russian names via
 * formatTagLabelShort, same translation dictionary as the data panels) plus
 * Y/X axis value and time labels — a bare unlabeled line is not readable as
 * a real SCADA trend, per WinCC/PCS7 convention.
 */
const Chart = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, label } = element;
  const range = (element.state?.range as TrendRange) ?? "1h";

  const tags: DataBinding[] = useMemo(() => {
    const list: DataBinding[] = [];
    if (element.dataBinding?.tagId) list.push(element.dataBinding);
    (element.extraBindings ?? []).forEach((b) => {
      if (b?.tagId) list.push(b);
    });
    return list.slice(0, 4);
  }, [element.dataBinding, element.extraBindings]);

  const { series, tagNames, isLoading } = useTagTrend(tags, range);

  const innerW = Math.max(1, width - LEFT_PADDING - RIGHT_PADDING);
  const innerH = Math.max(1, height - PLOT_TOP_PADDING - BOTTOM_PADDING);

  const { paths, minV, maxV } = useMemo(() => {
    if (series.length < 2 || tagNames.length === 0) {
      return { paths: [] as { name: string; d: string; color: string }[], minV: 0, maxV: 1 };
    }

    let min = Infinity;
    let max = -Infinity;
    tagNames.forEach((name) => {
      series.forEach((row) => {
        const v = row[name];
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { paths: [] as { name: string; d: string; color: string }[], minV: 0, maxV: 1 };
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const xStep = innerW / (series.length - 1);
    const scaleY = (v: number) => innerH - ((v - min) / (max - min)) * innerH;

    const builtPaths = tagNames.map((name, i) => {
      let d = "";
      let started = false;
      series.forEach((row, idx) => {
        const v = row[name];
        if (typeof v !== "number") return;
        const px = idx * xStep;
        const py = scaleY(v);
        d += started ? ` L${px},${py}` : `M${px},${py}`;
        started = true;
      });
      return { name, d, color: LINE_COLORS[i % LINE_COLORS.length] };
    });

    return { paths: builtPaths, minV: min, maxV: max };
  }, [series, tagNames, innerW, innerH]);

  const boxFill = style.fill === "none" ? "#0c1118" : style.fill;
  const hasPlot = paths.length > 0;
  const plotCenterX = LEFT_PADDING + innerW / 2;
  const plotCenterY = PLOT_TOP_PADDING + innerH / 2;
  const xStep = innerW / Math.max(1, series.length - 1);

  // Hover crosshair + tooltip — SVG has no built-in hit-testing/tooltip, so
  // this converts the pointer's screen position into the plot group's own
  // local coordinate space via getScreenCTM (works regardless of the
  // canvas's pan/zoom or this shape's own rotation) and finds the nearest
  // bucket index.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handlePlotPointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    const ctm = event.currentTarget.getScreenCTM();
    if (!svg || !ctm) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());
    const idx = Math.min(series.length - 1, Math.max(0, Math.round(local.x / xStep)));
    setHoverIndex(idx);
  };

  const hoverPoint = hoverIndex !== null ? series[hoverIndex] : undefined;
  const hoverRows = hoverPoint
    ? tagNames
        .map((name, i) => ({
          name: formatTagLabelShort(name),
          color: LINE_COLORS[i % LINE_COLORS.length],
          value: hoverPoint[name],
        }))
        .filter((row): row is { name: string; color: string; value: number } => typeof row.value === "number")
    : [];

  return (
    <ParametrizedShape
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      <rect
        width={width}
        height={height}
        rx={4}
        fill={boxFill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />

      {/* Title strip */}
      <rect x={0} y={0} width={width} height={HEADER_HEIGHT} fill="#0f172a" opacity={0.6} />
      <text x={8} y={13} textAnchor="start" fontSize={10} fontWeight={600} fill="#e5e2e1">
        {label || "Тренд"}
      </text>

      {/* Per-tag color legend, Russian names */}
      {tagNames.length > 0 && (
        <g transform={`translate(0, ${HEADER_HEIGHT})`}>
          {tagNames.map((name, i) => {
            const displayName = formatTagLabelShort(name);
            const itemWidth = width / tagNames.length;
            const cx = i * itemWidth + 8;
            const cy = LEGEND_HEIGHT / 2;
            const maxChars = Math.max(3, Math.floor((itemWidth - 16) / 5.5));
            return (
              <g key={name}>
                <title>{displayName}</title>
                <circle cx={cx} cy={cy} r={3} fill={LINE_COLORS[i % LINE_COLORS.length]} />
                <text x={cx + 6} y={cy + 3} fontSize={8} fill="#94a3b8">
                  {truncateLegend(displayName, maxChars)}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {tags.length === 0 ? (
        <text x={plotCenterX} y={plotCenterY} textAnchor="middle" fontSize={10} fill="#64748b">
          Нет привязки
        </text>
      ) : !hasPlot ? (
        <text x={plotCenterX} y={plotCenterY} textAnchor="middle" fontSize={10} fill="#64748b">
          {isLoading ? "Загрузка…" : "Нет данных"}
        </text>
      ) : (
        <>
          {/* Y-axis: gridlines + value labels */}
          {Y_TICK_FRACTIONS.map((f) => {
            const plotY = PLOT_TOP_PADDING + innerH * f;
            const value = maxV - f * (maxV - minV);
            return (
              <g key={f}>
                <line
                  x1={LEFT_PADDING}
                  x2={LEFT_PADDING + innerW}
                  y1={plotY}
                  y2={plotY}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                <text
                  x={LEFT_PADDING - 4}
                  y={plotY + 3}
                  textAnchor="end"
                  fontSize={7}
                  fill="#64748b"
                >
                  {formatAxisValue(value)}
                </text>
              </g>
            );
          })}

          {/* X-axis: time labels at start/middle/end of the plotted window */}
          {X_TICK_FRACTIONS.map((f) => {
            const idx = Math.round(f * (series.length - 1));
            const point = series[idx];
            if (!point) return null;
            const px = LEFT_PADDING + f * innerW;
            const anchor = f === 0 ? "start" : f === 1 ? "end" : "middle";
            return (
              <text
                key={f}
                x={px}
                y={PLOT_TOP_PADDING + innerH + 11}
                textAnchor={anchor}
                fontSize={7}
                fill="#64748b"
              >
                {formatAxisTime(point.ms)}
              </text>
            );
          })}

          <g transform={`translate(${LEFT_PADDING}, ${PLOT_TOP_PADDING})`}>
            {paths.map((p) => (
              <path
                key={p.name}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {hoverIndex !== null && hoverPoint && (
              <g pointerEvents="none">
                <line
                  x1={hoverIndex * xStep}
                  x2={hoverIndex * xStep}
                  y1={0}
                  y2={innerH}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                {tagNames.map((name, i) => {
                  const v = hoverPoint[name];
                  if (typeof v !== "number") return null;
                  const py = innerH - ((v - minV) / (maxV - minV)) * innerH;
                  return (
                    <circle
                      key={name}
                      cx={hoverIndex * xStep}
                      cy={py}
                      r={2.5}
                      fill={LINE_COLORS[i % LINE_COLORS.length]}
                      stroke="#0c1118"
                      strokeWidth={1}
                    />
                  );
                })}
              </g>
            )}

            {/* Invisible hit area — captures hover for the crosshair/tooltip above */}
            <rect
              x={0}
              y={0}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={handlePlotPointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </g>

          {hoverIndex !== null && hoverPoint && hoverRows.length > 0 && (
            <ChartTooltip
              anchorX={LEFT_PADDING + hoverIndex * xStep}
              topY={PLOT_TOP_PADDING + 2}
              boxWidth={width}
              rangeStart={hoverPoint.ms}
              rangeEnd={hoverPoint.ms + (TREND_RANGE_META[range]?.intervalMs ?? 0)}
              rows={hoverRows}
            />
          )}
        </>
      )}
    </ParametrizedShape>
  );
};

interface ChartTooltipProps {
  anchorX: number;
  topY: number;
  boxWidth: number;
  rangeStart: number;
  rangeEnd: number;
  rows: { name: string; color: string; value: number }[];
}

/** Hover tooltip, styled after typical SCADA/ThingsBoard trend hovers: bucket time range + one row per plotted tag. Rendered as a fixed-position box under the legend (not chasing the cursor vertically) so it doesn't jump around or cover the trace it's describing. */
function ChartTooltip({ anchorX, topY, boxWidth, rangeStart, rangeEnd, rows }: ChartTooltipProps) {
  const width = 120;
  const rowHeight = 10;
  const height = 14 + rows.length * rowHeight + 4;
  const x = Math.min(Math.max(anchorX - width / 2, 2), boxWidth - width - 2);

  return (
    <g pointerEvents="none">
      <rect x={x} y={topY} width={width} height={height} rx={4} fill="#0f172a" fillOpacity={0.96} stroke="#334155" strokeWidth={1} />
      <text x={x + 6} y={topY + 10} fontSize={6.5} fill="#94a3b8">
        {formatClockTime(rangeStart)} – {formatClockTime(rangeEnd)}
      </text>
      {rows.map((row, i) => {
        const rowY = topY + 14 + i * rowHeight;
        return (
          <g key={row.name}>
            <circle cx={x + 8} cy={rowY + 3} r={2.5} fill={row.color} />
            <text x={x + 14} y={rowY + 6} fontSize={7} fill="#cbd5e1">
              {truncateLegend(row.name, 12)}
            </text>
            <text x={x + width - 6} y={rowY + 6} textAnchor="end" fontSize={7} fontFamily="monospace" fill="#e2e8f0">
              {formatAxisValue(row.value)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default Chart;
