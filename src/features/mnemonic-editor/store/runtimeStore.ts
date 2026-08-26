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

/** One active alarm instance — created when a tag's `is_error` flips false→true, removed (and logged) when it clears. */
export interface AlarmMeta {
  tagId: string;
  since: string;
  acked: boolean;
}

/** Cleared-alarm record kept for the runtime alarm log (WinCC-style event history) — capped, session-only. */
export interface AlarmLogEntry {
  tagId: string;
  message: string | null;
  since: string;
  clearedAt: string;
}

const ALARM_LOG_LIMIT = 50;

interface RuntimeStoreState {
  connectionStatus: ConnectionStatus;
  values: Record<string, TagValue>;
  alarms: Record<string, AlarmMeta>;
  alarmLog: AlarmLogEntry[];

  setConnectionStatus: (status: ConnectionStatus) => void;
  applyTagFrame: (frame: TagFrame) => void;
  ackAlarm: (tagId: string) => void;
  ackAllAlarms: () => void;
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
  alarms: {},
  alarmLog: [],

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  applyTagFrame: (frame) =>
    set((state) => {
      const tagId = frame.tag_id;
      const wasError = state.values[tagId]?.isError ?? false;
      const isError = Boolean(frame.is_error);
      const time = frame.time ?? null;

      const values = {
        ...state.values,
        [tagId]: {
          value: (frame.value ?? null) as TagValue["value"],
          unit: frame.unit ?? null,
          isError,
          errorMessage: frame.error_message ?? null,
          time,
        },
      };

      let alarms = state.alarms;
      let alarmLog = state.alarmLog;

      // Alarm raised: new instance starts unacked, timestamped from this frame.
      if (isError && !wasError) {
        alarms = { ...alarms, [tagId]: { tagId, since: time ?? new Date().toISOString(), acked: false } };
      }
      // Alarm cleared: drop from the active set, keep a capped record for the log.
      else if (!isError && wasError && alarms[tagId]) {
        const { [tagId]: clearedMeta, ...rest } = alarms;
        alarms = rest;
        alarmLog = [
          {
            tagId,
            message: state.values[tagId]?.errorMessage ?? null,
            since: clearedMeta.since,
            clearedAt: time ?? new Date().toISOString(),
          },
          ...alarmLog,
        ].slice(0, ALARM_LOG_LIMIT);
      }

      return { values, alarms, alarmLog };
    }),

  ackAlarm: (tagId) =>
    set((state) => {
      const meta = state.alarms[tagId];
      if (!meta) return state;
      return { alarms: { ...state.alarms, [tagId]: { ...meta, acked: true } } };
    }),

  ackAllAlarms: () =>
    set((state) => ({
      alarms: Object.fromEntries(Object.entries(state.alarms).map(([id, meta]) => [id, { ...meta, acked: true }])),
    })),

  clear: () => set({ values: {}, connectionStatus: "connecting", alarms: {}, alarmLog: [] }),
}));
