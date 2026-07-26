/**
 * Общий набор элементов интерфейса разделов дашборда.
 *
 * Импортируйте отсюда, а не из файлов напрямую: единая точка входа не даёт
 * разделам обрасти собственными вариантами панели, плитки и таблицы, из-за
 * которых оформление и разъезжалось.
 */
export { default as Panel } from "./Panel";
export { default as PageHeader } from "./PageHeader";
export { default as StatTile } from "./StatTile";
export { default as SegmentedControl } from "./SegmentedControl";
export { default as Chip } from "./Chip";
export { default as EmptyState } from "./EmptyState";
export { default as StatusDot } from "./StatusDot";
export { default as DataTable } from "./DataTable";
export type { DataTableColumn } from "./DataTable";
export {
  SERIES_COLORS,
  seriesColor,
  AXIS_PROPS,
  GRID_PROPS,
  TOOLTIP_PROPS,
  CHART_MARGIN,
} from "./chartTheme";
