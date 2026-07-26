import { SHAPE_REGISTRY } from "../shapes/registry";
import type { MnemonicElement, ShapeKind } from "../types";
import { DEFAULT_LAYER_ID } from "../document/defaults";
import { generateId } from "./idGen";

/**
 * Собирает новый элемент из значений по умолчанию его вида. Общая точка для
 * добавления кликом по палитре и перетаскиванием на холст — иначе два пути
 * добавления незаметно разъезжаются по умолчанию (стиль, слой, состояние).
 */
export function createShapeElement(
  kind: ShapeKind,
  position: { x: number; y: number },
  zIndex: number,
): MnemonicElement | null {
  const definition = SHAPE_REGISTRY[kind];
  if (!definition) return null;

  return {
    id: generateId(kind),
    type: kind,
    layerId: DEFAULT_LAYER_ID,
    x: position.x,
    y: position.y,
    width: definition.defaultSize.width,
    height: definition.defaultSize.height,
    rotation: 0,
    zIndex,
    style: { ...definition.defaultStyle },
    state: { ...definition.defaultState },
    label: definition.label,
  };
}
