import TagChartCard from "./TagChartCard";
import CombinedHistoryTable from "./CombinedHistoryTable";
import { ROW_COLORS } from "./constants";

/**
 * Renders tag history grouped under a heading per source (device / screen
 * element) instead of one flat mixed grid — otherwise tags from unrelated
 * devices sit side by side with no indication of what belongs together.
 * "chart" mode is small-multiple cards (one per tag); "table" mode merges
 * every tag in a group into a single table instead of one table per tag.
 */
const GroupedTagCharts = ({ groups, seriesByTagId, statsByTagId, valueMaps, isFetching, spanMs, viewMode, onRemoveTag }) => {
  let colorIndex = 0;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.id}>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {group.label}
          </h3>

          {viewMode === "table" ? (
            <CombinedHistoryTable
              tags={group.tags}
              seriesByTagId={seriesByTagId}
              valueMaps={valueMaps}
              isFetching={isFetching}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {group.tags.map((tag) => {
                const color = ROW_COLORS[colorIndex % ROW_COLORS.length];
                colorIndex += 1;
                return (
                  <TagChartCard
                    key={tag.id}
                    tag={tag}
                    color={color}
                    chartData={isFetching && !seriesByTagId.has(tag.id) ? null : seriesByTagId.get(tag.id) || []}
                    stats={statsByTagId.get(tag.id)}
                    valueMap={valueMaps?.get(tag.id)}
                    spanMs={spanMs}
                    onRemove={onRemoveTag ? () => onRemoveTag(tag.id) : undefined}
                  />
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
