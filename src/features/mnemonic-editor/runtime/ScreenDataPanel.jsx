import { useMemo, useState } from "react";
import NoData from "@/components/no-data";
import { toDatetimeLocal, pickInterval, resolveRange } from "@/features/archive/constants";
import { useTagHistory } from "@/features/archive/useTagHistory";
import GroupedTagCharts from "@/features/archive/GroupedTagCharts";
import RangePicker from "@/features/archive/RangePicker";
import ExportExcelButton from "@/features/archive/ExportExcelButton";
import { formatFullTime } from "@/features/archive/constants";
import { useTagValueMaps } from "../hooks/useTagValueMaps";
import { useScreensBackend } from "../context/ScreensBackendContext";

/**
 * Inline (non-modal) history view for the tags bound on the *current*
 * mnemonic screen — the body of the runtime view's "Тренды"/"Таблица" tabs
 * (see RuntimePage.tsx). Used to live inside a popup (ScreenArchiveModal,
 * now retired) opened from a button; moved inline as its own tab per-request,
 * since a SCADA operator expects "Схема / Тренды / Таблица" as top-level
 * views, not one buried behind a corner button.
 *
 * `mode` is fixed by the caller (which tab is active) rather than toggled
 * internally — the old modal had its own chart/table switch, redundant now
 * that the tab itself IS the switch.
 */
const ScreenDataPanel = ({ groups, mode, screenName }) => {
  const { apiClient, backendId } = useScreensBackend();
  const [range, setRange] = useState("24h");
  const [customFrom, setCustomFrom] = useState(() => toDatetimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState(() => toDatetimeLocal(new Date()));

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
    apiClient,
    backendId,
  });
  const valueMaps = useTagValueMaps();

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker
          range={range}
          onRangeChange={setRange}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        {/* Выгрузка — только во вкладке «Таблица»: точные значения нужны в файле,
            графики в Excel не переносятся */}
        {mode === "table" && groups.length > 0 && (
          <ExportExcelButton
            groups={groups}
            seriesByTagId={seriesByTagId}
            valueMaps={valueMaps}
            title={screenName ? `Экран «${screenName}» — значения тегов` : undefined}
            fileName={`${(screenName || "Экран").replace(/[\\/:*?"<>|]/g, "_")}_${toDatetimeLocal(new Date()).replace(/[:T]/g, "-")}.xlsx`}
            periodLabel={
              timeFrom && timeTo
                ? `Период: ${formatFullTime(new Date(timeFrom).getTime())} — ${formatFullTime(new Date(timeTo).getTime())}`
                : undefined
            }
            isFetching={isFetching}
          />
        )}
      </div>

      {groups.length === 0 ? (
        <NoData
          title="Нет привязанных тегов"
          description="На этом экране нет фигур с привязкой к тегам — показывать нечего."
        />
      ) : (
        <GroupedTagCharts
          groups={groups}
          seriesByTagId={seriesByTagId}
          statsByTagId={statsByTagId}
          valueMaps={valueMaps}
          isFetching={isFetching}
          spanMs={spanMs}
          viewMode={mode}
        />
      )}
    </div>
  );
};

export default ScreenDataPanel;
