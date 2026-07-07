import type { Viewport } from "../store/uiStore";
import type { ConnectionHandle } from "../types";
import type { MnemonicElement } from "../types";

export function clampZoom(zoom: number, min = 0.2, max = 3): number {
  return Math.min(max, Math.max(min, zoom));
}

/** Computes the pan offset needed so the document-space point currently under (screenX, screenY) stays fixed on screen after zooming to `nextZoom`. */
export function zoomAtPoint(
  viewport: Viewport,
  nextZoom: number,
  screenX: number,
  screenY: number,
): Viewport {
  const docX = (screenX - viewport.panX) / viewport.zoom;
  const docY = (screenY - viewport.panY) / viewport.zoom;
  return {
    zoom: nextZoom,
    panX: screenX - docX * nextZoom,
    panY: screenY - docY * nextZoom,
  };
}

/** Converts a client (screen) point to document-space coordinates, given the canvas container's bounding rect and current viewport transform. */
export function screenToDocumentPoint(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  viewport: Viewport,
): { x: number; y: number } {
  const screenX = clientX - containerRect.left;
  const screenY = clientY - containerRect.top;
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  };
}

/** Document-space point for one of an element's 4 connection anchors. Ignores rotation (matches the same simplification already used for the selection box and resize handles). */
export function getElementAnchorPoint(
  element: MnemonicElement,
  handle: ConnectionHandle,
): { x: number; y: number } {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  switch (handle) {
    case "left":
      return { x: element.x, y: cy };
    case "right":
      return { x: element.x + element.width, y: cy };
    case "top":
      return { x: cx, y: element.y };
    case "bottom":
      return { x: cx, y: element.y + element.height };
  }
}

/** Picks whichever side of `element` faces the given source point — used to auto-route a connection's target anchor without requiring the user to drop on an exact handle. */
export function nearestHandleFacing(
  element: MnemonicElement,
  fromPoint: { x: number; y: number },
): ConnectionHandle {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const dx = fromPoint.x - cx;
  const dy = fromPoint.y - cy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? "left" : "right";
  }
  return dy < 0 ? "top" : "bottom";
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CONTENT_PADDING = 60;
const LABEL_ALLOWANCE = 34; // room for the label/live-value text rendered below each shape
const MIN_VIEWBOX_SIZE = 320;

/**
 * Runtime mode has no pan/zoom controls, so it must frame the diagram
 * itself rather than the full declared canvas (default 1920x1080) — a
 * screen with a couple of shapes placed near the origin would otherwise
 * render tiny, surrounded by mostly empty canvas, once scaled to fit any
 * viewport. Falls back to the full canvas size for an empty screen.
 */
export function computeContentViewBox(
  elements: MnemonicElement[],
  canvasSize: { width: number; height: number },
): ViewBox {
  if (!elements.length) {
    return { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    // Панель показаний (LiveValueLabel) рисуется ПОД фигурой — по строке на
    // каждый привязанный тег. Учитываем её высоту и выступ по ширине, иначе
    // нижние панели обрезаются краем вьюпорта киоска.
    const bindingCount =
      (el.dataBinding?.tagId ? 1 : 0) + (el.extraBindings?.length ?? 0);
    const labelFontSize = el.style?.labelFontSize ?? 11;
    const rowFontSize = Math.max(8, labelFontSize - 1);

    let bottomAllowance = LABEL_ALLOWANCE;
    let sideOverhang = 0;
    if (bindingCount > 0) {
      const panelHeight = bindingCount * (rowFontSize + 7) + 12;
      bottomAllowance = labelFontSize + 8 + panelHeight + 6;
      // Панель самоподстраивается по контенту (до 420px) и центрируется —
      // берём стабильную оценку ширины, не зависящую от живых данных
      const estimatedPanelWidth = Math.min(420, Math.max(el.width, rowFontSize * 24));
      sideOverhang = Math.max(0, (estimatedPanelWidth - el.width) / 2);
    }

    minX = Math.min(minX, el.x - sideOverhang);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width + sideOverhang);
    maxY = Math.max(maxY, el.y + el.height + bottomAllowance);
  });

  return {
    x: minX - CONTENT_PADDING,
    y: minY - CONTENT_PADDING,
    width: Math.max(MIN_VIEWBOX_SIZE, maxX - minX + CONTENT_PADDING * 2),
    height: Math.max(MIN_VIEWBOX_SIZE, maxY - minY + CONTENT_PADDING * 2),
  };
}
