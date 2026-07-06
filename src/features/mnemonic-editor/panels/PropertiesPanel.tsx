import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { commitImmediate } from "../store/history/historyActions";
import GeometrySection from "./sections/GeometrySection";
import StyleSection from "./sections/StyleSection";
import ShapeStateSection from "./sections/ShapeStateSection";
import BindingSection from "./sections/BindingSection";
import NavigationSection from "./sections/NavigationSection";
import TextField from "./fields/TextField";
import CanvasSettingsPanel from "./CanvasSettingsPanel";

interface PropertiesPanelProps {
  screenTagIds?: string[];
  screenId?: string;
}

/** Shown for a single selection — multi-select property editing is deferred alongside marquee-select. Falls back to document-level canvas settings when nothing is selected. */
const PropertiesPanel = ({ screenTagIds = [], screenId }: PropertiesPanelProps) => {
  const selectedElementIds = useUiStore((state) => state.selectedElementIds);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const elements = useDocumentStore((state) => state.document.elements);
  const updateElement = useDocumentStore((state) => state.updateElement);
  const removeElements = useDocumentStore((state) => state.removeElements);

  const selected = elements.filter((el) => selectedElementIds.includes(el.id));
  if (selected.length !== 1) return <CanvasSettingsPanel />;

  const element = selected[0];

  const handleDelete = () => {
    commitImmediate(() => removeElements([element.id]));
    clearSelection();
  };

  return (
    <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Свойства узла
        </p>
        <button
          type="button"
          onClick={clearSelection}
          className="text-slate-500 hover:text-slate-300 text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <TextField
        label="Название"
        value={element.label ?? ""}
        onChange={(v) => updateElement(element.id, { label: v })}
      />

      <GeometrySection element={element} />
      <StyleSection element={element} />
      <BindingSection element={element} screenTagIds={screenTagIds} />
      <NavigationSection element={element} currentScreenId={screenId} />
      <ShapeStateSection element={element} />

      <button
        type="button"
        onClick={handleDelete}
        className="w-full text-sm text-rose-400 border border-rose-900/50 hover:bg-rose-500/10 rounded-lg py-2 transition-colors"
      >
        Удалить элемент
      </button>
    </div>
  );
};

export default PropertiesPanel;
