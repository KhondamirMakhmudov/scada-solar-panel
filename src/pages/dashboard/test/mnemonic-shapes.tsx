import type { MnemonicElement } from "@/features/mnemonic-editor/types";
import { SHAPE_REGISTRY } from "@/features/mnemonic-editor/shapes/registry";
import ShapeRenderer from "@/features/mnemonic-editor/shapes/ShapeRenderer";

const makeElement = (overrides: Partial<MnemonicElement>): MnemonicElement => {
  const definition = SHAPE_REGISTRY[overrides.type ?? "pump"];
  return {
    id: overrides.id ?? "preview",
    type: overrides.type ?? "pump",
    layerId: "layer-equipment",
    x: 0,
    y: 0,
    width: definition?.defaultSize.width ?? 80,
    height: definition?.defaultSize.height ?? 80,
    rotation: 0,
    zIndex: 0,
    style: definition?.defaultStyle ?? {
      fill: "#1d4ed8",
      stroke: "#93c5fd",
      strokeWidth: 2,
      opacity: 1,
    },
    state: definition?.defaultState ?? {},
    ...overrides,
  };
};

const PREVIEW_ELEMENTS: { x: number; y: number; element: MnemonicElement }[] = [
  { x: 60, y: 60, element: makeElement({ id: "pump-running", type: "pump", label: "Насос (работает)", state: { running: true } }) },
  { x: 220, y: 60, element: makeElement({ id: "pump-stopped", type: "pump", label: "Насос (стоп)", state: { running: false } }) },

  { x: 60, y: 220, element: makeElement({ id: "valve-open", type: "valve", label: "Клапан открыт", state: { open: true } }) },
  { x: 220, y: 220, element: makeElement({ id: "valve-closed", type: "valve", label: "Клапан закрыт", state: { open: false } }) },

  { x: 400, y: 40, element: makeElement({ id: "tank-30", type: "tank", label: "Резервуар 30%", state: { level: 0.3 } }) },
  { x: 520, y: 40, element: makeElement({ id: "tank-100", type: "tank", label: "Резервуар 100%", state: { level: 1 } }) },

  { x: 400, y: 220, element: makeElement({ id: "pipe-straight", type: "pipe", width: 160, state: { variant: "straight", flowing: true } }) },
  { x: 400, y: 260, element: makeElement({ id: "pipe-angled", type: "pipe", width: 100, height: 80, state: { variant: "angled" } }) },
  { x: 400, y: 360, element: makeElement({ id: "pipe-tee", type: "pipe", width: 100, height: 60, state: { variant: "tee" } }) },

  { x: 700, y: 60, element: makeElement({ id: "motor-running", type: "motor", label: "Двигатель (работает)", state: { running: true } }) },
  { x: 820, y: 60, element: makeElement({ id: "motor-stopped", type: "motor", label: "Двигатель (стоп)", state: { running: false } }) },

  { x: 700, y: 220, element: makeElement({ id: "sensor-t", type: "sensor", label: "Датчик T", state: { sensorType: "temperature" } }) },
  { x: 780, y: 220, element: makeElement({ id: "sensor-p", type: "sensor", label: "Датчик P", state: { sensorType: "pressure" } }) },

  { x: 900, y: 60, element: makeElement({ id: "lamp-green", type: "lamp", label: "Норма", state: { color: "green", blinking: false } }) },
  { x: 940, y: 60, element: makeElement({ id: "lamp-red-blink", type: "lamp", label: "Авария", state: { color: "red", blinking: true } }) },

  { x: 900, y: 160, element: makeElement({ id: "gauge-40", type: "gauge", label: "Давление", state: { value: 40, min: 0, max: 100 } }) },

  { x: 60, y: 420, element: makeElement({ id: "breaker-closed", type: "breaker", label: "QF1 замкнут", state: { closed: true } }) },
  { x: 200, y: 420, element: makeElement({ id: "breaker-open", type: "breaker", label: "QF1 разомкнут", state: { closed: false } }) },

  { x: 340, y: 420, element: makeElement({ id: "switch-on", type: "switch", label: "SA1 вкл", state: { on: true } }) },
  { x: 480, y: 420, element: makeElement({ id: "switch-off", type: "switch", label: "SA1 выкл", state: { on: false } }) },

  { x: 620, y: 420, element: makeElement({ id: "transformer-1", type: "transformer", label: "T1", state: { energized: true } }) },

  { x: 60, y: 560, element: makeElement({ id: "solar-on", type: "solarPanel", label: "PV1 (генерирует)", state: { generating: true } }) },
  { x: 200, y: 560, element: makeElement({ id: "solar-off", type: "solarPanel", label: "PV1 (ночь)", state: { generating: false } }) },

  { x: 340, y: 550, element: makeElement({ id: "inverter-running", type: "inverter", label: "INV1 (работает)", state: { status: "running" } }) },
  { x: 460, y: 550, element: makeElement({ id: "inverter-fault", type: "inverter", label: "INV1 (авария)", state: { status: "fault" } }) },

  { x: 580, y: 540, element: makeElement({ id: "battery-70", type: "battery", label: "АКБ 70%", state: { charge: 0.7, charging: true } }) },
  { x: 660, y: 540, element: makeElement({ id: "battery-15", type: "battery", label: "АКБ 15%", state: { charge: 0.15, charging: false } }) },

  { x: 760, y: 550, element: makeElement({ id: "grid-connected", type: "grid", label: "Сеть подкл.", state: { connected: true } }) },
  { x: 840, y: 550, element: makeElement({ id: "grid-disconnected", type: "grid", label: "Сеть откл.", state: { connected: false } }) },

  { x: 940, y: 560, element: makeElement({ id: "meter-1", type: "meter", label: "PM1" }) },

  { x: 1020, y: 420, element: makeElement({ id: "unknown-kind", type: "unknown-preview" as never, label: "Не реализовано" }) },
];

export default function MnemonicShapesPreview() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] p-8 font-manrope">
      <h1 className="text-white text-lg mb-4">
        Предпросмотр библиотеки фигур (16 типов: 11 общих + 5 солнечных)
      </h1>
      <svg width={1200} height={680} className="bg-slate-950 border border-slate-800 rounded-lg">
        {PREVIEW_ELEMENTS.map(({ x, y, element }) => (
          <g key={element.id} transform={`translate(${x}, ${y})`}>
            <ShapeRenderer element={{ ...element, x: 0, y: 0 }} />
          </g>
        ))}
      </svg>
    </div>
  );
}
