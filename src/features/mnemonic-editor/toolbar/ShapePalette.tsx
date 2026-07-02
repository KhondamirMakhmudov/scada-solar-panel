import { AVAILABLE_SHAPE_KINDS, SHAPE_REGISTRY } from "../shapes/registry";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { generateId } from "../lib/idGen";
import { DEFAULT_LAYER_ID } from "../document/defaults";
import { commitImmediate } from "../store/history/historyActions";

/** Click-to-add: places a new element at a cascading default position, matching the click-to-add UX of the earlier React Flow prototype. Drag-and-drop placement is not in scope for this slice. */
const ShapePalette = () => {
  const addElement = useDocumentStore((state) => state.addElement);
  const elementCount = useDocumentStore((state) => state.document.elements.length);
  const select = useUiStore((state) => state.select);

  const handleAdd = (kind: (typeof AVAILABLE_SHAPE_KINDS)[number]) => {
    const definition = SHAPE_REGISTRY[kind];
    if (!definition) return;

    const count = elementCount;
    const id = generateId(kind);

    commitImmediate(() =>
      addElement({
        id,
        type: kind,
        layerId: DEFAULT_LAYER_ID,
        x: 80 + (count % 5) * 160,
        y: 80 + Math.floor(count / 5) * 160,
        width: definition.defaultSize.width,
        height: definition.defaultSize.height,
        rotation: 0,
        zIndex: count,
        style: { ...definition.defaultStyle },
        state: { ...definition.defaultState },
        label: definition.label,
      }),
    );
    select(id);
  };

  return (
    <div className="w-56 flex-shrink-0 border-r border-slate-800 bg-slate-900/40 p-3 overflow-y-auto">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
        Оборудование
      </p>
      <div className="space-y-1.5">
        {AVAILABLE_SHAPE_KINDS.map((kind) => {
          const definition = SHAPE_REGISTRY[kind];
          if (!definition) return null;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => handleAdd(kind)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/60 hover:border-blue-500/50 hover:bg-blue-500/10 text-left transition-colors text-sm text-slate-200"
            >
              {definition.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-600 mt-3">
        Нажмите на элемент, чтобы добавить его на схему. Пробел + перетаскивание
        для панорамирования, колесо мыши для масштаба.
      </p>
    </div>
  );
};

export default ShapePalette;
