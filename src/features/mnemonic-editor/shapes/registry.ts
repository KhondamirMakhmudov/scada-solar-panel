import type { ComponentType } from "react";
import type { ElementStyle, ShapeKind, ShapeState } from "../types";
import type { ShapeComponentProps } from "./base/shapeProps";
import Pump from "./Pump";
import Valve from "./Valve";
import Tank from "./Tank";
import Pipe from "./Pipe";
import Motor from "./Motor";
import Sensor from "./Sensor";
import StatusLamp from "./StatusLamp";
import Gauge from "./Gauge";
import Breaker from "./electrical/Breaker";
import Switch from "./electrical/Switch";
import Transformer from "./electrical/Transformer";
import SolarPanel from "./SolarPanel";
import Inverter from "./Inverter";
import Battery from "./Battery";
import Grid from "./Grid";
import Meter from "./Meter";
import ImageElement from "./ImageElement";
import TextLabel from "./TextLabel";
import Building from "./Building";
import Freehand from "./Freehand";
import BasicShape from "./BasicShape";
import Chart from "./Chart";

export interface ShapeDefinition {
  kind: ShapeKind;
  label: string;
  Component: ComponentType<ShapeComponentProps>;
  defaultSize: { width: number; height: number };
  defaultStyle: ElementStyle;
  defaultState: ShapeState;
}

const BASE_STYLE: ElementStyle = {
  fill: "#1d4ed8",
  stroke: "#93c5fd",
  strokeWidth: 2,
  opacity: 1,
};

/** All 11 generic ShapeKinds from the spec, plus 5 solar-domain kinds (solarPanel/inverter/battery/grid/meter) for PV system screens. */
export const SHAPE_REGISTRY: Partial<Record<ShapeKind, ShapeDefinition>> = {
  pump: {
    kind: "pump",
    label: "Насос",
    Component: Pump,
    defaultSize: { width: 70, height: 70 },
    defaultStyle: { ...BASE_STYLE, fill: "#1e3a8a", stroke: "#60a5fa" },
    defaultState: { running: true },
  },
  valve: {
    kind: "valve",
    label: "Клапан",
    Component: Valve,
    defaultSize: { width: 60, height: 40 },
    defaultStyle: { ...BASE_STYLE, fill: "#134e4a", stroke: "#2dd4bf" },
    defaultState: { open: true },
  },
  tank: {
    kind: "tank",
    label: "Резервуар",
    Component: Tank,
    defaultSize: { width: 90, height: 120 },
    defaultStyle: { ...BASE_STYLE, fill: "#0369a1", stroke: "#7dd3fc" },
    defaultState: { level: 0.6 },
  },
  pipe: {
    kind: "pipe",
    label: "Труба",
    Component: Pipe,
    defaultSize: { width: 120, height: 20 },
    defaultStyle: { ...BASE_STYLE, fill: "none", stroke: "#94a3b8" },
    defaultState: { variant: "straight", flowing: false },
  },
  motor: {
    kind: "motor",
    label: "Электродвигатель",
    Component: Motor,
    defaultSize: { width: 64, height: 64 },
    defaultStyle: { ...BASE_STYLE, fill: "#312e81", stroke: "#a5b4fc" },
    defaultState: { running: true },
  },
  sensor: {
    kind: "sensor",
    label: "Датчик",
    Component: Sensor,
    defaultSize: { width: 44, height: 44 },
    defaultStyle: { ...BASE_STYLE, fill: "#1e293b", stroke: "#38bdf8" },
    defaultState: { sensorType: "temperature" },
  },
  lamp: {
    kind: "lamp",
    label: "Лампа/светофор",
    Component: StatusLamp,
    defaultSize: { width: 28, height: 28 },
    defaultStyle: { ...BASE_STYLE, fill: "#4ade80", stroke: "#166534" },
    defaultState: { color: "green", blinking: false },
  },
  gauge: {
    kind: "gauge",
    label: "Индикатор (шкала)",
    Component: Gauge,
    defaultSize: { width: 90, height: 80 },
    defaultStyle: { ...BASE_STYLE, fill: "#f59e0b", stroke: "#94a3b8" },
    defaultState: { value: 40, min: 0, max: 100 },
  },
  breaker: {
    kind: "breaker",
    label: "Выключатель (авт.)",
    Component: Breaker,
    defaultSize: { width: 60, height: 40 },
    defaultStyle: { ...BASE_STYLE, fill: "#334155", stroke: "#cbd5e1" },
    defaultState: { closed: true },
  },
  switch: {
    kind: "switch",
    label: "Переключатель",
    Component: Switch,
    defaultSize: { width: 60, height: 40 },
    defaultStyle: { ...BASE_STYLE, fill: "#334155", stroke: "#cbd5e1" },
    defaultState: { on: true },
  },
  transformer: {
    kind: "transformer",
    label: "Трансформатор",
    Component: Transformer,
    defaultSize: { width: 80, height: 40 },
    defaultStyle: { ...BASE_STYLE, fill: "#334155", stroke: "#cbd5e1" },
    defaultState: { energized: true },
  },
  solarPanel: {
    kind: "solarPanel",
    label: "Солнечная панель",
    Component: SolarPanel,
    defaultSize: { width: 90, height: 60 },
    defaultStyle: { ...BASE_STYLE, fill: "#1e3a8a", stroke: "#60a5fa" },
    defaultState: { generating: true },
  },
  inverter: {
    kind: "inverter",
    label: "Инвертор",
    Component: Inverter,
    defaultSize: { width: 80, height: 56 },
    defaultStyle: { ...BASE_STYLE, fill: "#334155", stroke: "#cbd5e1" },
    defaultState: { status: "running" },
  },
  battery: {
    kind: "battery",
    label: "Аккумулятор",
    Component: Battery,
    defaultSize: { width: 60, height: 100 },
    defaultStyle: { ...BASE_STYLE, fill: "#4ade80", stroke: "#cbd5e1" },
    defaultState: { charge: 0.6, charging: false },
  },
  grid: {
    kind: "grid",
    label: "Сеть (ЛЭП)",
    Component: Grid,
    defaultSize: { width: 60, height: 70 },
    defaultStyle: { ...BASE_STYLE, fill: "none", stroke: "#94a3b8" },
    defaultState: { connected: true },
  },
  meter: {
    kind: "meter",
    label: "Счётчик (кВт·ч)",
    Component: Meter,
    defaultSize: { width: 48, height: 48 },
    defaultStyle: { ...BASE_STYLE, fill: "#1e293b", stroke: "#fbbf24" },
    defaultState: {},
  },
  image: {
    kind: "image",
    label: "Изображение",
    Component: ImageElement,
    defaultSize: { width: 160, height: 120 },
    defaultStyle: { fill: "none", stroke: "#475569", strokeWidth: 1, opacity: 1 },
    defaultState: { src: "" },
  },
  text: {
    kind: "text",
    label: "Текст",
    Component: TextLabel,
    defaultSize: { width: 160, height: 30 },
    defaultStyle: { fill: "none", stroke: "#e5e2e1", strokeWidth: 0, opacity: 1 },
    defaultState: { text: "Текст", fontSize: 16 },
  },
  building: {
    kind: "building",
    label: "Здание",
    Component: Building,
    defaultSize: { width: 150, height: 100 },
    defaultStyle: { ...BASE_STYLE, fill: "#1e293b", stroke: "#94a3b8" },
    defaultState: {},
  },
  freehand: {
    kind: "freehand",
    label: "Рисунок",
    Component: Freehand,
    defaultSize: { width: 100, height: 100 },
    defaultStyle: { fill: "none", stroke: "#38bdf8", strokeWidth: 2.5, opacity: 1 },
    defaultState: { points: [] },
  },
  basicShape: {
    kind: "basicShape",
    label: "Фигура",
    Component: BasicShape,
    defaultSize: { width: 100, height: 80 },
    defaultStyle: { fill: "none", stroke: "#38bdf8", strokeWidth: 2, opacity: 1 },
    defaultState: { variant: "rectangle" },
  },
  chart: {
    kind: "chart",
    label: "График (тренд)",
    Component: Chart,
    defaultSize: { width: 320, height: 240 },
    defaultStyle: { fill: "#0c1118", stroke: "#334155", strokeWidth: 1, opacity: 1 },
    defaultState: { range: "1h" },
  },
};

// «Рисунок» создаётся инструментом «Кисть», «Фигура» — из сетки «Фигуры»
// в палитре; кнопками списка оборудования они не добавляются.
export const AVAILABLE_SHAPE_KINDS = (
  Object.keys(SHAPE_REGISTRY) as ShapeKind[]
).filter((kind) => kind !== "freehand" && kind !== "basicShape");
