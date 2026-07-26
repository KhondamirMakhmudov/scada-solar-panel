import { useState } from "react";
import TagChartCard from "./TagChartCard";
import CombinedHistoryTable from "./CombinedHistoryTable";
import { seriesColor } from "@/components/ui";

/**
 * История тегов, сгруппированная по источнику (устройство / элемент схемы),
 * а не одной плоской сеткой: иначе теги разных приборов стоят рядом без
 * указания, что к чему относится.
 *
 * Режим «график» — набор карточек по тегу, режим «таблица» — одна общая
 * таблица на группу.
 *
 * Развёрнутость карточки хранится здесь, а не в самой карточке: развёрнутая
 * карточка занимает обе колонки сетки, а этим управляет родитель. Состояние
 * общее на все группы, потому что ключ — идентификатор тега, уникальный
 * внутри страницы.
 */
const GroupedTagCharts = ({
  groups,
  seriesByTagId,
  statsByTagId,
  valueMaps,
  isFetching,
  spanMs,
  viewMode,
  onRemoveTag,
}) => {
  const [expandedTagIds, setExpandedTagIds] = useState([]);

  const toggleExpanded = (tagId) =>
    setExpandedTagIds((ids) =>
      ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId],
    );

  let colorIndex = 0;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.id}>
          <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {group.label}
            <span className="font-normal normal-case tracking-normal text-[#475569]">
              · {group.tags.length}
            </span>
          </h3>

          {viewMode === "table" ? (
            <CombinedHistoryTable
              tags={group.tags}
              seriesByTagId={seriesByTagId}
              valueMaps={valueMaps}
              isFetching={isFetching}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {group.tags.map((tag) => {
                const color = seriesColor(colorIndex);
                colorIndex += 1;
                const isExpanded = expandedTagIds.includes(tag.id);
                return (
                  <div key={tag.id} className={isExpanded ? "xl:col-span-2" : undefined}>
                    <TagChartCard
                      tag={tag}
                      color={color}
                      chartData={
                        isFetching && !seriesByTagId.has(tag.id)
                          ? null
                          : seriesByTagId.get(tag.id) || []
                      }
                      stats={statsByTagId.get(tag.id)}
                      valueMap={valueMaps?.get(tag.id)}
                      spanMs={spanMs}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleExpanded(tag.id)}
                      onRemove={onRemoveTag ? () => onRemoveTag(tag.id) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GroupedTagCharts;
