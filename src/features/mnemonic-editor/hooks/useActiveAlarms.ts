import { useMemo } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useRuntimeStore } from "../store/runtimeStore";
import type { TagValue } from "../store/runtimeStore";

export interface ActiveAlarm {
  tagId: string;
  tagName: string;
  elementLabel: string;
  message: string | null;
  value: TagValue["value"];
  unit: string | null;
  since: string;
  acked: boolean;
}

/**
 * Joins runtimeStore's alarm metadata (tagId-keyed, no display info) with
 * the current screen's elements (label + tag name) and live values (message,
 * reading) — kept as a derived hook rather than folding element lookups into
 * the store, so runtimeStore stays document-agnostic like the rest of its
 * live-value machinery (see ElementInstance/RuntimeElement doing the same
 * per-element join).
 */
export function useActiveAlarms(): ActiveAlarm[] {
  const elements = useDocumentStore((state) => state.document.elements);
  const alarms = useRuntimeStore((state) => state.alarms);
  const values = useRuntimeStore((state) => state.values);

  return useMemo(() => {
    const list: ActiveAlarm[] = Object.values(alarms).map((meta) => {
      const element = elements.find((el) => el.dataBinding?.tagId === meta.tagId);
      const live = values[meta.tagId];
      return {
        tagId: meta.tagId,
        tagName: element?.dataBinding?.tagName || meta.tagId,
        elementLabel: element?.label || "—",
        message: live?.errorMessage ?? null,
        value: live?.value ?? null,
        unit: live?.unit ?? null,
        since: meta.since,
        acked: meta.acked,
      };
    });

    // Newest first, unacked ahead of acked — same triage order as WinCC's alarm list.
    return list.sort((a, b) => {
      if (a.acked !== b.acked) return a.acked ? 1 : -1;
      return a.since < b.since ? 1 : -1;
    });
  }, [elements, alarms, values]);
}
