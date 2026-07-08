import type { MnemonicElement } from "../types";
import { estimatePanelSize, panelTopOffset } from "./geometry";

export interface PanelSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_PUSH_ATTEMPTS = 40;
const PUSH_STEP = 8;

function rectsOverlap(a: PanelSlot, b: PanelSlot): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Deterministic, non-live layout for every element's data panel: a
 * fixed-size (see geometry.estimatePanelSize — no live tag values involved,
 * so this is stable across ticks) rect centered under its node, pushed
 * straight down in small steps if it collides with another panel or an
 * unrelated node's own bounding box. Chart elements are excluded — they show
 * their own in-box legend instead (see shapes/Chart.tsx), no floating panel.
 *
 * This is a heuristic, not a constraint solver: in a very dense cluster a
 * panel can exhaust its push budget and settle with residual overlap (logged
 * via console.warn in dev) rather than searching sideways/upward too.
 */
export function computePanelSlots(elements: MnemonicElement[]): Map<string, PanelSlot> {
  const slots = new Map<string, PanelSlot>();
  const placedPanelRects: PanelSlot[] = [];

  const nodeRectById = new Map(
    elements.map((el) => [el.id, { x: el.x, y: el.y, width: el.width, height: el.height }]),
  );

  const candidates = elements
    .filter((el) => el.type !== "chart")
    .map((el) => ({
      el,
      bindingCount: (el.dataBinding?.tagId ? 1 : 0) + (el.extraBindings?.length ?? 0),
    }))
    .filter((c) => c.bindingCount > 0)
    .sort((a, b) => a.el.y - b.el.y || a.el.x - b.el.x);

  for (const { el, bindingCount } of candidates) {
    const labelFontSize = el.style?.labelFontSize ?? 11;
    const { width, height } = estimatePanelSize(bindingCount, el.width, labelFontSize);
    const x = el.x + el.width / 2 - width / 2;
    let y = el.y + el.height + panelTopOffset(labelFontSize);

    const obstacles: PanelSlot[] = [
      ...placedPanelRects,
      ...[...nodeRectById.entries()]
        .filter(([id]) => id !== el.id)
        .map(([, rect]) => rect),
    ];

    let attempts = 0;
    for (; attempts < MAX_PUSH_ATTEMPTS; attempts += 1) {
      const candidateRect: PanelSlot = { x, y, width, height };
      const collides = obstacles.some((rect) => rectsOverlap(candidateRect, rect));
      if (!collides) break;
      y += PUSH_STEP;
    }

    if (attempts >= MAX_PUSH_ATTEMPTS && process.env.NODE_ENV !== "production") {
      console.warn(
        `[mnemonic] panel for element ${el.id} could not fully clear overlaps after ${MAX_PUSH_ATTEMPTS} attempts`,
      );
    }

    const finalRect: PanelSlot = { x, y, width, height };
    placedPanelRects.push(finalRect);
    slots.set(el.id, finalRect);
  }

  return slots;
}
