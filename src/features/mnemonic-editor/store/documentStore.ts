import { create } from "zustand";
import type { Connection, MnemonicDocument, MnemonicElement } from "../types";
import { createEmptyDocument } from "../document/defaults";

interface DocumentStoreState {
  document: MnemonicDocument;
  isDirty: boolean;

  loadDocument: (doc: MnemonicDocument) => void;
  addElement: (element: MnemonicElement) => void;
  updateElement: (id: string, patch: Partial<MnemonicElement>) => void;
  removeElements: (ids: string[]) => void;
  addConnection: (connection: Connection) => void;
  removeConnections: (ids: string[]) => void;
  /** Wholesale replace, used by undo/redo to restore a captured before/after snapshot. */
  setElementsAndConnections: (elements: MnemonicElement[], connections: Connection[]) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  /** Patches canvas-level metadata (background/canvasSize/gridSize) — everything about the document except elements/connections/layers. */
  updateDocumentMeta: (
    patch: Partial<Pick<MnemonicDocument, "background" | "canvasSize" | "gridSize">>,
  ) => void;
  markSaved: () => void;
}

/**
 * `elements`/`connections` stay arrays (matching the persisted document
 * schema exactly, no denormalize/renormalize step at load/save time).
 * Updates always replace only the changed element's object reference (never
 * the whole array in place) so per-element Zustand selectors in
 * ElementInstance still skip re-rendering unrelated elements. If element
 * counts ever get large enough for the O(n) `.find`/`.map` scans to matter,
 * switch to a normalized `Record<string, MnemonicElement>` — not needed yet.
 */
export const useDocumentStore = create<DocumentStoreState>((set) => ({
  document: createEmptyDocument(),
  isDirty: false,

  loadDocument: (doc) => set({ document: doc, isDirty: false }),

  addElement: (element) =>
    set((state) => ({
      document: {
        ...state.document,
        elements: [...state.document.elements, element],
      },
      isDirty: true,
    })),

  updateElement: (id, patch) =>
    set((state) => ({
      document: {
        ...state.document,
        elements: state.document.elements.map((el) =>
          el.id === id ? { ...el, ...patch } : el,
        ),
      },
      isDirty: true,
    })),

  removeElements: (ids) =>
    set((state) => ({
      document: {
        ...state.document,
        elements: state.document.elements.filter((el) => !ids.includes(el.id)),
        connections: state.document.connections.filter(
          (c) => !ids.includes(c.source.elementId) && !ids.includes(c.target.elementId),
        ),
      },
      isDirty: true,
    })),

  addConnection: (connection) =>
    set((state) => ({
      document: {
        ...state.document,
        connections: [...state.document.connections, connection],
      },
      isDirty: true,
    })),

  removeConnections: (ids) =>
    set((state) => ({
      document: {
        ...state.document,
        connections: state.document.connections.filter((c) => !ids.includes(c.id)),
      },
      isDirty: true,
    })),

  setElementsAndConnections: (elements, connections) =>
    set((state) => ({
      document: { ...state.document, elements, connections },
      isDirty: true,
    })),

  /** Stacking order == array order (no separate z-sort on render), so front/back is just array reposition. */
  bringToFront: (id) =>
    set((state) => {
      const { elements } = state.document;
      const index = elements.findIndex((el) => el.id === id);
      if (index === -1 || index === elements.length - 1) return state;
      const element = elements[index];
      const next = [...elements.slice(0, index), ...elements.slice(index + 1), element];
      return { document: { ...state.document, elements: next }, isDirty: true };
    }),

  sendToBack: (id) =>
    set((state) => {
      const { elements } = state.document;
      const index = elements.findIndex((el) => el.id === id);
      if (index <= 0) return state;
      const element = elements[index];
      const next = [element, ...elements.slice(0, index), ...elements.slice(index + 1)];
      return { document: { ...state.document, elements: next }, isDirty: true };
    }),

  updateDocumentMeta: (patch) =>
    set((state) => ({
      document: { ...state.document, ...patch },
      isDirty: true,
    })),

  markSaved: () => set({ isDirty: false }),
}));
