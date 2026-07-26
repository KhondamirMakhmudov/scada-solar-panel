import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { SHAPE_REGISTRY } from "../shapes/registry";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { commitImmediate } from "../store/history/historyActions";
import { createShapeElement } from "../lib/createShapeElement";
import type { ShapeKind } from "../types";
import ShapeThumbnail from "./ShapeThumbnail";
import {
  SHAPE_CATEGORIES,
  SHAPE_DRAG_MIME,
  SHAPE_HINTS,
  SHAPE_SEARCH_ALIASES,
} from "./shapeCategories";

/** Категории, раскрытые при первом открытии редактора — самые частые на технологической схеме. */
const INITIALLY_OPEN = ["mechanical", "electrical"];

function matchesQuery(kind: ShapeKind, query: string): boolean {
  if (!query) return true;
  const haystack = [
    SHAPE_REGISTRY[kind]?.label ?? "",
    SHAPE_HINTS[kind] ?? "",
    ...(SHAPE_SEARCH_ALIASES[kind] ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * Палитра оборудования: категоризованный аккордеон с поиском, иконками-превью
 * и двумя способами размещения — клик (каскадная позиция по умолчанию) и
 * перетаскивание на холст (позиция под курсором, см. EditorCanvas.handleDrop).
 */
const ShapePalette = () => {
  const addElement = useDocumentStore((state) => state.addElement);
  const elementCount = useDocumentStore((state) => state.document.elements.length);
  const select = useUiStore((state) => state.select);
  const isCollapsed = useUiStore((state) => state.isPaletteCollapsed);
  const togglePalette = useUiStore((state) => state.togglePalette);

  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>(INITIALLY_OPEN);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleCategories = useMemo(
    () =>
      SHAPE_CATEGORIES.map((category) => ({
        ...category,
        kinds: category.kinds.filter(
          (kind) => SHAPE_REGISTRY[kind] && matchesQuery(kind, normalizedQuery),
        ),
      })).filter((category) => category.kinds.length > 0),
    [normalizedQuery],
  );

  const totalMatches = visibleCategories.reduce((sum, c) => sum + c.kinds.length, 0);

  const handleAdd = (kind: ShapeKind) => {
    const count = elementCount;
    const element = createShapeElement(
      kind,
      { x: 80 + (count % 5) * 160, y: 80 + Math.floor(count / 5) * 160 },
      count,
    );
    if (!element) return;

    commitImmediate(() => addElement(element));
    select(element.id);
  };

  const handleDragStart = (kind: ShapeKind) => (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(SHAPE_DRAG_MIME, kind);
    // text/plain — запасной канал: часть браузеров не отдаёт пользовательские
    // MIME-типы в dragover, где решается, показывать ли рамку сброса
    event.dataTransfer.setData("text/plain", kind);
    event.dataTransfer.effectAllowed = "copy";
  };

  if (isCollapsed) {
    return (
      <div className="w-11 flex-shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col items-center py-2 gap-1">
        <button
          type="button"
          onClick={togglePalette}
          title="Развернуть палитру оборудования"
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          »
        </button>
        <div className="w-6 h-px bg-slate-800 my-1" />
        <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1 w-full">
          {SHAPE_CATEGORIES.flatMap((category) => category.kinds).map((kind) => {
            const definition = SHAPE_REGISTRY[kind];
            if (!definition) return null;
            return (
              <button
                key={kind}
                type="button"
                draggable
                onDragStart={handleDragStart(kind)}
                onClick={() => handleAdd(kind)}
                title={definition.label}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md text-slate-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors"
              >
                <ShapeThumbnail kind={kind} size={20} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 flex-shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Оборудование</p>
        <button
          type="button"
          onClick={togglePalette}
          title="Свернуть палитру"
          className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
        >
          «
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск элемента"
            className="w-full h-8 pl-7 pr-2 rounded-md bg-slate-950/60 border border-slate-800 focus:border-blue-500/60 focus:outline-none text-xs text-slate-200 placeholder:text-slate-600 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {visibleCategories.map((category) => {
          // При активном поиске категории раскрыты принудительно: иначе
          // совпадения прячутся в свёрнутой группе и поиск выглядит сломанным
          const isOpen = Boolean(normalizedQuery) || openIds.includes(category.id);

          return (
            <div key={category.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenIds((ids) =>
                    ids.includes(category.id)
                      ? ids.filter((id) => id !== category.id)
                      : [...ids, category.id],
                  )
                }
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] uppercase tracking-wide text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors"
              >
                <span
                  className="text-[9px] text-slate-600 transition-transform duration-150"
                  style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                >
                  ▶
                </span>
                <span className="flex-1 text-left">{category.label}</span>
                <span className="text-[10px] text-slate-600 font-mono">
                  {category.kinds.length}
                </span>
              </button>

              {isOpen && (
                <div className="pl-1 pt-0.5 space-y-0.5">
                  {category.kinds.map((kind) => {
                    const definition = SHAPE_REGISTRY[kind];
                    if (!definition) return null;
                    return (
                      <button
                        key={kind}
                        type="button"
                        draggable
                        onDragStart={handleDragStart(kind)}
                        onClick={() => handleAdd(kind)}
                        title={SHAPE_HINTS[kind] ?? definition.label}
                        className="group w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-transparent hover:border-blue-500/40 hover:bg-blue-500/10 active:cursor-grabbing text-left transition-colors"
                      >
                        <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md bg-slate-950/50 border border-slate-800 text-slate-500 group-hover:border-blue-500/30 group-hover:text-blue-300 transition-colors">
                          <ShapeThumbnail kind={kind} size={22} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] leading-tight text-slate-200 truncate">
                            {definition.label}
                          </span>
                          {SHAPE_HINTS[kind] && (
                            <span className="block text-[10px] leading-tight text-slate-600 truncate">
                              {SHAPE_HINTS[kind]}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {totalMatches === 0 && (
          <p className="px-2 py-6 text-center text-[11px] text-slate-600">
            Ничего не найдено по запросу «{query.trim()}»
          </p>
        )}
      </div>

      <p className="px-3 py-2 border-t border-slate-800/80 text-[10px] leading-relaxed text-slate-600">
        Кликните по элементу или перетащите его на холст. Пробел + перетаскивание —
        панорамирование, колесо мыши — масштаб.
      </p>
    </div>
  );
};

export default ShapePalette;
