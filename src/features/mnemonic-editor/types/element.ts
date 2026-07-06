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
  | "basicShape";

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
  animationRules?: AnimationRule[];
  /** Переход по клику в режиме просмотра: id экрана, который откроется */
  navigateToScreenId?: string | null;
}
