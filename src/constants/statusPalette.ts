/**
 * Семантика состояний оборудования, единая для всего проекта.
 *
 * Те же значения объявлены CSS-переменными в src/styles/globals.css
 * (--color-status-*); этот модуль нужен там, где цвет задаётся из JS —
 * инлайновые стили SVG на мнемосхемах, конфигурация графиков, MUI `sx`.
 * При правке цвета меняйте оба места.
 *
 * Синий (--color-primary) закреплён за состояниями интерфейса — выделение,
 * активный пункт меню, фокус — и не входит в эту палитру намеренно.
 */
export type SystemStatus = "ok" | "warn" | "alarm" | "idle";

export const STATUS_COLOR: Record<SystemStatus, string> = {
  ok: "#4ade80",
  warn: "#fbbf24",
  alarm: "#f87171",
  idle: "#94a3b8",
};

/** Классы Tailwind для текста — чтобы не плодить произвольные `text-green-400`/`text-emerald-300` по страницам. */
export const STATUS_TEXT_CLASS: Record<SystemStatus, string> = {
  ok: "text-[#4ade80]",
  warn: "text-[#fbbf24]",
  alarm: "text-[#f87171]",
  idle: "text-[#94a3b8]",
};

export const STATUS_LABEL: Record<SystemStatus, string> = {
  ok: "Норма",
  warn: "Внимание",
  alarm: "Авария",
  idle: "Неактивно",
};

/**
 * Состояние группы объектов по числу работающих из общего количества.
 * Используется карточками сводки и лентой состояния в шапке, чтобы
 * «5 из 5» и «4 из 5» везде окрашивались по одному правилу.
 */
export function deriveGroupStatus(active: number, total: number): SystemStatus {
  if (total === 0) return "idle";
  if (active === total) return "ok";
  if (active === 0) return "alarm";
  return "warn";
}
