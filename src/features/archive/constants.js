export const ROW_COLORS = [
  "#38bdf8",
  "#4ade80",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#f87171",
  "#2dd4bf",
  "#facc15",
];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const RANGE_PRESETS = [
  { label: "1 час", value: "1h", windowMs: HOUR_MS },
  { label: "6 часов", value: "6h", windowMs: 6 * HOUR_MS },
  { label: "24 часа", value: "24h", windowMs: DAY_MS },
  { label: "7 дней", value: "7d", windowMs: 7 * DAY_MS },
  { label: "30 дней", value: "30d", windowMs: 30 * DAY_MS },
  { label: "90 дней", value: "90d", windowMs: 90 * DAY_MS },
  { label: "6 месяцев", value: "6m", windowMs: 182 * DAY_MS },
  { label: "1 год", value: "1y", windowMs: 365 * DAY_MS },
  { label: "Свой период", value: "custom", windowMs: null },
];

// Держим число бакетов в разумных пределах (лимит API — buckets*tags <= 50000)
export function pickInterval(spanMs) {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  if (spanMs <= 2 * HOUR) return "PT1M";
  if (spanMs <= 12 * HOUR) return "PT5M";
  if (spanMs <= 2 * DAY) return "PT15M";
  if (spanMs <= 14 * DAY) return "PT1H";
  if (spanMs <= 90 * DAY) return "PT6H";
  return "P1D";
}

export function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatAxisTime(ms, spanMs) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  if (spanMs > 2 * 24 * 60 * 60 * 1000) {
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  }
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatFullTime(ms) {
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

export function formatValue(v) {
  if (v === undefined || v === null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return v.toFixed(decimals);
}

/**
 * Same enum lookup the mnemonic screen uses for live values
 * (PanelInstance.tsx's `valueMap[String(live.value)]`) — a bucket's avg/
 * min/max is only meaningful as a status label when it lands exactly on a
 * whole code (e.g. constant "1" for a stretch of time); a genuinely
 * fractional average (mid-transition) has no single label, so it's left as
 * a plain number rather than guessed at via rounding.
 */
export function formatMaybeMapped(v, valueMap) {
  if (valueMap && Number.isFinite(v) && Number.isInteger(v)) {
    const label = valueMap[String(v)];
    if (label !== undefined) return label;
  }
  return formatValue(v);
}

/** Resolves a range preset (or custom datetime-local strings) to an ISO [timeFrom, timeTo) pair. */
export function resolveRange(range, customFrom, customTo) {
  if (range === "custom") {
    const from = customFrom ? new Date(customFrom) : null;
    const to = customTo ? new Date(customTo) : null;
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      return { timeFrom: null, timeTo: null };
    }
    return { timeFrom: from.toISOString(), timeTo: to.toISOString() };
  }
  const preset = RANGE_PRESETS.find((p) => p.value === range) || RANGE_PRESETS[2];
  const to = new Date();
  const from = new Date(to.getTime() - preset.windowMs);
  return { timeFrom: from.toISOString(), timeTo: to.toISOString() };
}
