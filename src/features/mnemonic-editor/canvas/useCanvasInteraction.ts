import { useCallback, useRef } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { clampZoom, getElementAnchorPoint, nearestHandleFacing, screenToDocumentPoint, zoomAtPoint } from "../lib/geometry";
import { findElementAtPoint } from "../lib/hitTest";
import { commitImmediate, commitSnapshotDiff, snapshotDocumentArrays } from "../store/history/historyActions";
import { computeAlignmentSnap } from "../lib/alignmentGuides";
import { generateId } from "../lib/idGen";
import { SHAPE_REGISTRY } from "../shapes/registry";
import { DEFAULT_LAYER_ID } from "../document/defaults";
import type { ConnectionHandle, MnemonicElement } from "../types";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

const MIN_SIZE = 12;
/** Screen pixels within which a dragged edge/center snaps to another element's — converted to document units by dividing by zoom. */
const ALIGN_SNAP_PX = 6;

interface GroupResizeStart {
  elements: Map<string, { x: number; y: number; width: number; height: number }>;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  handle: ResizeHandle;
}

interface DragState {
  mode: "pan" | "move" | "resize" | "rotate" | "connect" | "draw" | "group-resize";
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
  elementId?: string;
  startElementX?: number;
  startElementY?: number;
  startElementWidth?: number;
  startElementHeight?: number;
  resizeHandle?: ResizeHandle;
  connectHandle?: ConnectionHandle;
  historyBefore?: ReturnType<typeof snapshotDocumentArrays>;
  /** Every selected element's starting x/y when a move drag covers more than one — see handleElementPointerDown. */
  groupStartPositions?: Map<string, { x: number; y: number }>;
  groupResizeStart?: GroupResizeStart;
}

/** Wires pointer/wheel events for the canvas: space-drag/middle-click pan, click-drag move/resize/rotate on a selected element, cursor-anchored wheel zoom, click-empty-space to deselect, right-click to open the context menu. Interactive gestures (move/resize/rotate) commit exactly one undo/redo entry on pointer-up, never per intermediate frame. */
export function useCanvasInteraction() {
  const dragRef = useRef<DragState | null>(null);

  const viewport = useUiStore((state) => state.viewport);
  const setViewport = useUiStore((state) => state.setViewport);
  const isSpaceDown = useUiStore((state) => state.isSpaceDown);
  const select = useUiStore((state) => state.select);
  const toggleSelect = useUiStore((state) => state.toggleSelect);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const openContextMenu = useUiStore((state) => state.openContextMenu);
  const closeContextMenu = useUiStore((state) => state.closeContextMenu);
  const selectConnection = useUiStore((state) => state.selectConnection);
  const startConnecting = useUiStore((state) => state.startConnecting);
  const updateConnectingPreview = useUiStore((state) => state.updateConnectingPreview);
  const cancelConnecting = useUiStore((state) => state.cancelConnecting);
  const setAlignmentGuides = useUiStore((state) => state.setAlignmentGuides);
  const clearAlignmentGuides = useUiStore((state) => state.clearAlignmentGuides);

  const updateElement = useDocumentStore((state) => state.updateElement);

  const activeTool = useUiStore((state) => state.activeTool);
  const startDrawing = useUiStore((state) => state.startDrawing);
  const appendDrawingPoint = useUiStore((state) => state.appendDrawingPoint);
  const clearDrawing = useUiStore((state) => state.clearDrawing);

  const beginDrawStroke = useCallback(
    (clientX: number, clientY: number, svg: SVGSVGElement) => {
      const rect = svg.getBoundingClientRect();
      const currentViewport = useUiStore.getState().viewport;
      const point = screenToDocumentPoint(clientX, clientY, rect, currentViewport);
      startDrawing(point);
      dragRef.current = {
        mode: "draw",
        startClientX: clientX,
        startClientY: clientY,
        startPanX: currentViewport.panX,
        startPanY: currentViewport.panY,
      };
    },
    [startDrawing],
  );

  /**
   * A background pointerdown that lands inside the current selection's own
   * bounding box (same box + padding SelectionOverlay draws) starts a group
   * move instead of clearing the selection — otherwise the only way to drag
   * a multi-selection is to grab exactly one of its shapes, which doesn't
   * match the bounding box drawn around the whole group. Returns whether it
   * started a drag, so the caller knows not to fall through to clearSelection.
   */
  const startGroupDragFromBackground = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const selectedIds = useUiStore.getState().selectedElementIds;
      if (selectedIds.length === 0) return false;

      const selectedElements = useDocumentStore
        .getState()
        .document.elements.filter((el) => selectedIds.includes(el.id));
      if (selectedElements.length === 0) return false;

      const rect = event.currentTarget.getBoundingClientRect();
      const point = screenToDocumentPoint(event.clientX, event.clientY, rect, viewport);
      const pad = 6; // same padding as SelectionOverlay's group frame
      const minX = Math.min(...selectedElements.map((el) => el.x)) - pad;
      const minY = Math.min(...selectedElements.map((el) => el.y)) - pad;
      const maxX = Math.max(...selectedElements.map((el) => el.x + el.width)) + pad;
      const maxY = Math.max(...selectedElements.map((el) => el.y + el.height)) + pad;
      if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) return false;

      const primary = selectedElements.find((el) => el.id === selectedIds[0]) ?? selectedElements[0];
      const groupStartPositions = new Map(selectedElements.map((el) => [el.id, { x: el.x, y: el.y }]));

      dragRef.current = {
        mode: "move",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        elementId: primary.id,
        startElementX: primary.x,
        startElementY: primary.y,
        groupStartPositions,
        historyBefore: snapshotDocumentArrays(),
      };
      return true;
    },
    [viewport],
  );

  const handleBackgroundPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      closeContextMenu();
      if (isSpaceDown || event.button === 1) {
        dragRef.current = {
          mode: "pan",
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPanX: viewport.panX,
          startPanY: viewport.panY,
        };
      } else if (activeTool === "draw" && event.button === 0) {
        clearSelection();
        beginDrawStroke(event.clientX, event.clientY, event.currentTarget);
      } else if (event.button === 0 && startGroupDragFromBackground(event)) {
        // Клик внутри рамки текущего выделения (но не по самой фигуре — жест
        // ушёл бы через handleElementPointerDown раньше) двигает всю группу,
        // а не сбрасывает её: как только вокруг набора фигур нарисована общая
        // синяя рамка, естественно тянуть их за пустое место внутри неё же,
        // а не обязательно попадать курсором ровно в одну из фигур.
      } else {
        clearSelection();
      }
    },
    [isSpaceDown, viewport.panX, viewport.panY, clearSelection, closeContextMenu, activeTool, beginDrawStroke, startGroupDragFromBackground],
  );

  const handleElementPointerDown = useCallback(
    (id: string) => (event: ReactPointerEvent<SVGGElement>) => {
      event.stopPropagation();
      closeContextMenu();
      // В режиме кисти клик по существующему элементу начинает новый мазок
      // поверх него, а не перетаскивание
      if (useUiStore.getState().activeTool === "draw" && event.button === 0) {
        const svg = event.currentTarget.ownerSVGElement;
        if (svg) beginDrawStroke(event.clientX, event.clientY, svg);
        return;
      }

      const currentSelection = useUiStore.getState().selectedElementIds;
      const isAdditive = event.ctrlKey || event.metaKey || event.shiftKey;

      if (isAdditive) {
        const wasSelected = currentSelection.includes(id);
        toggleSelect(id);

        // Снятие элемента с выделения этим же кликом — тащить уже нечего.
        if (wasSelected) return;

        // Добавление в выделение начинает перетаскивание всей группы (включая
        // только что добавленный элемент) сразу, тем же нажатием — иначе
        // пришлось бы отпускать Ctrl и кликать заново отдельным, обычным
        // нажатием, что для большинства и не очевидно, и лишнее движение.
        const groupIds = [...currentSelection, id];
        const elements = useDocumentStore.getState().document.elements;
        const primary = elements.find((el) => el.id === id);
        if (!primary) return;

        const groupStartPositions = new Map(
          groupIds
            .map((elId) => elements.find((el) => el.id === elId))
            .filter((el): el is MnemonicElement => Boolean(el))
            .map((el) => [el.id, { x: el.x, y: el.y }]),
        );

        dragRef.current = {
          mode: "move",
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPanX: viewport.panX,
          startPanY: viewport.panY,
          elementId: id,
          startElementX: primary.x,
          startElementY: primary.y,
          groupStartPositions,
          historyBefore: snapshotDocumentArrays(),
        };
        return;
      }

      // Клик по элементу вне текущего множественного выделения сбрасывает его
      // до одного этого элемента — как в любом графическом редакторе. Клик по
      // уже выделенному участнику группы сохраняет всё выделение, и группа
      // двигается вместе.
      const groupIds = currentSelection.includes(id) ? currentSelection : [id];
      if (!currentSelection.includes(id)) select(id);

      const elements = useDocumentStore.getState().document.elements;
      const primary = elements.find((el) => el.id === id);
      if (!primary) return;

      const groupStartPositions = new Map(
        groupIds
          .map((elId) => elements.find((el) => el.id === elId))
          .filter((el): el is MnemonicElement => Boolean(el))
          .map((el) => [el.id, { x: el.x, y: el.y }]),
      );

      dragRef.current = {
        mode: "move",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        elementId: id,
        startElementX: primary.x,
        startElementY: primary.y,
        groupStartPositions,
        historyBefore: snapshotDocumentArrays(),
      };
    },
    [select, toggleSelect, viewport.panX, viewport.panY, closeContextMenu, beginDrawStroke],
  );

  const handleElementContextMenu = useCallback(
    (id: string) => (event: ReactMouseEvent<SVGGElement>) => {
      event.preventDefault();
      event.stopPropagation();
      select(id);
      openContextMenu({ x: event.clientX, y: event.clientY, targetId: id });
    },
    [select, openContextMenu],
  );

  const handleResizeHandlePointerDown = useCallback(
    (id: string, handle: ResizeHandle) => (event: ReactPointerEvent<SVGElement>) => {
      event.stopPropagation();
      const element = useDocumentStore.getState().document.elements.find((el) => el.id === id);
      if (!element) return;
      dragRef.current = {
        mode: "resize",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        elementId: id,
        startElementX: element.x,
        startElementY: element.y,
        startElementWidth: element.width,
        startElementHeight: element.height,
        resizeHandle: handle,
        historyBefore: snapshotDocumentArrays(),
      };
    },
    [viewport.panX, viewport.panY],
  );

  const handleGroupResizeHandlePointerDown = useCallback(
    (handle: ResizeHandle) => (event: ReactPointerEvent<SVGElement>) => {
      event.stopPropagation();
      const ids = useUiStore.getState().selectedElementIds;
      const elements = useDocumentStore.getState().document.elements.filter((el) => ids.includes(el.id));
      if (elements.length < 2) return;

      const minX = Math.min(...elements.map((el) => el.x));
      const minY = Math.min(...elements.map((el) => el.y));
      const maxX = Math.max(...elements.map((el) => el.x + el.width));
      const maxY = Math.max(...elements.map((el) => el.y + el.height));

      dragRef.current = {
        mode: "group-resize",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        historyBefore: snapshotDocumentArrays(),
        groupResizeStart: {
          elements: new Map(elements.map((el) => [el.id, { x: el.x, y: el.y, width: el.width, height: el.height }])),
          bbox: { minX, minY, maxX, maxY },
          handle,
        },
      };
    },
    [viewport.panX, viewport.panY],
  );

  const handleRotateHandlePointerDown = useCallback(
    (id: string) => (event: ReactPointerEvent<SVGElement>) => {
      event.stopPropagation();
      dragRef.current = {
        mode: "rotate",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        elementId: id,
        historyBefore: snapshotDocumentArrays(),
      };
    },
    [viewport.panX, viewport.panY],
  );

  const handleAnchorPointerDown = useCallback(
    (id: string, handle: ConnectionHandle) => (event: ReactPointerEvent<SVGElement>) => {
      event.stopPropagation();
      const element = useDocumentStore.getState().document.elements.find((el) => el.id === id);
      if (!element) return;
      const anchorPoint = getElementAnchorPoint(element, handle);
      dragRef.current = {
        mode: "connect",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        elementId: id,
        connectHandle: handle,
      };
      startConnecting(id, handle, anchorPoint);
    },
    [viewport.panX, viewport.panY, startConnecting],
  );

  const handleConnectionPointerDown = useCallback(
    (id: string) => (event: ReactPointerEvent<SVGElement>) => {
      event.stopPropagation();
      closeContextMenu();
      selectConnection(id);
    },
    [selectConnection, closeContextMenu],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;

      if (drag.mode === "pan") {
        setViewport({ panX: drag.startPanX + dx, panY: drag.startPanY + dy });
        return;
      }

      const zoom = useUiStore.getState().viewport.zoom;

      // Притяжение к сетке применяется к итоговым координатам, а не к
      // смещению курсора: иначе элемент, изначально стоявший не по сетке,
      // так и остался бы смещённым на постоянную дельту.
      const snap = (value: number) => {
        if (!useUiStore.getState().snapToGrid) return value;
        const grid = useDocumentStore.getState().document.gridSize;
        return grid > 0 ? Math.round(value / grid) * grid : value;
      };

      if (drag.mode === "move" && drag.elementId) {
        const rawX = (drag.startElementX ?? 0) + dx / zoom;
        const rawY = (drag.startElementY ?? 0) + dy / zoom;

        const document = useDocumentStore.getState().document;
        const dragged = document.elements.find((el) => el.id === drag.elementId);
        const width = dragged?.width ?? 0;
        const height = dragged?.height ?? 0;
        // Whole group excluded from alignment candidates — a fellow group
        // member is about to move by the same delta, so "aligning" to it is
        // meaningless (and, since it hasn't updated yet this tick, misleading).
        const groupIdSet = new Set(
          drag.groupStartPositions ? [...drag.groupStartPositions.keys()] : [drag.elementId],
        );
        const others = document.elements.filter((el) => !groupIdSet.has(el.id));

        const alignment = computeAlignmentSnap(
          { x: rawX, y: rawY, width, height },
          others,
          document.canvasSize,
          ALIGN_SNAP_PX / zoom,
        );
        setAlignmentGuides({ vertical: alignment.verticalGuides, horizontal: alignment.horizontalGuides });

        const finalX = alignment.verticalGuides.length > 0 ? alignment.x : snap(rawX);
        const finalY = alignment.horizontalGuides.length > 0 ? alignment.y : snap(rawY);

        if (drag.groupStartPositions && drag.groupStartPositions.size > 1) {
          const deltaX = finalX - (drag.startElementX ?? 0);
          const deltaY = finalY - (drag.startElementY ?? 0);
          drag.groupStartPositions.forEach((start, elId) => {
            updateElement(elId, { x: start.x + deltaX, y: start.y + deltaY });
          });
        } else {
          updateElement(drag.elementId, { x: finalX, y: finalY });
        }
      } else if (drag.mode === "resize" && drag.elementId && drag.resizeHandle) {
        const rawDx = dx / zoom;
        const rawDy = dy / zoom;
        const x = drag.startElementX ?? 0;
        const y = drag.startElementY ?? 0;
        const w = drag.startElementWidth ?? MIN_SIZE;
        const h = drag.startElementHeight ?? MIN_SIZE;
        let nextX = x;
        let nextY = y;
        let nextW = w;
        let nextH = h;

        if (drag.resizeHandle.includes("e")) nextW = Math.max(MIN_SIZE, w + rawDx);
        if (drag.resizeHandle.includes("s")) nextH = Math.max(MIN_SIZE, h + rawDy);
        if (drag.resizeHandle.includes("w")) {
          nextW = Math.max(MIN_SIZE, w - rawDx);
          nextX = x + (w - nextW);
        }
        if (drag.resizeHandle.includes("n")) {
          nextH = Math.max(MIN_SIZE, h - rawDy);
          nextY = y + (h - nextH);
        }

        updateElement(drag.elementId, {
          x: snap(nextX),
          y: snap(nextY),
          width: Math.max(MIN_SIZE, snap(nextW)),
          height: Math.max(MIN_SIZE, snap(nextH)),
        });
      } else if (drag.mode === "group-resize" && drag.groupResizeStart) {
        // Scales every selected element's position/size around the fixed
        // opposite corner of the group's combined bounding box — same
        // corner-anchor convention as the single-element resize above, just
        // applied as one shared scale factor per axis instead of a direct
        // width/height delta.
        const { elements: startEls, bbox, handle } = drag.groupResizeStart;
        const rawDx = dx / zoom;
        const rawDy = dy / zoom;
        const { minX, minY, maxX, maxY } = bbox;

        let newMinX = minX;
        let newMinY = minY;
        let newMaxX = maxX;
        let newMaxY = maxY;

        if (handle.includes("e")) newMaxX = Math.max(minX + MIN_SIZE, maxX + rawDx);
        if (handle.includes("s")) newMaxY = Math.max(minY + MIN_SIZE, maxY + rawDy);
        if (handle.includes("w")) newMinX = Math.min(maxX - MIN_SIZE, minX + rawDx);
        if (handle.includes("n")) newMinY = Math.min(maxY - MIN_SIZE, minY + rawDy);

        const scaleX = (newMaxX - newMinX) / (maxX - minX);
        const scaleY = (newMaxY - newMinY) / (maxY - minY);
        const anchorX = handle.includes("w") ? maxX : minX;
        const anchorY = handle.includes("n") ? maxY : minY;

        startEls.forEach((start, elId) => {
          updateElement(elId, {
            x: anchorX + (start.x - anchorX) * scaleX,
            y: anchorY + (start.y - anchorY) * scaleY,
            width: Math.max(MIN_SIZE, start.width * scaleX),
            height: Math.max(MIN_SIZE, start.height * scaleY),
          });
        });
      } else if (drag.mode === "rotate" && drag.elementId) {
        const rect = event.currentTarget.getBoundingClientRect();
        const currentViewport = useUiStore.getState().viewport;
        const pointerDoc = screenToDocumentPoint(event.clientX, event.clientY, rect, currentViewport);
        const element = useDocumentStore.getState().document.elements.find((el) => el.id === drag.elementId);
        if (element) {
          const cx = element.x + element.width / 2;
          const cy = element.y + element.height / 2;
          const angleDeg = (Math.atan2(pointerDoc.y - cy, pointerDoc.x - cx) * 180) / Math.PI + 90;
          updateElement(drag.elementId, { rotation: Math.round(angleDeg) });
        }
      } else if (drag.mode === "connect") {
        const rect = event.currentTarget.getBoundingClientRect();
        const currentViewport = useUiStore.getState().viewport;
        const pointerDoc = screenToDocumentPoint(event.clientX, event.clientY, rect, currentViewport);
        updateConnectingPreview(pointerDoc);
      } else if (drag.mode === "draw") {
        const rect = event.currentTarget.getBoundingClientRect();
        const currentViewport = useUiStore.getState().viewport;
        const pointerDoc = screenToDocumentPoint(event.clientX, event.clientY, rect, currentViewport);
        const points = useUiStore.getState().drawingPoints;
        const last = points?.[points.length - 1];
        // Прореживаем точки: ближе 2px (в координатах документа) не добавляем
        if (!last || Math.hypot(pointerDoc.x - last.x, pointerDoc.y - last.y) >= 2) {
          appendDrawingPoint(pointerDoc);
        }
      }
    },
    [setViewport, updateElement, updateConnectingPreview, appendDrawingPoint, setAlignmentGuides],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;

      if (drag?.mode === "move") clearAlignmentGuides();

      if (drag?.mode === "draw") {
        const points = useUiStore.getState().drawingPoints;
        clearDrawing();
        dragRef.current = null;

        if (points && points.length >= 2) {
          const xs = points.map((p) => p.x);
          const ys = points.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const width = Math.max(4, Math.max(...xs) - minX);
          const height = Math.max(4, Math.max(...ys) - minY);

          // Нормализуем точки в 0..1 относительно рамки — фигура затем
          // масштабируется/вращается как обычный элемент
          const normalized = points.map((p) => [
            (p.x - minX) / width,
            (p.y - minY) / height,
          ]);

          const definition = SHAPE_REGISTRY.freehand!;
          const id = generateId("freehand");
          commitImmediate(() =>
            useDocumentStore.getState().addElement({
              id,
              type: "freehand",
              layerId: DEFAULT_LAYER_ID,
              x: minX,
              y: minY,
              width,
              height,
              rotation: 0,
              zIndex: useDocumentStore.getState().document.elements.length,
              style: { ...definition.defaultStyle },
              state: { points: normalized },
            }),
          );
          select(id);
        }
        return;
      }

      if (drag?.mode === "connect" && drag.elementId && drag.connectHandle) {
        const rect = event.currentTarget.getBoundingClientRect();
        const currentViewport = useUiStore.getState().viewport;
        const dropPoint = screenToDocumentPoint(event.clientX, event.clientY, rect, currentViewport);
        const target = findElementAtPoint(
          useDocumentStore.getState().document.elements,
          dropPoint,
          drag.elementId,
        );

        if (target) {
          const targetHandle = nearestHandleFacing(
            target,
            getElementAnchorPoint(
              useDocumentStore.getState().document.elements.find((el) => el.id === drag.elementId)!,
              drag.connectHandle,
            ),
          );
          commitImmediate(() =>
            useDocumentStore.getState().addConnection({
              id: generateId("connection"),
              source: { elementId: drag.elementId!, handle: drag.connectHandle! },
              target: { elementId: target.id, handle: targetHandle },
            }),
          );
        }

        cancelConnecting();
        dragRef.current = null;
        return;
      }

      if (
        drag &&
        drag.historyBefore &&
        (drag.mode === "move" || drag.mode === "resize" || drag.mode === "rotate" || drag.mode === "group-resize")
      ) {
        commitSnapshotDiff(drag.historyBefore);
      }
      dragRef.current = null;
    },
    [cancelConnecting, clearDrawing, select, clearAlignmentGuides],
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const currentViewport = useUiStore.getState().viewport;
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const nextZoom = clampZoom(currentViewport.zoom + delta);
      setViewport(zoomAtPoint(currentViewport, nextZoom, screenX, screenY));
    },
    [setViewport],
  );

  return {
    handleBackgroundPointerDown,
    handleElementPointerDown,
    handleElementContextMenu,
    handleResizeHandlePointerDown,
    handleGroupResizeHandlePointerDown,
    handleRotateHandlePointerDown,
    handleAnchorPointerDown,
    handleConnectionPointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  };
}
