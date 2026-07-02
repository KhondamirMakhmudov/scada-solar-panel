import { create } from "zustand";

export interface HistoryCommand {
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 100;

interface HistoryStoreState {
  past: HistoryCommand[];
  future: HistoryCommand[];
  push: (command: HistoryCommand) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

/**
 * Separate from documentStore so the undo/redo stack itself never triggers
 * document subscribers, and so it isn't accidentally persisted alongside
 * the document.
 */
export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  past: [],
  future: [],

  push: (command) =>
    set((state) => ({
      past: [...state.past, command].slice(-MAX_HISTORY),
      future: [],
    })),

  undo: () => {
    const { past, future } = get();
    if (!past.length) return;
    const command = past[past.length - 1];
    command.undo();
    set({ past: past.slice(0, -1), future: [command, ...future] });
  },

  redo: () => {
    const { past, future } = get();
    if (!future.length) return;
    const command = future[0];
    command.redo();
    set({ past: [...past, command], future: future.slice(1) });
  },

  clear: () => set({ past: [], future: [] }),
}));
