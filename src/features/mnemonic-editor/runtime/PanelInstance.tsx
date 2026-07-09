import { shallow } from "zustand/shallow";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import type { MnemonicElement, DataBinding } from "../types";
import type { TagValue } from "../store/runtimeStore";
import { useRuntimeStore } from "../store/runtimeStore";
import type { PanelSlot } from "../lib/panelLayout";
import { useTagValueMaps } from "../hooks/useTagValueMaps";

interface PanelInstanceProps {
  element: MnemonicElement;
  /** Pre-computed, non-overlapping rect from computePanelSlots — undefined means "no slot for this element" (e.g. chart elements, which render their own in-box legend instead). */
  slot: PanelSlot | undefined;
}

const MAX_CHARS = 30;

/** SVG <text> doesn't wrap like HTML — long diagnostic error messages must be truncated or they run off-screen in one line. Full text is still available via the native <title> hover tooltip. */
function truncate(text: string, max = MAX_CHARS): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Числовые значения приводим к читаемому виду: максимум 2 знака после
 * запятой, разделители тысяч — вместо сырых «69.60000000000001» с бэкенда. */
function formatValue(value: unknown): string {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))
        ? Number(value)
        : null;
  if (num === null) return String(value ?? "—");
  return num.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

interface Row {
  name: string;
  value: string;
  fill: string;
  isError: boolean;
}

function buildRow(binding: DataBinding, live: TagValue | undefined, valueMap: Record<string, string> | undefined): Row {
  const name = binding.tagName ? formatTagLabelShort(binding.tagName) : binding.tagId.slice(0, 8);

  if (!live) return { name, value: "—", fill: "#64748b", isError: false };
  if (live.isError) {
    return { name, value: live.errorMessage || "ошибка", fill: "#f87171", isError: true };
  }

  // Enum-style tags (e.g. status codes) get a backend-configured value_map —
  // show the label ("Fault") instead of the raw code ("3") when the current
  // value has a mapped entry.
  const mappedLabel = valueMap ? valueMap[String(live.value)] : undefined;
  if (mappedLabel !== undefined) {
    return { name, value: mappedLabel, fill: "#4ade80", isError: false };
  }

  return {
    name,
    value: `${formatValue(live.value)}${live.unit ? ` ${live.unit}` : ""}`,
    fill: "#4ade80",
    isError: false,
  };
}

/**
 * Панель показаний под фигурой в стиле промышленных HMI: тёмная табличка,
 * имя тега слева, значение справа зелёным моноширинным. Подписывается ровно
 * на значения своих тегов (кортеж + shallow) — тик чужого тега не вызывает
 * ре-рендер.
 *
 * Position/size come from the `slot` prop (computePanelSlots), not
 * self-computed — a single top-level layer (PanelLayer) lays out every
 * element's panel together so none overlap. The border tints to the node's
 * own stroke color so panel and node visually read as one group.
 */
const PanelInstance = ({ element, slot }: PanelInstanceProps) => {
  const bindings: DataBinding[] = [
    ...(element.dataBinding?.tagId ? [element.dataBinding] : []),
    ...(element.extraBindings ?? []).filter((binding) => binding?.tagId),
  ];

  const values = useRuntimeStore(
    (state) => bindings.map((binding) => state.values[binding.tagId]),
    shallow,
  );
  const valueMaps = useTagValueMaps();

  if (!bindings.length || !slot) return null;

  const labelFontSize = element.style?.labelFontSize ?? 11;
  const fontSize = Math.max(8, labelFontSize - 1);
  const paddingX = 8;
  const paddingY = 6;
  const columnGap = 16;
  const monoCharW = fontSize * 0.64;

  const rows = bindings.map((binding, index) => {
    const row = buildRow(binding, values[index], valueMaps.get(binding.tagId));
    return { ...row, value: truncate(row.value, row.isError ? 24 : 16) };
  });

  const { x: panelX, y: panelY, width: panelWidth, height: panelHeight } = slot;
  const rowHeight = (panelHeight - paddingY * 2) / Math.max(1, rows.length);

  return (
    <g>
      <rect
        x={panelX}
        y={panelY}
        width={panelWidth}
        height={panelHeight}
        rx={6}
        fill="#0b1220"
        fillOpacity={0.92}
        stroke={element.style?.stroke || "#1e293b"}
        strokeOpacity={0.6}
        strokeWidth={1}
      />
      {rows.map((row, index) => {
        const rowY = panelY + paddingY + (index + 0.5) * rowHeight + fontSize * 0.35;
        // Имя обрезаем только если оно реально не помещается рядом со значением
        const nameSpace =
          panelWidth - paddingX * 2 - columnGap - row.value.length * monoCharW;
        const nameMaxChars = Math.max(6, Math.floor(nameSpace / (fontSize * 0.62)));
        return (
          <g key={bindings[index].tagId}>
            <title>{`${row.name}: ${row.value}`}</title>
            <text
              x={panelX + paddingX}
              y={rowY}
              textAnchor="start"
              fontSize={fontSize}
              fill="#94a3b8"
            >
              {truncate(row.name, nameMaxChars)}
            </text>
            <text
              x={panelX + panelWidth - paddingX}
              y={rowY}
              textAnchor="end"
              fontSize={fontSize}
              fontFamily="monospace"
              fill={row.fill}
            >
              {row.value}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export default PanelInstance;
