import { useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { useTagTrend, TREND_RANGE_META, type TrendRange } from "../hooks/useTagTrend";
import { useDeviceNameForTag } from "../hooks/useDeviceNameForTag";
import type { DataBinding } from "../types";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";

const ROW_COLORS = ["#38bdf8", "#4ade80", "#f59e0b", "#f472b6"];

const HEADER_HEIGHT = 22; // device name only — each row names its own parameter
const ROW_HEADER_HEIGHT = 20; // "name ........ current value" line
const ROW_GAP = 8;
const LEFT_PADDING = 42; // room for larger min/max Y labels
const RIGHT_PADDING = 6;
const TIME_AXIS_HEIGHT = 16; // shown once, under the last row (shared X window)

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
}

function formatValue(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
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

interface RowDatum {
  name: string;
  color: string;
  pathD: string;
  minV: number;
  maxV: number;
  lastValue: number | undefined;
}

/**
 * Historical trend, drawn as plain SVG (the whole canvas is one <svg>, so no
 * chart library with its own DOM container applies here). Every bound tag
 * gets its own compact row — small multiples, each with its own scale — so
 * an operator glancing at (or a kiosk display showing) the whole screen sees
 * every parameter at once with no click/interaction required, and one
 * parameter's range never squashes another's onto an unreadable shared axis.
 * The header auto-composes the device name (via useDeviceNameForTag) so
 * it's unambiguous which node this trend belongs to.
 */
const Chart = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style } = element;
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
  const deviceName = useDeviceNameForTag(tags[0]?.tagId);

  const rowCount = Math.max(1, tagNames.length);
  const plotLeft = LEFT_PADDING;
  const plotWidth = Math.max(1, width - LEFT_PADDING - RIGHT_PADDING);
  const rowsAreaHeight = Math.max(rowCount * 30, height - HEADER_HEIGHT - TIME_AXIS_HEIGHT);
  const rowHeight = rowsAreaHeight / rowCount;
  const sparkHeight = Math.max(14, rowHeight - ROW_HEADER_HEIGHT - ROW_GAP);
  const xStep = plotWidth / Math.max(1, series.length - 1);

  const rows: RowDatum[] = useMemo(() => {
    return tagNames.map((name, i) => {
      if (series.length < 2) {
        return { name, color: ROW_COLORS[i % ROW_COLORS.length], pathD: "", minV: 0, maxV: 1, lastValue: undefined };
      }

      let min = Infinity;
      let max = -Infinity;
      let lastValue: number | undefined;
      series.forEach((point) => {
        const v = point[name];
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
          lastValue = v;
        }
      });

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return { name, color: ROW_COLORS[i % ROW_COLORS.length], pathD: "", minV: 0, maxV: 1, lastValue: undefined };
      }
      if (min === max) {
        min -= 1;
        max += 1;
      }

      const scaleY = (v: number) => sparkHeight - ((v - min) / (max - min)) * sparkHeight;
      let d = "";
      let started = false;
      series.forEach((point, idx) => {
        const v = point[name];
        if (typeof v !== "number") return;
        const px = idx * xStep;
        const py = scaleY(v);
        d += started ? ` L${px},${py}` : `M${px},${py}`;
        started = true;
      });

      return { name, color: ROW_COLORS[i % ROW_COLORS.length], pathD: d, minV: min, maxV: max, lastValue };
    });
  }, [series, tagNames, sparkHeight, xStep]);

  const boxFill = style.fill === "none" ? "#0c1118" : style.fill;
  const titleText = deviceName || "Тренд";

  // Hover crosshair + tooltip, scoped per row — converts the pointer's
  // screen position into that row's own local coordinate space via
  // getScreenCTM (works regardless of the canvas's pan/zoom or this shape's
  // own rotation).
  const [hover, setHover] = useState<{ row: number; idx: number } | null>(null);

  const handleRowPointerMove = (rowIndex: number) => (event: ReactPointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    const ctm = event.currentTarget.getScreenCTM();
    if (!svg || !ctm) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());
    const idx = Math.min(series.length - 1, Math.max(0, Math.round(local.x / xStep)));
    setHover({ row: rowIndex, idx });
  };

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

      {/* Header: device name only — each row below names its own parameter */}
      <rect x={0} y={0} width={width} height={HEADER_HEIGHT} fill="#0f172a" opacity={0.7} />
      <text x={10} y={16} textAnchor="start" fontSize={13} fontWeight={700} fill="#f1f5f9">
        <title>{titleText}</title>
        {truncate(titleText, Math.floor((width - 16) / 7))}
      </text>

      {tags.length === 0 ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={11} fill="#64748b">
          Нет привязки
        </text>
      ) : isLoading && rows.every((r) => !r.pathD) ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={11} fill="#64748b">
          Загрузка…
        </text>
      ) : (
        rows.map((row, i) => {
          const rowTop = HEADER_HEIGHT + i * rowHeight;
          const sparkTop = rowTop + ROW_HEADER_HEIGHT;
          const displayName = formatTagLabelShort(row.name);
          const isLastRow = i === rows.length - 1;
          const rowHover = hover?.row === i ? hover : null;
          const hoverPoint = rowHover ? series[rowHover.idx] : undefined;
          const hoverValue = hoverPoint ? hoverPoint[row.name] : undefined;

          return (
            <g key={row.name}>
              {/* Row header: colored dot + parameter name + current value */}
              <circle cx={plotLeft} cy={rowTop + 9} r={3.5} fill={row.color} />
              <text x={plotLeft + 9} y={rowTop + 13} fontSize={12} fill="#cbd5e1">
                {truncate(displayName, Math.floor((plotWidth - 90) / 6.5))}
              </text>
              <text
                x={plotLeft + plotWidth}
                y={rowTop + 14}
                textAnchor="end"
                fontSize={16}
                fontWeight={700}
                fontFamily="monospace"
                fill={row.color}
              >
                {formatValue(row.lastValue)}
              </text>

              {!row.pathD ? (
                <text x={plotLeft + plotWidth / 2} y={sparkTop + sparkHeight / 2 + 3} textAnchor="middle" fontSize={10} fill="#475569">
                  нет данных
                </text>
              ) : (
                <>
                  {/* Min/max reference labels for this row's own scale */}
                  <text x={plotLeft - 5} y={sparkTop + 8} textAnchor="end" fontSize={10} fill="#94a3b8">
                    {formatValue(row.maxV)}
                  </text>
                  <text x={plotLeft - 5} y={sparkTop + sparkHeight} textAnchor="end" fontSize={10} fill="#94a3b8">
                    {formatValue(row.minV)}
                  </text>
                  <line
                    x1={plotLeft}
                    x2={plotLeft + plotWidth}
                    y1={sparkTop + sparkHeight}
                    y2={sparkTop + sparkHeight}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />

                  <g transform={`translate(${plotLeft}, ${sparkTop})`}>
                    <path d={row.pathD} fill="none" stroke={row.color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

                    {rowHover && typeof hoverValue === "number" && (
                      <g pointerEvents="none">
                        <line
                          x1={rowHover.idx * xStep}
                          x2={rowHover.idx * xStep}
                          y1={0}
                          y2={sparkHeight}
                          stroke="#94a3b8"
                          strokeWidth={1}
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={rowHover.idx * xStep}
                          cy={sparkHeight - ((hoverValue - row.minV) / (row.maxV - row.minV)) * sparkHeight}
                          r={2.5}
                          fill={row.color}
                          stroke="#0c1118"
                          strokeWidth={1}
                        />
                      </g>
                    )}

                    {/* Invisible hit area for this row's hover */}
                    <rect
                      x={0}
                      y={0}
                      width={plotWidth}
                      height={sparkHeight}
                      fill="transparent"
                      onPointerMove={handleRowPointerMove(i)}
                      onPointerLeave={() => setHover((h) => (h?.row === i ? null : h))}
                    />
                  </g>

                  {rowHover && hoverPoint && typeof hoverValue === "number" && (
                    <ChartTooltip
                      anchorX={plotLeft + rowHover.idx * xStep}
                      topY={sparkTop}
                      boxWidth={width}
                      time={hoverPoint.ms}
                      rangeEnd={hoverPoint.ms + (TREND_RANGE_META[range]?.intervalMs ?? 0)}
                      color={row.color}
                      name={displayName}
                      value={hoverValue}
                    />
                  )}
                </>
              )}

              {/* Shared X-axis time labels, once, under the last row */}
              {isLastRow && row.pathD && (
                <>
                  <text x={plotLeft} y={sparkTop + sparkHeight + 13} textAnchor="start" fontSize={10} fill="#94a3b8">
                    {series[0] ? formatAxisTime(series[0].ms) : ""}
                  </text>
                  <text x={plotLeft + plotWidth} y={sparkTop + sparkHeight + 13} textAnchor="end" fontSize={10} fill="#94a3b8">
                    {series[series.length - 1] ? formatAxisTime(series[series.length - 1].ms) : ""}
                  </text>
                </>
              )}
            </g>
          );
        })
      )}
    </ParametrizedShape>
  );
};

interface ChartTooltipProps {
  anchorX: number;
  topY: number;
  boxWidth: number;
  time: number;
  rangeEnd: number;
  color: string;
  name: string;
  value: number;
}

/** Hover tooltip for one row: bucket time range + that parameter's name/value. Anchored just above the hovered row's sparkline so it never covers the trace it's describing. */
function ChartTooltip({ anchorX, topY, boxWidth, time, rangeEnd, color, name, value }: ChartTooltipProps) {
  const width = 152;
  const height = 40;
  const y = Math.max(2, topY - height - 4);
  const x = Math.min(Math.max(anchorX - width / 2, 2), boxWidth - width - 2);

  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={width} height={height} rx={4} fill="#0f172a" fillOpacity={0.97} stroke="#334155" strokeWidth={1} />
      <text x={x + 8} y={y + 14} fontSize={10} fill="#94a3b8">
        {formatClockTime(time)} – {formatClockTime(rangeEnd)}
      </text>
      <circle cx={x + 10} cy={y + 28} r={3.5} fill={color} />
      <text x={x + 17} y={y + 31} fontSize={11} fill="#cbd5e1">
        {truncate(name, 14)}
      </text>
      <text x={x + width - 8} y={y + 31} textAnchor="end" fontSize={12} fontWeight={700} fontFamily="monospace" fill="#e2e8f0">
        {formatValue(value)}
      </text>
    </g>
  );
}

export default Chart;
