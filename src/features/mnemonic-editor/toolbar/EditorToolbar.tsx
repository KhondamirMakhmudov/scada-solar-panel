import type { ReactNode } from "react";
import { useUiStore } from "../store/uiStore";
import { useHistoryStore } from "../store/history/historyStore";
import ConnectionStatusBadge from "../runtime/ConnectionStatusBadge";
import BasicShapesMenu from "./BasicShapesMenu";

interface EditorToolbarProps {
  title: string;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  isDirty: boolean;
  onPreview: () => void;
  isPreviewing: boolean;
  rightSlot?: ReactNode;
}

const EditorToolbar = ({
  title,
  onBack,
  onSave,
  isSaving,
  isDirty,
  onPreview,
  isPreviewing,
  rightSlot,
}: EditorToolbarProps) => {
  const zoom = useUiStore((state) => state.viewport.zoom);
  const activeTool = useUiStore((state) => state.activeTool);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);

  const toolButtonClass = (tool: string) =>
    `w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors ${
      activeTool === tool
        ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
        : "text-slate-300 border border-transparent hover:bg-slate-800"
    }`;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Назад
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        <div className="h-4 w-px bg-slate-700" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Отменить (Ctrl+Z)"
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Повторить (Ctrl+Y)"
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↷
          </button>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTool("select")}
            title="Указатель: выбор и перемещение элементов"
            className={toolButtonClass("select")}
          >
            ➤
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("draw")}
            title="Кисть: рисование произвольных фигур мышью"
            className={toolButtonClass("draw")}
          >
            ✎
          </button>
          <BasicShapesMenu />
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <span className="text-xs text-slate-500 font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <div className="h-4 w-px bg-slate-700" />
        <ConnectionStatusBadge />
        {isDirty && (
          <span className="text-xs text-amber-400">не сохранено</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {rightSlot}
        <button
          type="button"
          onClick={onPreview}
          disabled={isPreviewing}
          title="Сохранить и открыть в новой вкладке"
          className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 disabled:opacity-60 text-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isPreviewing ? "Открытие..." : "Предпросмотр ↗"}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isSaving ? "Сохранение..." : "Сохранить схему"}
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
