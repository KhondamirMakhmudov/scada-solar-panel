import type { MnemonicDocument } from "../types";
import { generateId } from "../lib/idGen";

export const DEFAULT_GRID_SIZE = 20;

export const DEFAULT_CANVAS_SIZE = { width: 1920, height: 1080 };

export const DEFAULT_LAYER_ID = "layer-equipment";

export function createEmptyDocument(): MnemonicDocument {
  return {
    gridSize: DEFAULT_GRID_SIZE,
    canvasSize: { ...DEFAULT_CANVAS_SIZE },
    background: { color: "#0e0e0e" },
    layers: [
      {
        id: DEFAULT_LAYER_ID,
        name: "Оборудование",
        visible: true,
        locked: false,
        zIndex: 0,
      },
    ],
    elements: [],
    connections: [],
  };
}

export { generateId };
