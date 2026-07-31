import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import CustomSelect from "@/components/select";
import { PageHeader, Panel, StatTile, Chip, EmptyState, seriesColor } from "@/components/ui";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import {
  toDatetimeLocal,
  pickInterval,
  resolveRange,
  formatFullTime,
} from "@/features/archive/constants";
import { useTagHistory } from "@/features/archive/useTagHistory";
import GroupedTagCharts from "@/features/archive/GroupedTagCharts";
import RangePicker from "@/features/archive/RangePicker";
import ViewModeToggle from "@/features/archive/ViewModeToggle";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { useTagValueMaps } from "@/features/mnemonic-editor/hooks/useTagValueMaps";

function resolveTagDeviceId(tag) {
  return tag?.deviceId || get(tag, "device.id", "") || "";
}

/** Человекочитаемый шаг усреднения — интервал приходит в формате ISO 8601 (PT5M, P1D). */
const INTERVAL_LABELS = {
  PT1M: "1 мин",
  PT5M: "5 мин",
  PT15M: "15 мин",
  PT1H: "1 час",
  PT6H: "6 часов",
  P1D: "1 сутки",
};

const Index = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const [deviceFilter, setDeviceFilter] = useState("all");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [range, setRange] = useState("24h");
  const [customFrom, setCustomFrom] = useState(() =>
    toDatetimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  );
  const [customTo, setCustomTo] = useState(() => toDatetimeLocal(new Date()));
  const [viewMode, setViewMode] = useState("chart");
  const [tagQuery, setTagQuery] = useState("");

  const initializedFromQuery = useRef(false);

  const { data: devicesResp, isLoading: isLoadingDevices } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const { data: tagsResp, isLoading: isLoadingTags } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const devicesList = get(devicesResp, "data.data", []);
  const tagsList = get(tagsResp, "data.data", []);

  const deviceMap = useMemo(
    () => new Map(devicesList.map((d) => [d.id, d.name || d.id])),
    [devicesList],
  );

  const tagsById = useMemo(() => {
    const map = new Map();
    tagsList.forEach((t) => {
      const deviceId = resolveTagDeviceId(t);
      map.set(t.id, {
        id: t.id,
        name: t.name || t.id,
        unit: t.unit || "",
        deviceId,
        deviceName: deviceMap.get(deviceId) || "—",
      });
    });
    return map;
  }, [tagsList, deviceMap]);

  // Прилетели ?tagIds=... с экрана мнемосхемы — подставляем выбор один раз,
  // как только список тегов загружен (чтобы знать их устройство/имя).
  useEffect(() => {
    if (initializedFromQuery.current || !router.isReady || tagsList.length === 0) return;
    const raw = router.query.tagIds;
    const ids = (Array.isArray(raw) ? raw[0] : raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > 0) {
      setSelectedTagIds(ids);
      const firstDeviceId = tagsById.get(ids[0])?.deviceId;
      if (firstDeviceId) setDeviceFilter(firstDeviceId);
    }
    initializedFromQuery.current = true;
  }, [router.isReady, router.query.tagIds, tagsList.length, tagsById]);

  const deviceOptions = useMemo(
    () => [
      { label: "Все устройства", value: "all" },
      ...devicesList.map((d) => ({ label: d.name || d.id, value: d.id })),
    ],
    [devicesList],
  );

  const visibleTags = useMemo(() => {
    const list = Array.from(tagsById.values());
    const byDevice =
      deviceFilter === "all" ? list : list.filter((t) => t.deviceId === deviceFilter);
    const q = tagQuery.trim().toLowerCase();
    if (!q) return byDevice;
    return byDevice.filter((t) =>
      `${t.name} ${t.deviceName}`.toLowerCase().includes(q),
    );
  }, [tagsById, deviceFilter, tagQuery]);

  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => tagsById.get(id)).filter(Boolean),
    [selectedTagIds, tagsById],
  );

  const toggleTag = (id) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  // Группируем выбранные теги по устройству — иначе теги разных приборов
  // оказываются в одной куче без указания, что к чему относится.
  const groupedSelectedTags = useMemo(() => {
    const map = new Map();
    selectedTags.forEach((tag) => {
      const key = tag.deviceId || "unknown";
      if (!map.has(key)) {
        map.set(key, { id: key, label: tag.deviceName || "Без устройства", tags: [] });
      }
      map.get(key).tags.push({ id: tag.id, name: tag.name, unit: tag.unit });
    });
    return Array.from(map.values());
  }, [selectedTags]);

  // Цвет линии тега на графике задаётся порядком внутри групп — тот же обход,
  // что и в GroupedTagCharts, чтобы точка на чипе совпадала с линией
  const colorByTagId = useMemo(() => {
    const map = new Map();
    let index = 0;
    groupedSelectedTags.forEach((group) => {
      group.tags.forEach((tag) => {
        map.set(tag.id, seriesColor(index));
        index += 1;
      });
    });
    return map;
  }, [groupedSelectedTags]);

  const { timeFrom, timeTo } = useMemo(
    () => resolveRange(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const spanMs =
    timeFrom && timeTo ? new Date(timeTo).getTime() - new Date(timeFrom).getTime() : 0;
  const interval = spanMs > 0 ? pickInterval(spanMs) : "PT1H";

  const { seriesByTagId, statsByTagId, isFetching } = useTagHistory({
    tagIds: selectedTagIds,
    timeFrom,
    timeTo,
    interval,
  });
  const valueMaps = useTagValueMaps();

  const totalPoints = useMemo(
    () =>
      selectedTagIds.reduce((sum, id) => sum + (statsByTagId.get(id)?.count || 0), 0),
    [selectedTagIds, statsByTagId],
  );

  const isLoadingRefs = isLoadingDevices || isLoadingTags;

  return (
    <DashboardLayout headerTitle="Архивы">
      <div className="font-ibmPlexSans max-w-[1800px]">
        <PageHeader
          title="История значений тегов"
          description="Выберите устройство и теги, задайте период — график и сводка строятся по даунсемплированной истории (тот же источник, что и тренды на мнемосхемах)."
        />

        {isLoadingRefs ? (
          <ContentLoader />
        ) : (
          <div className="space-y-4">
            {/* Сводка по текущей выборке: до неё период и объём данных
                приходилось выяснять по осям самих графиков */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <StatTile dense label="Тегов выбрано" value={selectedTags.length} />
              <StatTile dense label="Устройств" value={groupedSelectedTags.length} />
              <StatTile dense label="Точек" value={totalPoints || "—"} />
              <StatTile
                dense
                label="Шаг усреднения"
                value={INTERVAL_LABELS[interval] || interval}
              />
              <StatTile
                dense
                label="Период"
                value={timeFrom ? formatFullTime(new Date(timeFrom).getTime()) : "—"}
                hint={timeTo ? `по ${formatFullTime(new Date(timeTo).getTime())}` : undefined}
              />
            </div>

            <Panel
              title="Выборка"
              toolbar={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CustomSelect
                  label="Устройство"
                  options={deviceOptions}
                  value={deviceFilter}
                  onChange={setDeviceFilter}
                  sortOptions={false}
                />
                <RangePicker
                  range={range}
                  onRangeChange={setRange}
                  customFrom={customFrom}
                  customTo={customTo}
                  onCustomFromChange={setCustomFrom}
                  onCustomToChange={setCustomTo}
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-[11px] uppercase tracking-wide text-[#6b7280]">
                    Теги
                  </p>
                  <span className="text-[11px] text-[#475569]">
                    {selectedTagIds.length} из {visibleTags.length}
                  </span>
                  <input
                    type="search"
                    value={tagQuery}
                    onChange={(event) => setTagQuery(event.target.value)}
                    placeholder="Фильтр по имени"
                    className="h-7 w-44 rounded-md border border-surface-border bg-surface-1 px-2 text-[11px] text-[#e5e2e1] placeholder:text-[#6b7280] focus:border-primary/60 focus:outline-none"
                  />
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      disabled={visibleTags.length === 0}
                      onClick={() =>
                        setSelectedTagIds((prev) =>
                          Array.from(new Set([...prev, ...visibleTags.map((t) => t.id)])),
                        )
                      }
                      className="text-[11px] text-[#6b7280] hover:text-[#e5e2e1] disabled:opacity-40 transition-colors"
                    >
                      Выбрать все
                    </button>
                    <button
                      type="button"
                      disabled={selectedTagIds.length === 0}
                      onClick={() => setSelectedTagIds([])}
                      className="text-[11px] text-[#6b7280] hover:text-[#e5e2e1] disabled:opacity-40 transition-colors"
                    >
                      Очистить
                    </button>
                  </div>
                </div>

                {visibleTags.length === 0 ? (
                  <EmptyState
                    compact
                    title="Теги не найдены"
                    description="Измените устройство или фильтр по имени."
                  />
                ) : (
                  <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                    {visibleTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <Chip
                          key={tag.id}
                          selected={isSelected}
                          onClick={() => toggleTag(tag.id)}
                          dotColor={isSelected ? colorByTagId.get(tag.id) : undefined}
                          title={`${tag.name}${tag.unit ? `, ${tag.unit}` : ""} · ${tag.deviceName}`}
                          meta={deviceFilter === "all" ? tag.deviceName : undefined}
                        >
                          {formatTagLabelShort(tag.name)}
                        </Chip>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>

            {selectedTags.length === 0 ? (
              <Panel>
                <EmptyState
                  title="Теги не выбраны"
                  description="Выберите один или несколько тегов выше, чтобы построить график истории."
                />
              </Panel>
            ) : (
              <GroupedTagCharts
                groups={groupedSelectedTags}
                seriesByTagId={seriesByTagId}
                statsByTagId={statsByTagId}
                valueMaps={valueMaps}
                isFetching={isFetching}
                spanMs={spanMs}
                viewMode={viewMode}
                onRemoveTag={toggleTag}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
