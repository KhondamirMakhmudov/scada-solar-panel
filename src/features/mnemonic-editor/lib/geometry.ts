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

export interface PanelSizeEstimate {
  width: number;
  height: number;
}

/**
 * Fixed-formula (non-live-data) estimate of a binding panel's box size, given
 * how many tag rows it has and the element's own width/label font size. Used
 * both to reserve room in computeContentViewBox and to lay out
 * non-overlapping panel slots (panelLayout.ts) — deliberately does NOT depend
 * on live tag values, or overlap resolution/viewbox framing would shift
 * frame-to-frame as data ticks in.
 */
export function estimatePanelSize(
  bindingCount: number,
  elementWidth: number,
  labelFontSize: number,
): PanelSizeEstimate {
  if (bindingCount <= 0) return { width: 0, height: 0 };
  const rowFontSize = Math.max(8, labelFontSize - 1);
  const height = bindingCount * (rowFontSize + 7) + 12;
  // Панель самоподстраивается по контенту (до 420px) и центрируется — берём
  // стабильную оценку ширины, не зависящую от живых данных
  const width = Math.min(420, Math.max(elementWidth, rowFontSize * 24));
  return { width, height };
}

/** Vertical gap between an element's bottom edge and its panel's top edge (room for the label text between them). */
export function panelTopOffset(labelFontSize: number): number {
  return labelFontSize + 8;
}

/**
 * Runtime mode has no pan/zoom controls, so it must frame the diagram
 * itself rather than the full declared canvas (default 1920x1080) — a
 * screen with a couple of shapes placed near the origin would otherwise
 * render tiny, surrounded by mostly empty canvas, once scaled to fit any
 * viewport. Falls back to the full canvas size for an empty screen.
 */
export interface PanelSlotLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeContentViewBox(
  elements: MnemonicElement[],
  canvasSize: { width: number; height: number },
  panelSlots?: Map<string, PanelSlotLike>,
): ViewBox {
  if (!elements.length) {
    return { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);

    // Панель показаний рисуется ПОД фигурой — по строке на каждый
    // привязанный тег. Учитываем её фактический прямоугольник (если он уже
    // посчитан через computePanelSlots — включая любой сдвиг вниз от
    // разрешения перекрытий), иначе — ту же оценку по фиксированной формуле,
    // что и раньше, чтобы нижние панели не обрезались краем вьюпорта киоска.
    const slot = panelSlots?.get(el.id);
    if (slot) {
      minX = Math.min(minX, slot.x);
      maxX = Math.max(maxX, slot.x + slot.width);
      maxY = Math.max(maxY, slot.y + slot.height);
      return;
    }

    const bindingCount =
      (el.dataBinding?.tagId ? 1 : 0) + (el.extraBindings?.length ?? 0);
    const labelFontSize = el.style?.labelFontSize ?? 11;

    if (bindingCount > 0 && el.type !== "chart") {
      const { width: panelWidth, height: panelHeight } = estimatePanelSize(
        bindingCount,
        el.width,
        labelFontSize,
      );
      const bottomAllowance = panelTopOffset(labelFontSize) + panelHeight + 6;
      const sideOverhang = Math.max(0, (panelWidth - el.width) / 2);
      minX = Math.min(minX, el.x - sideOverhang);
      maxX = Math.max(maxX, el.x + el.width + sideOverhang);
      maxY = Math.max(maxY, el.y + el.height + bottomAllowance);
    } else {
      maxY = Math.max(maxY, el.y + el.height + LABEL_ALLOWANCE);
    }
  });

  return {
    x: minX - CONTENT_PADDING,
    y: minY - CONTENT_PADDING,
    width: Math.max(MIN_VIEWBOX_SIZE, maxX - minX + CONTENT_PADDING * 2),
    height: Math.max(MIN_VIEWBOX_SIZE, maxY - minY + CONTENT_PADDING * 2),
  };
}
