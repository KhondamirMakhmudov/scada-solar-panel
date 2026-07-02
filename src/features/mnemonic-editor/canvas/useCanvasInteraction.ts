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
import { generateId } from "../lib/idGen";
import type { ConnectionHandle } from "../types";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

const MIN_SIZE = 12;

interface DragState {
  mode: "pan" | "move" | "resize" | "rotate" | "connect";
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
}

/** Wires pointer/wheel events for the canvas: space-drag/middle-click pan, click-drag move/resize/rotate on a selected element, cursor-anchored wheel zoom, click-empty-space to deselect, right-click to open the context menu. Interactive gestures (move/resize/rotate) commit exactly one undo/redo entry on pointer-up, never per intermediate frame. */
export function useCanvasInteraction() {
  const dragRef = useRef<DragState | null>(null);

  const viewport = useUiStore((state) => state.viewport);
  const setViewport = useUiStore((state) => state.setViewport);
  const isSpaceDown = useUiStore((state) => state.isSpaceDown);
  const select = useUiStore((state) => state.select);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const openContextMenu = useUiStore((state) => state.openContextMenu);
  const closeContextMenu = useUiStore((state) => state.closeContextMenu);
  const selectConnection = useUiStore((state) => state.selectConnection);
  const startConnecting = useUiStore((state) => state.startConnecting);
  const updateConnectingPreview = useUiStore((state) => state.updateConnectingPreview);
  const cancelConnecting = useUiStore((state) => state.cancelConnecting);

  const updateElement = useDocumentStore((state) => state.updateElement);

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
      } else {
        clearSelection();
      }
    },
    [isSpaceDown, viewport.panX, viewport.panY, clearSelection, closeContextMenu],
  );

  const handleElementPointerDown = useCallback(
    (id: string) => (event: ReactPointerEvent<SVGGElement>) => {
      event.stopPropagation();
      closeContextMenu();
      select(id);
      const element = useDocumentStore.getState().document.elements.find((el) => el.id === id);
      if (!element) return;
      dragRef.current = {
        mode: "move",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        elementId: id,
        startElementX: element.x,
        startElementY: element.y,
        historyBefore: snapshotDocumentArrays(),
      };
    },
    [select, viewport.panX, viewport.panY, closeContextMenu],
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

      if (drag.mode === "move" && drag.elementId) {
        updateElement(drag.elementId, {
          x: (drag.startElementX ?? 0) + dx / zoom,
          y: (drag.startElementY ?? 0) + dy / zoom,
        });
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

        updateElement(drag.elementId, { x: nextX, y: nextY, width: nextW, height: nextH });
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
      }
    },
    [setViewport, updateElement, updateConnectingPreview],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;

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

      if (drag && drag.historyBefore && (drag.mode === "move" || drag.mode === "resize" || drag.mode === "rotate")) {
        commitSnapshotDiff(drag.historyBefore);
      }
      dragRef.current = null;
    },
    [cancelConnecting],
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
    handleRotateHandlePointerDown,
    handleAnchorPointerDown,
    handleConnectionPointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  };
}
