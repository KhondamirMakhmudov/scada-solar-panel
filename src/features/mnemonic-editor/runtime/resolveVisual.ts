import type { MnemonicElement, ShapeKind } from "../types";
import type { ConnectionStatus, TagValue } from "../store/runtimeStore";

function toBoolean(value: TagValue["value"]): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
}

function toNumber(value: TagValue["value"]): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toLevel(value: TagValue["value"]): number {
  const num = toNumber(value);
  const normalized = num > 1 ? num / 100 : num;
  return Math.min(1, Math.max(0, normalized));
}

const BOOLEAN_STATE_KEY: Partial<Record<ShapeKind, string>> = {
  pump: "running",
  valve: "open",
  motor: "running",
  breaker: "closed",
  switch: "on",
  pipe: "flowing",
  solarPanel: "generating",
  grid: "connected",
};

/**
 * Merges a live tag value into an element's shape-specific `state` for
 * kinds that have a natural live-driven property (pump/motor/solarPanel
 * running-generating, valve/breaker/switch/grid open-closed-on-connected,
 * pipe flowing, tank/battery fill level, gauge needle value, lamp color,
 * inverter running/standby) — this is the "dynamic behavior based on
 * value" from the data-binding spec, minus the full no-code threshold/color
 * rule builder (deferred). Kinds without a mapping (sensor, transformer,
 * meter) are returned unchanged; the raw value still shows via
 * PanelInstance regardless.
 */
export function applyLiveValueToElement(
  element: MnemonicElement,
  live: TagValue | undefined,
): MnemonicElement {
  if (!live || live.isError) return element;

  if (element.type === "tank" || element.type === "battery") {
    return { ...element, state: { ...element.state, [element.type === "tank" ? "level" : "charge"]: toLevel(live.value) } };
  }

  if (element.type === "gauge") {
    return { ...element, state: { ...element.state, value: toNumber(live.value) } };
  }

  if (element.type === "lamp") {
    return {
      ...element,
      state: { ...element.state, color: toBoolean(live.value) ? "green" : "red" },
    };
  }

  if (element.type === "inverter") {
    return {
      ...element,
      state: { ...element.state, status: toBoolean(live.value) ? "running" : "standby" },
    };
  }

  const key = BOOLEAN_STATE_KEY[element.type];
  if (key) {
    return { ...element, state: { ...element.state, [key]: toBoolean(live.value) } };
  }

  return element;
}

export type LiveStatus = "ok" | "fault" | "stopped" | "unknown";

export const LIVE_STATUS_COLORS: Record<LiveStatus, string> = {
  ok: "#4ade80",
  fault: "#f87171",
  stopped: "#94a3b8",
  unknown: "#94a3b8",
};

/**
 * Kinds where a standardized status dot doesn't add anything: lamp already
 * *is* a status light, gauge already shows a live numeric readout, and the
 * rest have no on/off notion at all (text/image/building/freehand/basicShape/
 * chart).
 */
const STATUS_DOT_EXCLUDED_KINDS = new Set<ShapeKind>([
  "text",
  "image",
  "building",
  "freehand",
  "basicShape",
  "chart",
  "lamp",
  "gauge",
]);

/**
 * Standardized WinCC-style status dot color for a bound element — separate
 * from applyLiveValueToElement's per-kind state merge (which drives shape
 * geometry/animation), this only decides the small header LED. Unbound
 * elements return null (no dot) so a screen mid-design doesn't get cluttered
 * with meaningless indicators.
 */
export function deriveLiveStatus(
  element: MnemonicElement,
  live: TagValue | undefined,
  wsStatus: ConnectionStatus,
): LiveStatus | null {
  if (STATUS_DOT_EXCLUDED_KINDS.has(element.type)) return null;
  if (!element.dataBinding?.tagId) return null;

  if (wsStatus !== "online") return "stopped";
  if (!live) return "unknown";
  if (live.isError) return "fault";

  if (element.type === "inverter") {
    return toBoolean(live.value) ? "ok" : "stopped";
  }

  const key = BOOLEAN_STATE_KEY[element.type];
  if (key) {
    return toBoolean(live.value) ? "ok" : "stopped";
  }

  return "ok";
}
