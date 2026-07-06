import { shallow } from "zustand/shallow";
import { formatTagLabel } from "@/lib/tagNameTranslation";
import type { MnemonicElement, DataBinding } from "../types";
import type { TagValue } from "../store/runtimeStore";
import { useRuntimeStore } from "../store/runtimeStore";

interface LiveValueLabelProps {
  element: MnemonicElement;
}

const MAX_CHARS = 28;

/** SVG <text> doesn't wrap like HTML — long diagnostic error messages must be truncated or they run off-screen in one line. Full text is still available via the native <title> hover tooltip. */
function truncate(text: string, max = MAX_CHARS): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatRow(live: TagValue | undefined): { text: string; fill: string; mono: boolean } {
  if (!live) return { text: "ожидание...", fill: "#64748b", mono: false };
  if (live.isError) {
    return { text: live.errorMessage || "ошибка", fill: "#f87171", mono: false };
  }
  return {
    text: `${live.value ?? "—"}${live.unit ? ` ${live.unit}` : ""}`,
    fill: "#e2e8f0",
    mono: true,
  };
}

/** Краткое имя тега для префикса строки, когда тегов несколько */
function shortTagName(binding: DataBinding): string {
  if (!binding.tagName) return "";
  const label = formatTagLabel(binding.tagName);
  // formatTagLabel даёт «Перевод (raw_name)» — префиксом берём только перевод
  return label.replace(/\s*\(.*\)\s*$/, "");
}

/**
 * Живые значения под фигурой: одна строка на каждый привязанный тег
 * (основной + дополнительные). Подписывается ровно на значения своих тегов
 * (кортеж + shallow), поэтому тик чужого тега не вызывает ре-рендер.
 */
const LiveValueLabel = ({ element }: LiveValueLabelProps) => {
  const bindings: DataBinding[] = [
    ...(element.dataBinding?.tagId ? [element.dataBinding] : []),
    ...(element.extraBindings ?? []).filter((binding) => binding?.tagId),
  ];

  const values = useRuntimeStore(
    (state) => bindings.map((binding) => state.values[binding.tagId]),
    shallow,
  );

  if (!bindings.length) return null;

  const labelFontSize = element.style?.labelFontSize ?? 11;
  const fontSize = Math.max(8, labelFontSize - 1);
  const lineHeight = fontSize + 5;
  const x = element.x + element.width / 2;
  const baseY = element.y + element.height + 15 + labelFontSize;
  const multi = bindings.length > 1;

  return (
    <>
      {bindings.map((binding, index) => {
        const row = formatRow(values[index]);
        const prefix = multi ? shortTagName(binding) : "";
        const text = prefix ? `${prefix}: ${row.text}` : row.text;
        return (
          <text
            key={binding.tagId}
            x={x}
            y={baseY + index * lineHeight}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily={row.mono ? "monospace" : undefined}
            fill={row.fill}
          >
            <title>{text}</title>
            {truncate(text)}
          </text>
        );
      })}
    </>
  );
};

export default LiveValueLabel;
