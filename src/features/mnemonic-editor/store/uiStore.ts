import { create } from "zustand";
import type { ConnectionHandle, MnemonicElement } from "../types";

export type EditorTool = "select" | "pan" | "draw";

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  targetId: string;
}

export interface ConnectingState {
  elementId: string;
  handle: ConnectionHandle;
  previewPoint: { x: number; y: number };
}

interface UiStoreState {
  activeTool: EditorTool;
  selectedElementIds: string[];
  selectedConnectionIds: string[];
  viewport: Viewport;
  isSpaceDown: boolean;
  clipboard: MnemonicElement | null;
  contextMenu: ContextMenuState | null;
  connecting: ConnectingState | null;
  /** Точки текущего мазка кисти (в координатах документа), null — не рисуем */
  drawingPoints: { x: number; y: number }[] | null;

  setActiveTool: (tool: EditorTool) => void;
  select: (id: string | null) => void;
  clearSelection: () => void;
  selectConnection: (id: string | null) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setSpaceDown: (down: boolean) => void;
  setClipboard: (element: MnemonicElement | null) => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  startConnecting: (elementId: string, handle: ConnectionHandle, previewPoint: { x: number; y: number }) => void;
  updateConnectingPreview: (previewPoint: { x: number; y: number }) => void;
  cancelConnecting: () => void;
  startDrawing: (point: { x: number; y: number }) => void;
  appendDrawingPoint: (point: { x: number; y: number }) => void;
  clearDrawing: () => void;
}

/**
 * Selection/tool/viewport/clipboard/context-menu/in-progress-connection —
 * changes on every click/hover/pan/drag tick, so it must never live in
 * `documentStore` (would dirty the save-state and pollute undo/redo history
 * with non-structural changes).
 */
export const useUiStore = create<UiStoreState>((set) => ({
  activeTool: "select",
  selectedElementIds: [],
  selectedConnectionIds: [],
  viewport: { zoom: 1, panX: 0, panY: 0 },
  isSpaceDown: false,
  clipboard: null,
  contextMenu: null,
  connecting: null,
  drawingPoints: null,

  setActiveTool: (tool) => set({ activeTool: tool, drawingPoints: null }),
  select: (id) => set({ selectedElementIds: id ? [id] : [], selectedConnectionIds: [] }),
  clearSelection: () => set({ selectedElementIds: [], selectedConnectionIds: [] }),
  selectConnection: (id) => set({ selectedConnectionIds: id ? [id] : [], selectedElementIds: [] }),
  setViewport: (viewport) =>
    set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  setSpaceDown: (down) => set({ isSpaceDown: down }),
  setClipboard: (element) => set({ clipboard: element }),
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),
  startConnecting: (elementId, handle, previewPoint) =>
    set({ connecting: { elementId, handle, previewPoint } }),
  updateConnectingPreview: (previewPoint) =>
    set((state) => (state.connecting ? { connecting: { ...state.connecting, previewPoint } } : state)),
  cancelConnecting: () => set({ connecting: null }),
  startDrawing: (point) => set({ drawingPoints: [point] }),
  appendDrawingPoint: (point) =>
    set((state) =>
      state.drawingPoints ? { drawingPoints: [...state.drawingPoints, point] } : state,
    ),
  clearDrawing: () => set({ drawingPoints: null }),
}));
