import type { MnemonicElement, ShapeKind } from "../types";
import type { TagValue } from "../store/runtimeStore";

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
 * LiveValueLabel regardless.
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
