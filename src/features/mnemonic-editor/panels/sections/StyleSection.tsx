import { useDocumentStore } from "../../store/documentStore";
import type { ElementStyle, MnemonicElement } from "../../types";
import NumberField from "../fields/NumberField";
import ColorField from "../fields/ColorField";

interface StyleSectionProps {
  element: MnemonicElement;
}

const StyleSection = ({ element }: StyleSectionProps) => {
  const updateElement = useDocumentStore((state) => state.updateElement);

  const updateStyle = (patch: Partial<ElementStyle>) =>
    updateElement(element.id, { style: { ...element.style, ...patch } });

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">Стиль</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <ColorField
          label="Заливка"
          value={element.style.fill}
          onChange={(v) => updateStyle({ fill: v })}
        />
        <ColorField
          label="Обводка"
          value={element.style.stroke}
          onChange={(v) => updateStyle({ stroke: v })}
        />
        <NumberField
          label="Толщина"
          value={element.style.strokeWidth}
          onChange={(v) => updateStyle({ strokeWidth: Math.max(0, v) })}
        />
        <NumberField
          label="Прозрачн."
          value={Math.round(element.style.opacity * 100)}
          onChange={(v) => updateStyle({ opacity: Math.min(1, Math.max(0, v / 100)) })}
        />
        <NumberField
          label="Шрифт подписи"
          value={element.style.labelFontSize ?? 11}
          onChange={(v) => updateStyle({ labelFontSize: Math.min(48, Math.max(6, v)) })}
        />
      </div>
    </div>
  );
};

export default StyleSection;
