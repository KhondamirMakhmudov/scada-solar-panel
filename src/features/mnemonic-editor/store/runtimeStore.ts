import { create } from "zustand";

export type ConnectionStatus = "connecting" | "online" | "offline";

export interface TagValue {
  value: number | string | boolean | null;
  unit: string | null;
  isError: boolean;
  errorMessage: string | null;
  time: string | null;
}

interface TagFrame {
  tag_id: string;
  value?: unknown;
  unit?: string | null;
  is_error?: boolean;
  error_message?: string | null;
  time?: string;
}

interface RuntimeStoreState {
  connectionStatus: ConnectionStatus;
  values: Record<string, TagValue>;

  setConnectionStatus: (status: ConnectionStatus) => void;
  applyTagFrame: (frame: TagFrame) => void;
  clear: () => void;
}

/**
 * Live WebSocket tag values — a store fully separate from documentStore so a
 * tag tick (which can fire many times per second) never triggers document
 * subscribers and never gets swept into undo/redo history.
 */
export const useRuntimeStore = create<RuntimeStoreState>((set) => ({
  connectionStatus: "connecting",
  values: {},

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  applyTagFrame: (frame) =>
    set((state) => ({
      values: {
        ...state.values,
        [frame.tag_id]: {
          value: (frame.value ?? null) as TagValue["value"],
          unit: frame.unit ?? null,
          isError: Boolean(frame.is_error),
          errorMessage: frame.error_message ?? null,
          time: frame.time ?? null,
        },
      },
    })),

  clear: () => set({ values: {}, connectionStatus: "connecting" }),
}));
