export type ShapeKind =
  | "pump"
  | "valve"
  | "tank"
  | "pipe"
  | "motor"
  | "sensor"
  | "lamp"
  | "gauge"
  | "breaker"
  | "switch"
  | "transformer"
  | "solarPanel"
  | "inverter"
  | "battery"
  | "grid"
  | "meter"
  | "image"
  | "text";

export interface ElementStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface DataBinding {
  tagId: string;
  tagName?: string | null;
}

export type RuleOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";

export interface AnimationRule {
  id: string;
  operator: RuleOperator;
  threshold: number;
  setStyle?: Partial<ElementStyle>;
  setState?: Record<string, unknown>;
  blink?: boolean;
}

/** Shape-specific state, e.g. { running: true } for a pump, { open: false } for a valve, { level: 0.6 } for a tank. */
export type ShapeState = Record<string, unknown>;

export interface MnemonicElement {
  id: string;
  type: ShapeKind;
  layerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  style: ElementStyle;
  state: ShapeState;
  label?: string;
  dataBinding?: DataBinding | null;
  animationRules?: AnimationRule[];
}
