import { useRef } from "react";
import toast from "react-hot-toast";
import { useDocumentStore } from "../store/documentStore";
import { readImageFile } from "../lib/imageFile";
import ColorField from "./fields/ColorField";
import NumberField from "./fields/NumberField";

/** Shown in the properties-panel slot when nothing is selected — document-level settings instead of an element's. */
const CanvasSettingsPanel = () => {
  const background = useDocumentStore((state) => state.document.background);
  const canvasSize = useDocumentStore((state) => state.document.canvasSize);
  const gridSize = useDocumentStore((state) => state.document.gridSize);
  const updateDocumentMeta = useDocumentStore((state) => state.updateDocumentMeta);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const { src } = await readImageFile(file);
      updateDocumentMeta({ background: { ...background, imageUrl: src } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки изображения");
    }
  };

  const handleRemoveBackgroundImage = () => {
    updateDocumentMeta({ background: { ...background, imageUrl: null } });
  };

  return (
    <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto space-y-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        Настройки холста
      </p>

      <div className="space-y-2">
        <ColorField
          label="Цвет фона"
          value={background.color}
          onChange={(v) => updateDocumentMeta({ background: { ...background, color: v } })}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBackgroundImageChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-sm text-slate-200 hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors"
        >
          {background.imageUrl ? "Заменить фоновое изображение" : "Загрузить фоновое изображение"}
        </button>
        {background.imageUrl && (
          <button
            type="button"
            onClick={handleRemoveBackgroundImage}
            className="w-full text-xs text-rose-400 hover:text-rose-300"
          >
            Убрать фоновое изображение
          </button>
        )}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
          Размер холста
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <NumberField
            label="Ширина"
            value={canvasSize.width}
            onChange={(v) => updateDocumentMeta({ canvasSize: { ...canvasSize, width: v } })}
          />
          <NumberField
            label="Высота"
            value={canvasSize.height}
            onChange={(v) => updateDocumentMeta({ canvasSize: { ...canvasSize, height: v } })}
          />
          <NumberField
            label="Сетка"
            value={gridSize}
            onChange={(v) => updateDocumentMeta({ gridSize: Math.max(4, v) })}
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-600">
        Выберите элемент на схеме, чтобы редактировать его свойства.
      </p>
    </div>
  );
};

export default CanvasSettingsPanel;
