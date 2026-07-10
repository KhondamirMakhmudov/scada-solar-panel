import { useMemo } from "react";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { formatFullTime, formatMaybeMapped } from "./constants";

/**
 * One tag per table row is unreadable once you have more than a couple —
 * this merges every tag in a group into a single table (one column per tag,
 * one row per timestamp bucket) so "статус, мощность, температура..." read
 * side by side instead of in four separate scrolling tables.
 */
const CombinedHistoryTable = ({ tags, seriesByTagId, valueMaps, isFetching }) => {
  const rows = useMemo(() => {
    const map = new Map();
    tags.forEach((tag) => {
      const points = seriesByTagId.get(tag.id) || [];
      points.forEach((p) => {
        const row = map.get(p.ms) || { ms: p.ms };
        row[tag.id] = p.avg;
        map.set(p.ms, row);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.ms - a.ms);
  }, [tags, seriesByTagId]);

  if (isFetching && rows.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">Загрузка…</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
        Нет данных за выбранный период
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-800">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-900">
          <tr className="text-slate-400">
            <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Время</th>
            {tags.map((tag) => (
              <th key={tag.id} className="whitespace-nowrap px-3 py-2 text-right font-medium">
                {formatTagLabelShort(tag.name)}
                {tag.unit ? `, ${tag.unit}` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ms} className="border-t border-slate-800/60">
              <td className="whitespace-nowrap px-3 py-1.5 text-slate-400">{formatFullTime(row.ms)}</td>
              {tags.map((tag) => (
                <td key={tag.id} className="px-3 py-1.5 text-right font-mono font-semibold text-slate-100">
                  {formatMaybeMapped(row[tag.id], valueMaps?.get(tag.id))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CombinedHistoryTable;
