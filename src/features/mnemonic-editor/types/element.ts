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
  | "text"
  | "building"
  | "freehand"
  | "basicShape"
  | "chart"
  | "dataTable";

export interface ElementStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  /** Размер шрифта подписи под фигурой (и живого значения тега). По умолчанию 11. */
  labelFontSize?: number;
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

/**
 * How this element's live tag values are shown on the canvas:
 * "full" (default) — the table under the shape, one row per bound tag;
 * "compact" — a single small badge overlapping the shape's corner, primary
 * tag only, for dense screens where a full panel per node is too much;
 * "hidden" — nothing, the shape's own color/state is the only live cue.
 */
export type PanelDisplay = "full" | "compact" | "hidden";

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
  /** Основной тег: управляет состоянием/анимацией фигуры и показывается первой строкой */
  dataBinding?: DataBinding | null;
  /** Дополнительные теги: каждый выводится отдельной строкой живого значения под фигурой */
  extraBindings?: DataBinding[] | null;
  /** См. PanelDisplay. Не задано = "full" (существующее поведение, обратная совместимость со старыми экранами). */
  panelDisplay?: PanelDisplay;
  animationRules?: AnimationRule[];
  /** Переход по клику в режиме просмотра: id экрана, который откроется */
  navigateToScreenId?: string | null;
}
