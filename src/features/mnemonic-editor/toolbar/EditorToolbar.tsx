import type { ReactNode } from "react";
import { useUiStore } from "../store/uiStore";
import type { GridStyle } from "../store/uiStore";
import { useHistoryStore } from "../store/history/historyStore";
import { clampZoom } from "../lib/geometry";
import ConnectionStatusBadge from "../runtime/ConnectionStatusBadge";
import BasicShapesMenu from "./BasicShapesMenu";
import AlarmSummary from "./AlarmSummary";
import HistoryTimeline from "./HistoryTimeline";
import SchemaSearch from "./SchemaSearch";
import UserChip from "./UserChip";

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

const GRID_STYLE_OPTIONS: { value: GridStyle; glyph: string; title: string }[] = [
  { value: "dots", glyph: "⋯", title: "Сетка точками" },
  { value: "lines", glyph: "#", title: "Сетка линиями" },
  { value: "none", glyph: "∅", title: "Без сетки" },
];

const ZOOM_STEP = 0.15;

const Divider = () => <div className="h-4 w-px bg-slate-800 flex-shrink-0" />;

/**
 * Шапка редактора в два яруса вместо одной перегруженной строки:
 *   • верхний — навигация, идентификация схемы и необратимые действия
 *     (сохранение, предпросмотр), то есть «что это и что я с этим делаю»;
 *   • нижний — рабочие инструменты и живое состояние схемы, то есть «чем я
 *     работаю и что сейчас происходит».
 *
 * Разделение позволяет держать счётчики аварий на постоянном месте: раньше
 * они конкурировали за строку с кнопками сохранения и вытеснялись длинным
 * названием экрана.
 */
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
  const setViewport = useUiStore((state) => state.setViewport);
  const activeTool = useUiStore((state) => state.activeTool);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const gridStyle = useUiStore((state) => state.gridStyle);
  const setGridStyle = useUiStore((state) => state.setGridStyle);
  const snapToGrid = useUiStore((state) => state.snapToGrid);
  const toggleSnapToGrid = useUiStore((state) => state.toggleSnapToGrid);
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

  const stepZoom = (direction: 1 | -1) =>
    setViewport({ zoom: clampZoom(zoom + direction * ZOOM_STEP) });

  return (
    <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/60">
      {/* Ярус 1 — навигация, идентификация, действия над схемой */}
      <div className="flex items-center gap-3 px-4 h-12">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="text-base leading-none">←</span> Назад
        </button>

        <Divider />

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-100 truncate max-w-[18rem]">
            {title}
          </span>
          {isDirty ? (
            <span className="flex-shrink-0 flex items-center gap-1 h-5 px-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-300">
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              не сохранено
            </span>
          ) : (
            <span className="flex-shrink-0 h-5 px-1.5 rounded border border-slate-800 text-[10px] text-slate-600 leading-5">
              сохранено
            </span>
          )}
        </div>

        <div className="flex-1" />

        <SchemaSearch />
        <UserChip />

        <Divider />

        {rightSlot}
        <button
          type="button"
          onClick={onPreview}
          disabled={isPreviewing}
          title="Сохранить и открыть в новой вкладке"
          className="h-8 flex items-center gap-2 border border-slate-700 hover:border-slate-500 disabled:opacity-60 text-slate-200 text-sm font-medium px-3 rounded-lg transition-colors"
        >
          {isPreviewing ? "Открытие..." : "Предпросмотр ↗"}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="h-8 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium px-4 rounded-lg transition-colors"
        >
          {isSaving ? "Сохранение..." : "Сохранить схему"}
        </button>
      </div>

      {/* Ярус 2 — инструменты слева, живое состояние схемы справа */}
      <div className="flex items-center gap-2.5 px-4 h-9 border-t border-slate-800/70 bg-slate-950/30">
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

        <Divider />

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
          <HistoryTimeline />
        </div>

        <Divider />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => stepZoom(-1)}
            title="Уменьшить"
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setViewport({ zoom: 1, panX: 0, panY: 0 })}
            title="Сбросить масштаб и положение (100 %)"
            className="w-12 h-6 rounded text-[11px] text-slate-400 font-mono tabular-nums hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => stepZoom(1)}
            title="Увеличить"
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            +
          </button>
        </div>

        <Divider />

        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border border-slate-800 overflow-hidden">
            {GRID_STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGridStyle(option.value)}
                title={option.title}
                className={`w-6 h-6 text-[11px] leading-none transition-colors ${
                  gridStyle === option.value
                    ? "bg-blue-500/20 text-blue-300"
                    : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                {option.glyph}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleSnapToGrid}
            title="Привязка к сетке при перемещении и изменении размера"
            className={`h-6 px-2 rounded-md border text-[11px] transition-colors ${
              snapToGrid
                ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                : "border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
            }`}
          >
            привязка
          </button>
        </div>

        <div className="flex-1" />

        <AlarmSummary />
        <Divider />
        <ConnectionStatusBadge />
      </div>
    </header>
  );
};

export default EditorToolbar;
