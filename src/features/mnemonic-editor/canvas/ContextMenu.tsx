import { useEffect, useRef } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { commitImmediate } from "../store/history/historyActions";
import { generateId } from "../lib/idGen";

/** Right-click menu for the element under the cursor: front/back z-order, duplicate, delete. Positioned in screen space (fixed), independent of canvas pan/zoom. */
const ContextMenu = () => {
  const contextMenu = useUiStore((state) => state.contextMenu);
  const closeContextMenu = useUiStore((state) => state.closeContextMenu);
  const select = useUiStore((state) => state.select);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const { targetId } = contextMenu;

  const handleBringToFront = () => {
    commitImmediate(() => useDocumentStore.getState().bringToFront(targetId));
    closeContextMenu();
  };

  const handleSendToBack = () => {
    commitImmediate(() => useDocumentStore.getState().sendToBack(targetId));
    closeContextMenu();
  };

  const handleDuplicate = () => {
    const source = useDocumentStore.getState().document.elements.find((el) => el.id === targetId);
    if (!source) return;
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
    closeContextMenu();
  };

  const handleDelete = () => {
    commitImmediate(() => useDocumentStore.getState().removeElements([targetId]));
    select(null);
    closeContextMenu();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1 text-sm text-slate-200"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button
        type="button"
        onClick={handleBringToFront}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-800"
      >
        На передний план
      </button>
      <button
        type="button"
        onClick={handleSendToBack}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-800"
      >
        На задний план
      </button>
      <button
        type="button"
        onClick={handleDuplicate}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-800"
      >
        Дублировать
      </button>
      <div className="my-1 border-t border-slate-700" />
      <button
        type="button"
        onClick={handleDelete}
        className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-slate-800"
      >
        Удалить
      </button>
    </div>
  );
};

export default ContextMenu;
