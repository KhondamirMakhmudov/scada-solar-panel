import { useEffect, useRef, useState } from "react";
import { BASIC_SHAPE_VARIANTS, basicShapePath } from "../shapes/basicShapes";
import type { BasicShapeVariant } from "../shapes/basicShapes";
import { SHAPE_REGISTRY } from "../shapes/registry";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { generateId } from "../lib/idGen";
import { DEFAULT_LAYER_ID } from "../document/defaults";
import { commitImmediate } from "../store/history/historyActions";

/** Кнопка «Фигуры» в шапке редактора: выпадающая сетка простых фигур
 * (как в Paint). Клик по фигуре добавляет её на холст и закрывает меню. */
const BasicShapesMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const addElement = useDocumentStore((state) => state.addElement);
  const elementCount = useDocumentStore((state) => state.document.elements.length);
  const select = useUiStore((state) => state.select);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleAdd = (variant: BasicShapeVariant) => {
    const definition = SHAPE_REGISTRY.basicShape;
    if (!definition) return;

    const count = elementCount;
    const id = generateId("basicShape");

    commitImmediate(() =>
      addElement({
        id,
        type: "basicShape",
        layerId: DEFAULT_LAYER_ID,
        x: 80 + (count % 5) * 160,
        y: 80 + Math.floor(count / 5) * 160,
        width: definition.defaultSize.width,
        height: definition.defaultSize.height,
        rotation: 0,
        zIndex: count,
        style: { ...definition.defaultStyle },
        state: { variant },
      }),
    );
    select(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Фигуры: треугольники, стрелки, звёзды и другие"
        className={`w-7 h-7 flex items-center justify-center rounded-[2px] text-sm transition-colors ${
          isOpen
            ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
            : "text-text-secondary border border-transparent hover:bg-background-dark"
        }`}
      >
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="M 8 1 L 15 14 H 1 Z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[180px] rounded-[2px] border border-surface-border bg-surface-dark p-2 shadow-xl">
          <p className="text-[10px] uppercase tracking-wide text-text-dim mb-1.5 px-0.5">
            Фигуры
          </p>
          <div className="grid grid-cols-4 gap-1">
            {BASIC_SHAPE_VARIANTS.map(({ variant, label }) => (
              <button
                key={variant}
                type="button"
                onClick={() => handleAdd(variant)}
                title={label}
                className="flex items-center justify-center h-9 rounded-[2px] border border-surface-border/70 bg-background-dark/60 hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors text-text-secondary hover:text-blue-300"
              >
                <svg width={24} height={20} viewBox="-2 -2 28 24">
                  <path
                    d={basicShapePath(variant, 24, 20)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicShapesMenu;
