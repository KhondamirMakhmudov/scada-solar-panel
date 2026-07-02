import { useDocumentStore } from "../../store/documentStore";
import type { MnemonicElement } from "../../types";
import NumberField from "../fields/NumberField";

interface GeometrySectionProps {
  element: MnemonicElement;
}

const GeometrySection = ({ element }: GeometrySectionProps) => {
  const updateElement = useDocumentStore((state) => state.updateElement);

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">Геометрия</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <NumberField
          label="X"
          value={Math.round(element.x)}
          onChange={(v) => updateElement(element.id, { x: v })}
        />
        <NumberField
          label="Y"
          value={Math.round(element.y)}
          onChange={(v) => updateElement(element.id, { y: v })}
        />
        <NumberField
          label="Ширина"
          value={Math.round(element.width)}
          onChange={(v) => updateElement(element.id, { width: Math.max(4, v) })}
        />
        <NumberField
          label="Высота"
          value={Math.round(element.height)}
          onChange={(v) => updateElement(element.id, { height: Math.max(4, v) })}
        />
        <NumberField
          label="Поворот"
          value={Math.round(element.rotation)}
          step={5}
          onChange={(v) => updateElement(element.id, { rotation: v })}
        />
      </div>
    </div>
  );
};

export default GeometrySection;
