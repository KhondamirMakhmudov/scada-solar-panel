import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { SHAPE_REGISTRY } from "../shapes/registry";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { commitImmediate } from "../store/history/historyActions";
import { createShapeElement } from "../lib/createShapeElement";
import type { ShapeKind } from "../types";
import { WORKSPACE_LABELS, getWorkspaceVisibility, workspaceOfKind } from "../lib/workspace";
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

  const workspace = useUiStore((state) => state.workspace);
  const requestFocus = useUiStore((state) => state.requestFocus);
  const elements = useDocumentStore((state) => state.document.elements);

  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>(INITIALLY_OPEN);

  const normalizedQuery = query.trim().toLowerCase();
  // В «Трендах»/«Таблицах» палитра — это один короткий список виджетов, его
  // не нужно сворачивать в аккордеон
  const isDataWorkspace = workspace === "trends" || workspace === "tables";

  // Палитра следует за рабочей областью: в «Схеме» нет графиков и таблиц, в
  // «Трендах»/«Таблицах» — только соответствующий виджет. Иначе эксперт
  // ищет нужное среди фигур, которые в этой области всё равно скрыты.
  const availableCategories = useMemo(
    () =>
      SHAPE_CATEGORIES.map((category) => ({
        ...category,
        label: isDataWorkspace ? WORKSPACE_LABELS[workspace] : category.label,
        kinds: category.kinds.filter(
          (kind) => getWorkspaceVisibility(kind, workspace) === "active",
        ),
      })).filter((category) => category.kinds.length > 0),
    [workspace, isDataWorkspace],
  );

  const visibleCategories = useMemo(
    () =>
      availableCategories
        .map((category) => ({
          ...category,
          kinds: category.kinds.filter(
            (kind) => SHAPE_REGISTRY[kind] && matchesQuery(kind, normalizedQuery),
          ),
        }))
        .filter((category) => category.kinds.length > 0),
    [availableCategories, normalizedQuery],
  );

  // Уже созданные виджеты области — для быстрого перехода к ним на холсте
  const existingWidgets = useMemo(
    () => (isDataWorkspace ? elements.filter((el) => workspaceOfKind(el.type) === workspace) : []),
    [elements, workspace, isDataWorkspace],
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
      <div className="w-11 flex-shrink-0 border-r border-surface-border bg-surface-dark/40 flex flex-col items-center py-2 gap-1">
        <button
          type="button"
          onClick={togglePalette}
          title="Развернуть палитру оборудования"
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-text-muted hover:bg-background-dark hover:text-text-primary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
        >
          »
        </button>
        <div className="w-6 h-px bg-background-dark my-1" />
        <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1 w-full">
          {availableCategories.flatMap((category) => category.kinds).map((kind) => {
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
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-[8px] text-text-muted hover:bg-blue-500/10 hover:text-blue-300 transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
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
    <div className="w-60 flex-shrink-0 border-r border-surface-border bg-surface-dark/40 flex flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <p className="text-[13px] uppercase tracking-wide text-text-dim">
          {isDataWorkspace ? "Виджеты данных" : "Оборудование"}
        </p>
        <button
          type="button"
          onClick={togglePalette}
          title="Свернуть палитру"
          className="w-6 h-6 flex items-center justify-center rounded-[8px] text-text-dim hover:bg-background-dark hover:text-text-secondary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
        >
          «
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint text-xs">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск элемента"
            className="w-full h-8 pl-7 pr-2 rounded-[8px] bg-background-dark/60 border border-surface-border focus:border-blue-500/60 focus:outline-none text-xs text-text-primary placeholder:text-text-faint transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {visibleCategories.map((category) => {
          // При активном поиске категории раскрыты принудительно: иначе
          // совпадения прячутся в свёрнутой группе и поиск выглядит сломанным
          const isOpen =
            Boolean(normalizedQuery) || isDataWorkspace || openIds.includes(category.id);

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
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[8px] text-[13px] uppercase tracking-wide text-text-muted hover:bg-background-dark/60 hover:text-text-primary transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
              >
                <span
                  className="text-[11.5px] text-text-faint transition-transform duration-150"
                  style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                >
                  ▶
                </span>
                <span className="flex-1 text-left">{category.label}</span>
                <span className="text-[12.5px] text-text-faint font-ibmPlexMono">
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
                        className="group w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] border border-transparent hover:border-blue-500/40 hover:bg-blue-500/10 active:cursor-grabbing active:scale-[0.98] text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
                      >
                        <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-[8px] bg-background-dark/50 border border-surface-border text-text-dim group-hover:border-blue-500/30 group-hover:text-blue-300 transition-colors">
                          <ShapeThumbnail kind={kind} size={22} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] leading-tight text-text-primary truncate">
                            {definition.label}
                          </span>
                          {SHAPE_HINTS[kind] && (
                            <span className="block text-[12.5px] leading-tight text-text-faint truncate">
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
          <p className="px-2 py-6 text-center text-[13px] text-text-faint">
            Ничего не найдено по запросу «{query.trim()}»
          </p>
        )}

        {isDataWorkspace && (
          <div className="pt-2">
            <p className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] uppercase tracking-wide text-text-muted">
              <span className="flex-1">На экране</span>
              <span className="text-[12.5px] text-text-faint font-ibmPlexMono">
                {existingWidgets.length}
              </span>
            </p>
            {existingWidgets.length === 0 ? (
              <p className="px-2 py-2 text-[13px] text-text-faint">
                Пока пусто — добавьте виджет из списка выше.
              </p>
            ) : (
              <div className="pl-1 space-y-0.5">
                {existingWidgets.map((widget, index) => (
                  <button
                    key={widget.id}
                    type="button"
                    onClick={() => requestFocus(widget.id)}
                    title="Показать на холсте"
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] border border-transparent hover:border-blue-500/40 hover:bg-blue-500/10 active:scale-[0.98] text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
                  >
                    <ShapeThumbnail kind={widget.type} size={16} />
                    <span className="min-w-0 flex-1 text-[14px] text-text-primary truncate">
                      {widget.label || `${SHAPE_REGISTRY[widget.type]?.label ?? widget.type} ${index + 1}`}
                    </span>
                    <span className="text-[12.5px] text-text-faint font-ibmPlexMono">
                      {widget.dataBinding?.tagId ? "тег" : "без тега"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="px-3 py-2 border-t border-surface-border/80 text-[12.5px] leading-relaxed text-text-faint">
        Кликните по элементу или перетащите его на холст. Пробел + перетаскивание —
        панорамирование, колесо мыши — масштаб.
      </p>
    </div>
  );
};

export default ShapePalette;
