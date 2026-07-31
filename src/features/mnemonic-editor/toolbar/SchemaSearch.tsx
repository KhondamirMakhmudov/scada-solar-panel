import { useEffect, useMemo, useRef, useState } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { SHAPE_REGISTRY } from "../shapes/registry";
import ShapeThumbnail from "./ShapeThumbnail";

const MAX_RESULTS = 8;

/**
 * Поиск по элементам текущей схемы (имя, вид, имя привязанного тега).
 * Выбор результата не только выделяет элемент, но и просит холст прокрутиться
 * к нему — на схеме 1920×1080 найденный элемент часто вне видимой области.
 */
const SchemaSearch = () => {
  const elements = useDocumentStore((state) => state.document.elements);
  const requestFocus = useUiStore((state) => state.requestFocus);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) return [];
    return elements
      .filter((element) => {
        const haystack = [
          element.label ?? "",
          SHAPE_REGISTRY[element.type]?.label ?? element.type,
          element.dataBinding?.tagName ?? "",
          ...(element.extraBindings ?? []).map((binding) => binding.tagName ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, MAX_RESULTS);
  }, [elements, normalized]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  // Ctrl/Cmd+F перехватывается на поиск по схеме — встроенный поиск браузера
  // по SVG-холсту всё равно бесполезен
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (elementId: string) => {
    requestFocus(elementId);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint text-xs pointer-events-none">
          ⌕
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              event.currentTarget.blur();
            }
            if (event.key === "Enter" && results.length > 0) handleSelect(results[0].id);
          }}
          placeholder="Поиск по схеме"
          className="w-56 h-8 pl-7 pr-2 rounded-[2px] bg-background-dark/60 border border-surface-border focus:border-blue-500/60 focus:outline-none text-xs text-text-primary placeholder:text-text-faint transition-colors"
        />
      </div>

      {isOpen && normalized.length > 0 && (
        <div className="absolute z-50 mt-1 w-72 rounded-[2px] border border-surface-border bg-surface-dark shadow-xl shadow-black/50 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-text-dim">Совпадений не найдено</p>
          ) : (
            results.map((element) => (
              <button
                key={element.id}
                type="button"
                onClick={() => handleSelect(element.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-500/10 text-left transition-colors"
              >
                <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-text-dim">
                  <ShapeThumbnail kind={element.type} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-text-primary truncate">
                    {element.label?.trim() || SHAPE_REGISTRY[element.type]?.label || element.type}
                  </span>
                  <span className="block text-[10px] text-text-faint truncate">
                    {element.dataBinding?.tagName ||
                      SHAPE_REGISTRY[element.type]?.label ||
                      element.type}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SchemaSearch;
