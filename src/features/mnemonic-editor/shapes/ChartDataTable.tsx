import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { ROW_COLORS, formatClockTime, formatValue } from "../lib/chartFormat";
import type { TrendSeriesPoint } from "../hooks/useTagTrend";

interface ChartDataTableProps {
  /** Shape's own width — the table always spans it, matching the sparkline view above. */
  width: number;
  /** Y offset where the table starts (below the chart's header bar) and how tall it gets, both in the shape's local coordinate space. */
  top: number;
  height: number;
  tagNames: string[];
  series: TrendSeriesPoint[];
  isLoading: boolean;
  /** Минимальная ширина колонки тега. Если колонки в неё не помещаются, таблица прокручивается по горизонтали, а колонка времени остаётся на месте. */
  minColumnWidth?: number;
}

const TIME_COL_WIDTH = 74;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

// Псевдоклассы (hover, скроллбар) не выразить inline-стилями, поэтому
// небольшой scoped-блок; классы с префиксом cdt- не пересекаются с Tailwind.
const TABLE_CSS = `
.cdt-scroll{scrollbar-width:thin;scrollbar-color:#2a3648 transparent}
.cdt-scroll::-webkit-scrollbar{width:6px;height:6px}
.cdt-scroll::-webkit-scrollbar-thumb{background:#2a3648;border-radius:3px}
.cdt-scroll::-webkit-scrollbar-thumb:hover{background:#3b4a63}
.cdt-scroll::-webkit-scrollbar-track{background:transparent}
.cdt-row td{transition:background-color .12s}
.cdt-row:nth-child(even) td{background:rgba(148,163,184,.035)}
.cdt-row:hover td{background:rgba(56,189,248,.09)}
.cdt-row.cdt-latest td{background:rgba(56,189,248,.07)}
`;

/**
 * Exact-value counterpart to Chart's sparklines — a scrollable, sticky-header
 * table (time + one column per bound tag), newest reading first. Lives in a
 * `<foreignObject>` since a real HTML `<table>` handles variable row counts,
 * scrolling, and text layout far better than hand-drawn SVG rows would.
 * Shared by the Chart's "ТАБЛИЦА" mode and the standalone DataTable shape.
 *
 * Visual language: quiet uppercase column headers with a colour dot matching
 * the chart series, zebra rows with a hover highlight, monospace tabular
 * numbers, and the newest reading marked with an accent bar — so the eye
 * lands on the current value first.
 */
const ChartDataTable = ({
  width,
  top,
  height,
  tagNames,
  series,
  isLoading,
  minColumnWidth = 0,
}: ChartDataTableProps) => {
  const rows = [...series].reverse();
  const naturalWidth = TIME_COL_WIDTH + tagNames.length * minColumnWidth;
  const needsHScroll = minColumnWidth > 0 && naturalWidth > width;
  // Колонка времени «липнет» слева только при горизонтальной прокрутке; ей
  // нужен непрозрачный фон, иначе значения просвечивают сквозь неё
  const stickyTime = needsHScroll
    ? { position: "sticky" as const, left: 0, zIndex: 2, background: "#0f1620" }
    : {};

  return (
    <foreignObject x={0} y={top} width={width} height={Math.max(0, height)}>
      <style>{TABLE_CSS}</style>
      <div
        className="cdt-scroll"
        style={{
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: needsHScroll ? "auto" : "hidden",
          fontFamily: SANS,
          fontSize: 11.5,
          color: "#e2e8f0",
          boxSizing: "border-box",
        }}
        // Table scroll shouldn't also zoom the editor/runtime canvas
        // underneath — the outer canvas listens for wheel-to-zoom.
        onWheel={(event) => event.stopPropagation()}
      >
        <table
          style={{
            width: needsHScroll ? naturalWidth : "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: TIME_COL_WIDTH }} />
            {tagNames.map((name) => (
              <col key={name} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: needsHScroll ? 3 : 1,
                  ...(needsHScroll ? { left: 0 } : {}),
                  textAlign: "left",
                  padding: "6px 8px 6px 12px",
                  color: "#64748b",
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "#0f1620",
                  borderBottom: "1px solid #223047",
                  whiteSpace: "nowrap",
                }}
              >
                Время
              </th>
              {tagNames.map((name, i) => {
                const label = formatTagLabelShort(name);
                return (
                  <th
                    key={name}
                    title={label}
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      textAlign: "right",
                      padding: "6px 12px 6px 8px",
                      color: "#94a3b8",
                      fontSize: 9.5,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: "#0f1620",
                      borderBottom: "1px solid #223047",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: ROW_COLORS[i % ROW_COLORS.length],
                        marginRight: 6,
                        verticalAlign: "middle",
                      }}
                    />
                    <span style={{ verticalAlign: "middle" }}>{label}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={tagNames.length + 1}
                  style={{ padding: "18px 12px", textAlign: "center", color: "#475569", fontSize: 11 }}
                >
                  {isLoading ? "Загрузка…" : "Нет данных"}
                </td>
              </tr>
            ) : (
              rows.map((point, index) => {
                const isLatest = index === 0;
                return (
                  <tr key={point.ms} className={isLatest ? "cdt-row cdt-latest" : "cdt-row"}>
                    <td
                      style={{
                        padding: "5px 8px 5px 12px",
                        fontFamily: MONO,
                        fontSize: 11,
                        color: isLatest ? "#7dd3fc" : "#64748b",
                        whiteSpace: "nowrap",
                        borderLeft: `2px solid ${isLatest ? "#38bdf8" : "transparent"}`,
                        borderBottom: "1px solid rgba(148,163,184,.07)",
                        ...stickyTime,
                      }}
                    >
                      {formatClockTime(point.ms)}
                    </td>
                    {tagNames.map((name) => (
                      <td
                        key={name}
                        style={{
                          padding: "5px 12px 5px 8px",
                          textAlign: "right",
                          fontFamily: MONO,
                          fontSize: 12,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: isLatest ? 700 : 500,
                          color: isLatest ? "#f8fafc" : "#cbd5e1",
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid rgba(148,163,184,.07)",
                        }}
                      >
                        {formatValue(point[name])}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </foreignObject>
  );
};

export default ChartDataTable;
