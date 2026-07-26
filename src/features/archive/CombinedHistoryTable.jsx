import { useMemo } from "react";
import { DataTable, EmptyState } from "@/components/ui";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { formatFullTime, formatMaybeMapped } from "./constants";

/**
 * Одна строка на тег нечитаема уже при трёх тегах — таблица сводит все теги
 * группы вместе: столбец на тег, строка на временной бакет. «Статус,
 * мощность, температура…» читаются в одной строке, а не в четырёх отдельных
 * прокручиваемых таблицах.
 */
const CombinedHistoryTable = ({ tags, seriesByTagId, valueMaps, isFetching }) => {
  const rows = useMemo(() => {
    const map = new Map();
    tags.forEach((tag) => {
      // "avg" — синтетическое среднее кодов, для перечислимого тега оно
      // бессмысленно («1.73» не является статусом). "last" — реально
      // наблюдавшееся в бакете значение, его и читают такие теги.
      const isEnum = Boolean(valueMaps?.get(tag.id));
      const points = seriesByTagId.get(tag.id) || [];
      points.forEach((p) => {
        const row = map.get(p.ms) || { ms: p.ms };
        row[tag.id] = isEnum ? p.last : p.avg;
        map.set(p.ms, row);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.ms - a.ms);
  }, [tags, seriesByTagId, valueMaps]);

  const columns = useMemo(
    () => [
      {
        key: "time",
        header: "Время",
        render: (row) => (
          <span className="whitespace-nowrap text-[#6b7280]">{formatFullTime(row.ms)}</span>
        ),
      },
      ...tags.map((tag) => ({
        key: tag.id,
        numeric: true,
        header: `${formatTagLabelShort(tag.name)}${tag.unit ? `, ${tag.unit}` : ""}`,
        render: (row) => (
          <span className="text-[#e5e2e1]">
            {formatMaybeMapped(row[tag.id], valueMaps?.get(tag.id))}
          </span>
        ),
      })),
    ],
    [tags, valueMaps],
  );

  if (isFetching && rows.length === 0) {
    return <EmptyState compact title="Загрузка…" />;
  }

  return (
    <div className="rounded-lg border border-surface-border overflow-hidden">
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.ms)}
        maxHeight="26rem"
        empty={
          <EmptyState
            compact
            title="Нет данных за выбранный период"
            description="Измените диапазон или проверьте, что опрос тега включён."
          />
        }
      />
    </div>
  );
};

export default CombinedHistoryTable;
