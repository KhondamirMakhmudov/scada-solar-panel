import { useEffect } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useHistoryStore } from "../store/history/historyStore";
import { commitImmediate } from "../store/history/historyActions";
import { generateId } from "../lib/idGen";

const NUDGE_STEP = 1;

/** Delete/Backspace, Ctrl+Z/Ctrl+Y (undo/redo), Ctrl+C/Ctrl+V (copy/paste), Ctrl+D (duplicate), arrow keys (1px nudge, grid-step with Shift). All document-mutating shortcuts go through commitImmediate so they're undoable as a single step each. */
export function useKeyboardShortcuts() {
  const selectedElementIds = useUiStore((state) => state.selectedElementIds);
  const selectedConnectionIds = useUiStore((state) => state.selectedConnectionIds);
  const select = useUiStore((state) => state.select);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const clipboard = useUiStore((state) => state.clipboard);
  const setClipboard = useUiStore((state) => state.setClipboard);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      const isMod = event.ctrlKey || event.metaKey;

      if (isMod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          useHistoryStore.getState().redo();
        } else {
          useHistoryStore.getState().undo();
        }
        return;
      }

      if (isMod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (selectedElementIds.length || selectedConnectionIds.length)
      ) {
        event.preventDefault();
        commitImmediate(() => {
          if (selectedElementIds.length) {
            useDocumentStore.getState().removeElements(selectedElementIds);
          }
          if (selectedConnectionIds.length) {
            useDocumentStore.getState().removeConnections(selectedConnectionIds);
          }
        });
        clearSelection();
        return;
      }

      if (isMod && event.key.toLowerCase() === "c" && selectedElementIds.length) {
        event.preventDefault();
        const element = useDocumentStore
          .getState()
          .document.elements.find((el) => el.id === selectedElementIds[0]);
        if (element) setClipboard(element);
        return;
      }

      if (isMod && event.key.toLowerCase() === "v" && clipboard) {
        event.preventDefault();
        const newId = generateId(clipboard.type);
        commitImmediate(() =>
          useDocumentStore.getState().addElement({
            ...clipboard,
            id: newId,
            x: clipboard.x + 20,
            y: clipboard.y + 20,
            state: { ...clipboard.state },
            style: { ...clipboard.style },
          }),
        );
        select(newId);
        return;
      }

      if (isMod && event.key.toLowerCase() === "d" && selectedElementIds.length) {
        event.preventDefault();
        const source = useDocumentStore
          .getState()
          .document.elements.find((el) => el.id === selectedElementIds[0]);
        if (source) {
          const newId = generateId(source.type);
          commitImmediate(() =>
            useDocumentStore.getState().addElement({
              ...source,
              id: newId,
              x: source.x + 20,
              y: source.y + 20,
              state: { ...source.state },
              style: { ...source.style },
            }),
          );
          select(newId);
        }
        return;
      }

      const arrowDeltas: Record<string, { dx: number; dy: number }> = {
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
      };

      const delta = arrowDeltas[event.key];
      if (delta && selectedElementIds.length) {
        event.preventDefault();
        const step = event.shiftKey ? useDocumentStore.getState().document.gridSize : NUDGE_STEP;
        commitImmediate(() => {
          selectedElementIds.forEach((id) => {
            const element = useDocumentStore.getState().document.elements.find((el) => el.id === id);
            if (!element) return;
            useDocumentStore.getState().updateElement(id, {
              x: element.x + delta.dx * step,
              y: element.y + delta.dy * step,
            });
          });
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementIds, selectedConnectionIds, clearSelection, clipboard, setClipboard, select]);
}
