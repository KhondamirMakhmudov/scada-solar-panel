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
 *
 * `element.panelDisplay` (see PropertiesPanel → BindingSection) switches
 * this to a plain hidden state ("hidden") or a small single-value badge
 * overlapping the shape's corner ("compact") for dense screens — see the
 * early returns below. Default ("full") is the table described above.
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

  const panelDisplay = element.panelDisplay ?? "full";
  if (!bindings.length || panelDisplay === "hidden") return null;

  if (panelDisplay === "compact") {
    const row = buildRow(bindings[0], values[0], valueMaps.get(bindings[0].tagId));
    const value = truncate(row.value, 12);
    const fontSize = Math.max(8, (element.style?.labelFontSize ?? 11) - 2);
    const paddingX = 6;
    const charW = fontSize * 0.62;
    const width = value.length * charW + paddingX * 2;
    const height = fontSize + 8;
    // Overlaps the shape's own top-right corner — no shared slot needed
    // (see panelLayout.computePanelSlots skipping "compact"/"hidden").
    const x = element.x + element.width - width * 0.4;
    const y = element.y - height / 2;
    return (
      <g>
        <title>{`${row.name}: ${row.value}`}</title>
        <rect x={x} y={y} width={width} height={height} rx={height / 2} fill="#0b1220" fillOpacity={0.94} stroke={row.fill} strokeOpacity={0.7} strokeWidth={1} />
        <text x={x + width / 2} y={y + height / 2 + fontSize * 0.35} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill={row.fill}>
          {value}
        </text>
      </g>
    );
  }

  if (!slot) return null;

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
        const rowTop = panelY + paddingY + index * rowHeight;
        const rowY = rowTop + rowHeight / 2 + fontSize * 0.35;
        // Имя обрезаем только если оно реально не помещается рядом со значением
        const nameSpace =
          panelWidth - paddingX * 2 - columnGap - row.value.length * monoCharW;
        const nameMaxChars = Math.max(6, Math.floor(nameSpace / (fontSize * 0.62)));
        const liveTime = values[index]?.time;
        return (
          <g key={bindings[index].tagId}>
            <title>{`${row.name}: ${row.value}`}</title>
            {/* Remounted (via key) on every new tag timestamp so the CSS
                animation restarts — a quick highlight so an operator
                watching the screen notices *this* row just updated,
                without a permanent blinking distraction. */}
            {liveTime && (
              <rect
                key={`flash-${bindings[index].tagId}-${liveTime}`}
                x={panelX + 1}
                y={rowTop}
                width={panelWidth - 2}
                height={rowHeight}
                fill={row.fill}
                className="mnemonic-value-flash"
                pointerEvents="none"
              />
            )}
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
