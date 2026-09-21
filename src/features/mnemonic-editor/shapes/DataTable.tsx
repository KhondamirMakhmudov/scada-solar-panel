import { useMemo, useState } from "react";
import ParametrizedShape from "./base/ParametrizedShape";
import ChartDataTable from "./ChartDataTable";
import type { ShapeComponentProps } from "./base/shapeProps";
import { useTagTrend, type TrendRange } from "../hooks/useTagTrend";
import { useTagCatalog } from "../hooks/useTagCatalog";
import type { DataBinding } from "../types";
import { truncate } from "../lib/chartFormat";

const HEADER_HEIGHT = 24;
const TAB_HEIGHT = 28;
/** Больше — редкость на одной таблице, но не бесконечность: каждый тег это колонка и часть запроса истории. */
export const DATA_TABLE_MAX_TAGS = 40;
/** Уже этой ширины колонка перестаёт читаться — дальше включается горизонтальная прокрутка. */
const MIN_COLUMN_WIDTH = 112;
const ALL_KEY = "__all__";

interface TableTab {
  key: string;
  label: string;
  /** «Подключение → устройство» — для подсказки на вкладке */
  hint: string;
  tags: DataBinding[];
}

/**
 * Standalone exact-value table — as its own placeable shape, not a mode of a
 * chart. Built for screens with many tags across many connections/devices:
 *
 *  - tags are split into **tabs by device** (WinCC-style tag groups), so each
 *    tab is a handful of related columns instead of one 40-column wall; a
 *    trailing «Все» tab shows everything together;
 *  - only the *active* tab's tags are fetched, so switching a tab costs one
 *    small history query rather than loading every tag up front;
 *  - if the columns still don't fit the shape's width they scroll
 *    horizontally with the time column pinned.
 *
 * Tags are chosen in the properties panel (TableBindingSection), which — unlike
 * a chart's picker — is not limited to a single device.
 */
const DataTable = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style } = element;
  const range = (element.state?.range as TrendRange) ?? "1h";
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const bound: DataBinding[] = useMemo(() => {
    const list: DataBinding[] = [];
    if (element.dataBinding?.tagId) list.push(element.dataBinding);
    (element.extraBindings ?? []).forEach((b) => {
      if (b?.tagId) list.push(b);
    });
    return list.slice(0, DATA_TABLE_MAX_TAGS);
  }, [element.dataBinding, element.extraBindings]);

  const { placementByTagId } = useTagCatalog();

  const tabs: TableTab[] = useMemo(() => {
    // Пока каталог не загружен, устройство тега неизвестно — одна общая группа
    if (bound.length === 0 || placementByTagId.size === 0) {
      return [{ key: ALL_KEY, label: "Все", hint: "", tags: bound }];
    }

    const byDevice = new Map<string, TableTab>();
    bound.forEach((binding) => {
      const placement = placementByTagId.get(binding.tagId);
      const key = placement?.deviceId ?? "none";
      if (!byDevice.has(key)) {
        byDevice.set(key, {
          key,
          label: placement?.deviceName ?? "Без устройства",
          hint: placement ? `${placement.connectionName} → ${placement.deviceName}` : "",
          tags: [],
        });
      }
      byDevice.get(key)!.tags.push(binding);
    });

    const groups = [...byDevice.values()];
    if (groups.length === 1) return groups;

    // «Все»: одноимённые теги разных устройств получают суффикс с устройством,
    // иначе их значения слились бы в одну колонку
    const nameCount = new Map<string, number>();
    bound.forEach((b) => {
      const name = b.tagName || b.tagId;
      nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
    });
    const allTags = bound.map((b) => {
      const name = b.tagName || b.tagId;
      if ((nameCount.get(name) ?? 0) < 2) return b;
      const device = placementByTagId.get(b.tagId)?.deviceName;
      return device ? { ...b, tagName: `${name} · ${device}` } : b;
    });

    return [...groups, { key: ALL_KEY, label: "Все", hint: "Все устройства вместе", tags: allTags }];
  }, [bound, placementByTagId]);

  const showTabs = tabs.length > 1;
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  const { series, tagNames, isLoading } = useTagTrend(activeTab.tags, range);

  const titleText = element.label || (tabs.length === 1 && tabs[0].key !== ALL_KEY ? tabs[0].label : "Таблица данных");
  const boxFill = style.fill === "none" ? "#0c1118" : style.fill;
  const tableTop = HEADER_HEIGHT + (showTabs ? TAB_HEIGHT : 0);
  const countLabel = `${bound.length} ${pluralizeTags(bound.length)}`;

  return (
    <ParametrizedShape
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      <rect
        width={width}
        height={height}
        rx={4}
        fill={boxFill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />

      <rect x={0} y={0} width={width} height={HEADER_HEIGHT} rx={4} fill="#131c2b" />
      <rect x={0} y={0} width={3} height={HEADER_HEIGHT} rx={1.5} fill="#38bdf8" />
      <text x={12} y={17} textAnchor="start" fontSize={12.5} fontWeight={600} fill="#f1f5f9">
        <title>{titleText}</title>
        {truncate(titleText, Math.max(1, Math.floor((width - 96) / 7)))}
      </text>
      {bound.length > 0 && (
        <text x={width - 10} y={16.5} textAnchor="end" fontSize={10} fill="#64748b">
          {countLabel}
        </text>
      )}

      {showTabs && (
        <foreignObject x={0} y={HEADER_HEIGHT} width={width} height={TAB_HEIGHT}>
          <style>{TAB_CSS}</style>
          <div
            className="dtt-strip"
            // Колесо мыши листает вкладки по горизонтали, а не масштабирует холст
            onWheel={(event) => {
              event.stopPropagation();
              event.currentTarget.scrollLeft += event.deltaY + event.deltaX;
            }}
          >
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  title={tab.hint || tab.label}
                  className={isActive ? "dtt-tab dtt-active" : "dtt-tab"}
                  onClick={() => setActiveKey(tab.key)}
                >
                  <span className="dtt-label">{tab.label}</span>
                  <span className="dtt-count">{tab.tags.length}</span>
                </button>
              );
            })}
          </div>
        </foreignObject>
      )}

      {bound.length === 0 ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={11} fill="#64748b">
          Нет привязки — выберите теги в панели справа
        </text>
      ) : (
        <ChartDataTable
          width={width}
          top={tableTop}
          height={height - tableTop}
          tagNames={tagNames}
          series={series}
          isLoading={isLoading}
          minColumnWidth={MIN_COLUMN_WIDTH}
        />
      )}
    </ParametrizedShape>
  );
};

function pluralizeTags(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "тег";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "тега";
  return "тегов";
}

// Как и у ChartDataTable: псевдоклассы недоступны inline, классы с префиксом dtt-
const TAB_CSS = `
.dtt-strip{display:flex;align-items:flex-end;gap:2px;height:100%;padding:0 8px;box-sizing:border-box;overflow-x:auto;overflow-y:hidden;background:#0f1620;border-bottom:1px solid #223047;scrollbar-width:none}
.dtt-strip::-webkit-scrollbar{display:none}
.dtt-tab{flex:0 0 auto;display:flex;align-items:center;gap:6px;max-width:170px;height:24px;padding:0 10px;border:0;border-bottom:2px solid transparent;background:transparent;color:#7c8aa0;font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:11.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:color .12s,background-color .12s,border-color .12s}
.dtt-tab:hover{color:#e2e8f0;background:rgba(148,163,184,.08)}
.dtt-tab.dtt-active{color:#7dd3fc;border-bottom-color:#38bdf8;background:rgba(56,189,248,.08)}
.dtt-label{overflow:hidden;text-overflow:ellipsis}
.dtt-count{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px;padding:1px 5px;border-radius:8px;background:rgba(148,163,184,.14);color:#94a3b8}
.dtt-tab.dtt-active .dtt-count{background:rgba(56,189,248,.2);color:#bae6fd}
`;

export default DataTable;
