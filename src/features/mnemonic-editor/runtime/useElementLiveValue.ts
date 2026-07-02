import { useRuntimeStore } from "../store/runtimeStore";

/** Subscribes to exactly one tag's live value — used by ElementInstance/RuntimeElement so a tag tick only re-renders shapes bound to that specific tag. */
export function useElementLiveValue(tagId: string | null | undefined) {
  return useRuntimeStore((state) => (tagId ? state.values[tagId] : undefined));
}
