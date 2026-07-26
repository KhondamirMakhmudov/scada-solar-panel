import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useRuntimeStore } from "../store/runtimeStore";
import { commitImmediate } from "../store/history/historyActions";
import { deriveLiveStatus, LIVE_STATUS_COLORS } from "../runtime/resolveVisual";
import { SHAPE_REGISTRY } from "../shapes/registry";
import ShapeThumbnail from "../toolbar/ShapeThumbnail";
import GeometrySection from "./sections/GeometrySection";
import StyleSection from "./sections/StyleSection";
import ShapeStateSection, { hasEditableShapeState } from "./sections/ShapeStateSection";
import BindingSection from "./sections/BindingSection";
import NavigationSection from "./sections/NavigationSection";
import TextField from "./fields/TextField";
import PropertyGroup from "./PropertyGroup";
import CanvasSettingsPanel from "./CanvasSettingsPanel";

interface PropertiesPanelProps {
  screenTagIds?: string[];
  screenId?: string;
}

const STATUS_LABELS: Record<string, string> = {
  ok: "В работе",
  fault: "Авария",
  stopped: "Останов",
  unknown: "Нет данных",
};

/**
 * Правая панель редактора, контекстная по состоянию выбора:
 *   • элемент выбран — полный инспектор свойств;
 *   • ничего не выбрано и панель закреплена — настройки холста;
 *   • ничего не выбрано — узкая полоса, отдающая ширину холсту.
 *
 * Раньше панель занимала 288 px всегда, в том числе показывая настройки
 * холста во время компоновки, когда они не нужны.
 *
 * Редактирование нескольких элементов сразу отложено вместе с рамочным
 * выделением, поэтому инспектор показывается только для одиночного выбора.
 */
const PropertiesPanel = ({ screenTagIds = [], screenId }: PropertiesPanelProps) => {
  const selectedElementIds = useUiStore((state) => state.selectedElementIds);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const isPinned = useUiStore((state) => state.isInspectorPinned);
  const togglePinned = useUiStore((state) => state.toggleInspectorPinned);
  const elements = useDocumentStore((state) => state.document.elements);
  const updateElement = useDocumentStore((state) => state.updateElement);
  const removeElements = useDocumentStore((state) => state.removeElements);
  const values = useRuntimeStore((state) => state.values);
  const connectionStatus = useRuntimeStore((state) => state.connectionStatus);

  const selected = elements.filter((el) => selectedElementIds.includes(el.id));

  if (selected.length !== 1) {
    if (isPinned) {
      return (
        <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 flex flex-col">
          <div className="flex items-center justify-between px-3 pt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Настройки холста
            </p>
            <button
              type="button"
              onClick={togglePinned}
              title="Свернуть панель"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            >
              »
            </button>
          </div>
          <CanvasSettingsPanel />
        </div>
      );
    }

    return (
      <div className="w-11 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 flex flex-col items-center py-2 gap-2">
        <button
          type="button"
          onClick={togglePinned}
          title="Настройки холста"
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          «
        </button>
        <p
          className="text-[10px] text-slate-600 tracking-wide"
          style={{ writingMode: "vertical-rl" }}
        >
          Выберите элемент
        </p>
      </div>
    );
  }

  const element = selected[0];
  const definition = SHAPE_REGISTRY[element.type];
  const live = element.dataBinding?.tagId ? values[element.dataBinding.tagId] : undefined;
  const status = deriveLiveStatus(element, live, connectionStatus);

  const handleDelete = () => {
    commitImmediate(() => removeElements([element.id]));
    clearSelection();
  };

  return (
    // key по id: при переключении элемента инспектор пересобирается, сбрасывая
    // локальное состояние раскрытия групп к значениям по умолчанию
    <div
      key={element.id}
      className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 flex flex-col"
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-800/70">
        <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md bg-slate-950/50 border border-slate-800 text-slate-400">
          <ShapeThumbnail kind={element.type} size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-slate-100 truncate leading-tight">
            {element.label?.trim() || definition?.label || element.type}
          </span>
          <span className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-slate-600 truncate">
              {definition?.label ?? element.type}
            </span>
            {status && (
              <>
                <span className="text-slate-700 text-[10px]">·</span>
                <span
                  className="flex items-center gap-1 text-[10px]"
                  style={{ color: LIVE_STATUS_COLORS[status] }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: LIVE_STATUS_COLORS[status] }}
                  />
                  {STATUS_LABELS[status]}
                </span>
              </>
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={clearSelection}
          title="Снять выделение"
          className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-slate-300 text-sm leading-none transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <TextField
          label="Название"
          value={element.label ?? ""}
          onChange={(v) => updateElement(element.id, { label: v })}
        />

        <PropertyGroup
          title="Привязка к тегу"
          badge={element.dataBinding?.tagName ?? (element.dataBinding ? "привязан" : "нет")}
        >
          <BindingSection element={element} screenTagIds={screenTagIds} />
        </PropertyGroup>

        {hasEditableShapeState(element.type) && (
          <PropertyGroup title="Состояние">
            <ShapeStateSection element={element} />
          </PropertyGroup>
        )}

        <PropertyGroup
          title="Геометрия"
          defaultOpen={false}
          badge={`${Math.round(element.width)}×${Math.round(element.height)}`}
        >
          <GeometrySection element={element} />
        </PropertyGroup>

        <PropertyGroup title="Стиль" defaultOpen={false}>
          <StyleSection element={element} />
        </PropertyGroup>

        <PropertyGroup
          title="Переход по клику"
          defaultOpen={false}
          badge={element.navigateToScreenId ? "задан" : "нет"}
        >
          <NavigationSection element={element} currentScreenId={screenId} />
        </PropertyGroup>
      </div>

      <div className="p-2.5 border-t border-slate-800/70">
        <button
          type="button"
          onClick={handleDelete}
          className="w-full text-sm text-rose-400 border border-rose-900/50 hover:bg-rose-500/10 rounded-lg py-2 transition-colors"
        >
          Удалить элемент
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
