import type { MnemonicElement } from "../types";

/** Point-in-rect against an element's bounding box (rotation ignored, same simplification used elsewhere). Iterates back-to-front (array order == stacking order) so an overlapping element on top wins. */
export function findElementAtPoint(
  elements: MnemonicElement[],
  point: { x: number; y: number },
  excludeId?: string,
): MnemonicElement | null {
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const el = elements[i];
    if (el.id === excludeId) continue;
    if (
      point.x >= el.x &&
      point.x <= el.x + el.width &&
      point.y >= el.y &&
      point.y <= el.y + el.height
    ) {
      return el;
    }
  }
  return null;
}
