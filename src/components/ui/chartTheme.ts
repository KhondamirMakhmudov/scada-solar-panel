/**
 * Общее оформление графиков recharts.
 *
 * До этого каждый график задавал свои цвета осей и сетки инлайном, и на
 * соседних экранах отличались и толщина сетки, и цвет подписей. Здесь они
 * заданы один раз и разложены по объектам, которые расходятся спредом в
 * пропсы компонентов recharts.
 */

/** Палитра серий. Тона подобраны различимыми при дейтеранопии и упорядочены так, чтобы соседние серии не сливались. */
export const SERIES_COLORS = [
  "#38bdf8",
  "#4ade80",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#f87171",
  "#2dd4bf",
  "#facc15",
];

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export const AXIS_PROPS = {
  stroke: "#475569",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "#242424",
  vertical: false,
} as const;

export const TOOLTIP_PROPS = {
  contentStyle: {
    background: "#131313",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    fontSize: 12,
    padding: "8px 10px",
  },
  labelStyle: { color: "#6b7280", fontSize: 11, marginBottom: 4 },
  itemStyle: { padding: 0 },
  // Курсор — тонкая линия вместо заливки по умолчанию: на плотных
  // многосерийных графиках подсветка целого столбца перекрывает сами данные
  cursor: { stroke: "#475569", strokeWidth: 1 },
} as const;

/** Отступы графика: слева минимальный, потому что подписи оси Y рисуются внутри области. */
export const CHART_MARGIN = { top: 8, right: 12, left: -12, bottom: 0 } as const;
