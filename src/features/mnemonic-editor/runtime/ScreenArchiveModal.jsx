import { useMemo, useState } from "react";
import { Close, HistoryRounded } from "@mui/icons-material";
import NoData from "@/components/no-data";
import { toDatetimeLocal, pickInterval, resolveRange } from "@/features/archive/constants";
import { useTagHistory } from "@/features/archive/useTagHistory";
import GroupedTagCharts from "@/features/archive/GroupedTagCharts";
import RangePicker from "@/features/archive/RangePicker";
import ViewModeToggle from "@/features/archive/ViewModeToggle";
import { useTagValueMaps } from "../hooks/useTagValueMaps";

/**
 * In-place history view for the tags bound on the *current* mnemonic screen —
 * opened from the runtime header's "Архив" button. Unlike the standalone
 * /dashboard/archive page (which lets you pick any device/tags), this is
 * scoped to exactly what's on screen: no navigation away, no re-selection.
 * `groups` mirrors the screen's own layout (one group per device/element) so
 * tags from different devices don't end up mixed in one flat grid.
 * Mount only while `open` so the underlying history queries don't run in
 * the background when the modal is closed.
 */
const ScreenArchiveModal = ({ onClose, screenName, groups }) => {
  const [range, setRange] = useState("24h");
  const [customFrom, setCustomFrom] = useState(() => toDatetimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState(() => toDatetimeLocal(new Date()));
  const [viewMode, setViewMode] = useState("chart");

  const { timeFrom, timeTo } = useMemo(
    () => resolveRange(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const spanMs = timeFrom && timeTo ? new Date(timeTo).getTime() - new Date(timeFrom).getTime() : 0;
  const interval = spanMs > 0 ? pickInterval(spanMs) : "PT1H";

  const tagIds = useMemo(() => groups.flatMap((g) => g.tags.map((t) => t.id)), [groups]);
  const { seriesByTagId, statsByTagId, isFetching } = useTagHistory({
    tagIds,
    timeFrom,
    timeTo,
    interval,
  });
  const valueMaps = useTagValueMaps();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 font-manrope">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/70 bg-[#0e0e0e] shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <HistoryRounded className="text-blue-400 flex-shrink-0" fontSize="small" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">Архив — {screenName}</p>
              <p className="text-xs text-slate-500">История значений тегов этого экрана</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <Close fontSize="small" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <RangePicker
              range={range}
              onRangeChange={setRange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
            />
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          {groups.length === 0 ? (
            <NoData
              title="Нет привязанных тегов"
              description="На этом экране нет фигур с привязкой к тегам — архив показывать нечего."
            />
          ) : (
            <GroupedTagCharts
              groups={groups}
              seriesByTagId={seriesByTagId}
              statsByTagId={statsByTagId}
              valueMaps={valueMaps}
              isFetching={isFetching}
              spanMs={spanMs}
              viewMode={viewMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenArchiveModal;
