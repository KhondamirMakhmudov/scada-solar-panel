import { useDocumentStore } from "../documentStore";
import { useHistoryStore } from "./historyStore";

interface ArraysSnapshot {
  elements: ReturnType<typeof useDocumentStore.getState>["document"]["elements"];
  connections: ReturnType<typeof useDocumentStore.getState>["document"]["connections"];
}

/**
 * Undo/redo captures only `elements`/`connections` (never the full document
 * — canvasSize/layers/background/gridSize stay outside history), and only
 * once per discrete user action (a click-to-add, a delete, or a drag's
 * pointer-up), never per intermediate pointermove. Because documentStore
 * updates always replace just the changed element's object reference (see
 * documentStore.ts), a captured array is a stable, cheap snapshot — no deep
 * cloning needed. This is a lighter-weight variant of the plan's
 * command/inverse-patch design: same "don't snapshot the whole document,
 * don't record every intermediate frame" guarantees, without hand-rolling
 * per-field inverse patches for every action type.
 */
function snapshotDocumentArrays(): ArraysSnapshot {
  const { elements, connections } = useDocumentStore.getState().document;
  return { elements, connections };
}

function restoreDocumentArrays(snapshot: ArraysSnapshot) {
  useDocumentStore.getState().setElementsAndConnections(snapshot.elements, snapshot.connections);
}

/** Diffs `before` against the current state and pushes one undo/redo entry if anything changed. Pair with a snapshot taken before an interactive gesture (drag/resize/rotate) started. */
export function commitSnapshotDiff(before: ArraysSnapshot) {
  const after = snapshotDocumentArrays();
  if (before.elements === after.elements && before.connections === after.connections) return;

  useHistoryStore.getState().push({
    undo: () => restoreDocumentArrays(before),
    redo: () => restoreDocumentArrays(after),
  });
}

/** Snapshots before, runs `mutate`, snapshots after, pushes one undo/redo entry — for actions that happen atomically (add, delete, duplicate, paste, front/back). */
export function commitImmediate(mutate: () => void) {
  const before = snapshotDocumentArrays();
  mutate();
  commitSnapshotDiff(before);
}

export { snapshotDocumentArrays };
