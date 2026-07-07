import { shallow } from "zustand/shallow";
import { formatTagLabel } from "@/lib/tagNameTranslation";
import type { MnemonicElement, DataBinding } from "../types";
import type { TagValue } from "../store/runtimeStore";
import { useRuntimeStore } from "../store/runtimeStore";

interface LiveValueLabelProps {
  element: MnemonicElement;
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

function buildRow(binding: DataBinding, live: TagValue | undefined): Row {
  const name = binding.tagName
    ? formatTagLabel(binding.tagName).replace(/\s*\(.*\)\s*$/, "")
    : binding.tagId.slice(0, 8);

  if (!live) return { name, value: "—", fill: "#64748b", isError: false };
  if (live.isError) {
    return { name, value: live.errorMessage || "ошибка", fill: "#f87171", isError: true };
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
  const rowHeight = fontSize + 7;
  const paddingX = 8;
  const paddingY = 6;
  const columnGap = 16;

  // SVG не умеет layout — оцениваем ширину текста по числу символов.
  // Кириллица в Manrope шире латиницы, берём с запасом.
  const nameCharW = fontSize * 0.62;
  const monoCharW = fontSize * 0.64;

  const rows = bindings.map((binding, index) => {
    const row = buildRow(binding, values[index]);
    return { ...row, value: truncate(row.value, row.isError ? 24 : 16) };
  });

  // Ширина панели — по самой длинной строке «имя + зазор + значение»
  const contentWidth = Math.max(
    ...rows.map(
      (row) => row.name.length * nameCharW + columnGap + row.value.length * monoCharW,
    ),
  );
  const panelWidth = Math.min(
    Math.max(element.width, contentWidth + paddingX * 2),
    420,
  );

  const panelHeight = rows.length * rowHeight + paddingY * 2;
  const panelX = element.x + element.width / 2 - panelWidth / 2;
  // Панель начинается под подписью фигуры (label на height + 3 + labelFontSize)
  const panelY = element.y + element.height + labelFontSize + 8;

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
        stroke="#1e293b"
        strokeWidth={1}
      />
      {rows.map((row, index) => {
        const rowY = panelY + paddingY + (index + 0.5) * rowHeight + fontSize * 0.35;
        // Имя обрезаем только если оно реально не помещается рядом со значением
        const nameSpace =
          panelWidth - paddingX * 2 - columnGap - row.value.length * monoCharW;
        const nameMaxChars = Math.max(6, Math.floor(nameSpace / nameCharW));
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

export default LiveValueLabel;
