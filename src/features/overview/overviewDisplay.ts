import { STATUS_COLOR, STATUS_LABEL, type SystemStatus } from "@/constants/statusPalette";
import type { FlatOverviewDevice, OverviewDeviceStatus, OverviewGroupStatus } from "./overviewStationsTypes";

/**
 * Maps the API's own status vocabulary onto the app's existing fixed status
 * palette (ok/warn/alarm/idle — see constants/statusPalette.ts) instead of
 * inventing a second color set. `unknown` deliberately does NOT map to
 * alarm: main_page.md allows either "red or a dash" for a device/station
 * that has simply never reported (e.g. mubarek_tpp with no poller at all),
 * and painting an entire never-configured station alarm-red reads as "this
 * broke" when nothing did — idle (grey) plus its own label communicates
 * "no data" without crying wolf.
 */
export function deviceStatusToSystemStatus(status: OverviewDeviceStatus): SystemStatus {
  switch (status) {
    case "online":
      return "ok";
    case "idle":
      return "idle";
    case "error":
      return "warn";
    case "offline":
      return "alarm";
    case "disabled":
      return "idle";
    case "unknown":
    default:
      return "idle";
  }
}

export function groupStatusToSystemStatus(status: OverviewGroupStatus): SystemStatus {
  switch (status) {
    case "online":
      return "ok";
    case "degraded":
      return "warn";
    case "offline":
      return "alarm";
    case "disabled":
      return "idle";
    case "unknown":
    default:
      return "idle";
  }
}

export const DEVICE_STATUS_LABELS: Record<OverviewDeviceStatus, string> = {
  online: "В сети",
  idle: "Простой",
  error: "Ошибка",
  offline: "Офлайн",
  unknown: "Нет данных",
  disabled: "Отключено",
};

/** Hover text for the device-status legend — what each status actually means, per the ops status table. */
export const DEVICE_STATUS_DESCRIPTIONS: Record<OverviewDeviceStatus, string> = {
  online: "Данные идут, инвертор выдаёт мощность",
  idle: "Связь есть, но мощность 0: инвертор стоит или ночь. Сам по себе это не авария",
  error: "Данные идут, но тег вернул ошибку чтения",
  offline: "Связи нет: данные не приходили дольше порога (120 с), и канал связи мёртв",
  unknown: "От устройства ни разу не пришло ни одного значения",
  disabled: "Выключено в конфиге",
};

export const GROUP_STATUS_LABELS: Record<OverviewGroupStatus, string> = {
  online: "В сети",
  degraded: "Частично",
  offline: "Офлайн",
  disabled: "Отключено",
  unknown: "Нет данных",
};

/** Fixed left-to-right order for the device-count stacked bar — matches the doc's own status table order, online first (the "good" end). */
export const DEVICE_STATUS_ORDER: OverviewDeviceStatus[] = ["online", "idle", "error", "offline", "unknown", "disabled"];

export { STATUS_COLOR, STATUS_LABEL };

/**
 * 412870.5 W -> "412,9 кВт", 1.2e6 W -> "1 200,0 кВт", 50 W -> "0,1 кВт".
 *
 * Единица всегда одна — киловатты. Раньше формат переключался сам: ватты до
 * 1 кВт, киловатты до мегаватта, дальше мегаватты — и соседние плитки сводки
 * оказывались в разных единицах, а величины в них становились несравнимыми с
 * одного взгляда. Хуже того, единица у одной и той же плитки менялась на
 * ходу при пересечении порога.
 */
export function formatPower(watts: number): string {
  if (!Number.isFinite(watts)) return "—";
  return `${(watts / 1000).toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} кВт`;
}

/**
 * 5218.4 kWh -> "5 218 кВт·ч", 19472301.2 -> "19 472 301 кВт·ч".
 *
 * Единица всегда одна — киловатт-часы, по той же причине, что и у мощности
 * выше: «Выработка сегодня» и «Выработка всего» стоят рядом, и если вторая
 * переключается в ГВт·ч, сравнить их глазом уже нельзя.
 */
export function formatEnergy(kwh: number): string {
  if (!Number.isFinite(kwh)) return "—";
  return `${Math.round(kwh).toLocaleString("ru-RU")} кВт·ч`;
}

/** ISO timestamp -> "3 с назад" / "12 мин назад" / "2 ч назад" / "5 дн назад", relative to `nowIso` (pass the response's own `generatedAt`, not the client clock — station clocks are NTP-synced to each other but not necessarily to the browser). */
export function formatRelativeToNow(iso: string | null, nowIso: string): string {
  if (!iso) return "нет данных";
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (!Number.isFinite(then) || !Number.isFinite(now)) return "—";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds} с назад`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} дн назад`;
}

/**
 * One-line tooltip for a shape's status dot when its bound tag resolves to
 * a device the overview endpoint tracks (see
 * mnemonic-editor/hooks/useOverviewStatusForTag) — "why is this red", not
 * just "this is red": the fault text and how stale the reading is, which a
 * bare colored dot can't say on its own.
 */
export function overviewDeviceTooltip(device: FlatOverviewDevice, generatedAt: string): string {
  const label = device.statusLabel ?? DEVICE_STATUS_LABELS[device.status];
  const parts = [`${device.name} — ${label}`];
  if (device.status === "offline" || device.status === "unknown") {
    parts.push(formatRelativeToNow(device.lastSeen, generatedAt));
  }
  if (device.errorMessage) parts.push(device.errorMessage);
  return parts.join(" · ");
}

/** "fergana_tpc" -> "Fergana TPC" — driverId is a machine slug, not something to print verbatim in a card title. */
export function humanizeDriverId(driverId: string): string {
  return driverId
    .split("_")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}
