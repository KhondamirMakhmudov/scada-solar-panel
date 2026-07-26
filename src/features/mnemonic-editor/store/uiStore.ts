import { create } from "zustand";
import type { ConnectionHandle, MnemonicElement } from "../types";

export type EditorTool = "select" | "pan" | "draw";

/** Точки — ненавязчивая сетка по умолчанию; линии — для точной компоновки; «нет» — чистый холст под фоновой подложкой. */
export type GridStyle = "dots" | "lines" | "none";

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

  /** Свёрнута ли левая палитра оборудования — освобождает место под холст */
  isPaletteCollapsed: boolean;
  /** Закреплена ли правая панель раскрытой, даже когда ничего не выбрано */
  isInspectorPinned: boolean;
  gridStyle: GridStyle;
  /** Притягивать координаты к шагу сетки при перетаскивании и изменении размера */
  snapToGrid: boolean;
  /**
   * Заявка на прокрутку холста к элементу (из поиска по схеме). Само
   * центрирование выполняет EditorCanvas — только он знает свои экранные
   * размеры, необходимые для расчёта панорамы.
   */
  focusRequestId: string | null;

  setActiveTool: (tool: EditorTool) => void;
  requestFocus: (elementId: string) => void;
  clearFocusRequest: () => void;
  togglePalette: () => void;
  toggleInspectorPinned: () => void;
  setGridStyle: (style: GridStyle) => void;
  toggleSnapToGrid: () => void;
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
  isPaletteCollapsed: false,
  isInspectorPinned: false,
  gridStyle: "dots",
  snapToGrid: false,
  focusRequestId: null,

  setActiveTool: (tool) => set({ activeTool: tool, drawingPoints: null }),
  requestFocus: (elementId) =>
    set({
      focusRequestId: elementId,
      selectedElementIds: [elementId],
      selectedConnectionIds: [],
    }),
  clearFocusRequest: () => set({ focusRequestId: null }),
  togglePalette: () => set((state) => ({ isPaletteCollapsed: !state.isPaletteCollapsed })),
  toggleInspectorPinned: () =>
    set((state) => ({ isInspectorPinned: !state.isInspectorPinned })),
  setGridStyle: (gridStyle) => set({ gridStyle }),
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
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
