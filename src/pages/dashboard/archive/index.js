import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import CustomSelect from "@/components/select";
import { AnimatePresence, motion } from "framer-motion";
import { Panel, EmptyState, Reveal, seriesColor } from "@/components/ui";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useAllPages from "@/hooks/all/useAllPages";
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
import ExportExcelButton from "@/features/archive/ExportExcelButton";
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

  // /devices и /tags постраничные, и без явного постраничного дотягивания
  // сервер молча отдаёт только первую страницу — тогда выбор устройства,
  // чьи теги не попали в неё, показывал бы пустой список тегов ("Теги не
  // найдены"), хотя у устройства теги есть. useAllPages читает реальное
  // число страниц из ответа и дотягивает остальные, а не гадает с большим
  // pageSize (см. ту же правку на /dashboard/tags).
  const { data: devicesResp, isLoading: isLoadingDevices } = useAllPages({
    key: KEYS.devices,
    url: URLS.devices,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const { data: tagsResp, isLoading: isLoadingTags } = useAllPages({
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

  // Список выбора тоже группируется по устройству: при «всех устройствах»
  // это сотни тегов подряд, и без заголовков непонятно, чей это тег —
  // одинаковые имена (power, temperature) встречаются у каждого прибора.
  const groupedVisibleTags = useMemo(() => {
    const map = new Map();
    visibleTags.forEach((tag) => {
      const key = tag.deviceId || "unknown";
      if (!map.has(key)) {
        map.set(key, { id: key, label: tag.deviceName || "Без устройства", tags: [] });
      }
      map.get(key).tags.push(tag);
    });
    return Array.from(map.values());
  }, [visibleTags]);

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
      <div className="font-ibmPlexSans max-w-[1800px] space-y-2.5">
        {isLoadingRefs ? (
          <ContentLoader />
        ) : (
          <>
            {/* Полоса управления. Период вынесен наверх и разложен кнопками:
                на странице архива его переключают чаще всего остального, а
                раньше он лежал внутри панели выборки за выпадающим списком —
                два действия вместо одного на каждое движение по времени. */}
            <Reveal className="rounded-[8px] border border-surface-border bg-surface-2">
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <RangePicker
                  variant="buttons"
                  range={range}
                  onRangeChange={setRange}
                  customFrom={customFrom}
                  customTo={customTo}
                  onCustomFromChange={setCustomFrom}
                  onCustomToChange={setCustomTo}
                />

                <div className="flex-1" />

                <ViewModeToggle value={viewMode} onChange={setViewMode} />
                <ExportExcelButton
                  groups={groupedSelectedTags}
                  seriesByTagId={seriesByTagId}
                  valueMaps={valueMaps}
                  fileName={`Архив_${toDatetimeLocal(new Date()).replace(/[:T]/g, "-")}.xlsx`}
                  periodLabel={
                    timeFrom && timeTo
                      ? `Период: ${formatFullTime(new Date(timeFrom).getTime())} — ${formatFullTime(new Date(timeTo).getTime())}`
                      : undefined
                  }
                  disabled={selectedTags.length === 0}
                  isFetching={isFetching}
                />
              </div>

              {/* Что именно построено — строкой, а не пятью плитками: сами
                  числа здесь справочные, а вертикаль нужна графикам */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-t border-surface-border text-[13px]">
                <Meta label="Период">
                  {timeFrom && timeTo
                    ? `${formatFullTime(new Date(timeFrom).getTime())} — ${formatFullTime(new Date(timeTo).getTime())}`
                    : "не задан"}
                </Meta>
                <Meta label="Шаг усреднения">{INTERVAL_LABELS[interval] || interval}</Meta>
                <Meta label="Точек">
                  {totalPoints ? totalPoints.toLocaleString("ru-RU") : "—"}
                </Meta>
                <Meta label="Выбрано">
                  {selectedTags.length}{" "}
                  {plural(selectedTags.length, ["тег", "тега", "тегов"])}
                  {groupedSelectedTags.length > 1
                    ? ` · ${groupedSelectedTags.length} ${plural(groupedSelectedTags.length, ["устройство", "устройства", "устройств"])}`
                    : ""}
                </Meta>
                {isFetching && (
                  <span className="text-[13px] font-ibmPlexMono text-[#5c6270] animate-pulse">
                    загрузка истории…
                  </span>
                )}
              </div>
            </Reveal>

            {/* Тело: постоянная колонка выбора тегов + графики.
                Прежний «облако чипов высотой 176 px» не масштабировался —
                при «всех устройствах» это сотни чипов подряд без группировки,
                и найти нужный тег можно было только поиском по имени. */}
            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-2.5 items-start">
              {/* Липкость живёт на обёртке Reveal — она и есть элемент сетки;
                  на самой панели она бы отсчитывалась от обёртки и не работала */}
              <Reveal index={1} className="xl:sticky xl:top-0">
              <Panel
                flush
                title="Теги"
                description="Отметьте, что построить. Список сгруппирован по устройствам."
              >
                <div className="px-4 py-3 space-y-2 border-b border-surface-border">
                  <CustomSelect
                    options={deviceOptions}
                    value={deviceFilter}
                    onChange={setDeviceFilter}
                    sortOptions={false}
                    placeholder="Все устройства"
                  />
                  <input
                    type="search"
                    value={tagQuery}
                    onChange={(event) => setTagQuery(event.target.value)}
                    placeholder="поиск по имени тега"
                    className="w-full h-9 px-3 rounded-[8px] border border-surface-border bg-surface-1 text-[14px] text-[#e5e2e1] placeholder:text-[#5c6270] outline-none transition-colors hover:border-[#475569] focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-ibmPlexMono text-[#6b7280]">
                      {selectedTagIds.length} / {visibleTags.length}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={visibleTags.length === 0}
                        onClick={() =>
                          setSelectedTagIds((prev) =>
                            Array.from(new Set([...prev, ...visibleTags.map((t) => t.id)])),
                          )
                        }
                        className="text-primary hover:text-[#60a5fa] disabled:text-[#5c6270] disabled:cursor-not-allowed transition-colors rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                      >
                        Выбрать все
                      </button>
                      <button
                        type="button"
                        disabled={selectedTagIds.length === 0}
                        onClick={() => setSelectedTagIds([])}
                        className="text-[#7c8290] hover:text-[#e5e2e1] disabled:text-[#5c6270] disabled:cursor-not-allowed transition-colors rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>
                </div>

                {visibleTags.length === 0 ? (
                  <EmptyState
                    compact
                    title="Теги не найдены"
                    description="Измените устройство или очистите поиск."
                  />
                ) : (
                  <div className="max-h-[62vh] overflow-y-auto">
                    {groupedVisibleTags.map((group) => (
                      <div key={group.id}>
                        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-surface-1 border-b border-surface-border">
                          <span className="min-w-0 flex-1 truncate text-[12.5px] uppercase tracking-wide text-[#6b7280]">
                            {group.label}
                          </span>
                          <span className="flex-shrink-0 text-[12.5px] font-ibmPlexMono text-[#5c6270]">
                            {group.tags.filter((t) => selectedTagIds.includes(t.id)).length}/
                            {group.tags.length}
                          </span>
                        </div>
                        {group.tags.map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          return (
                            <label
                              key={tag.id}
                              title={`${tag.name}${tag.unit ? `, ${tag.unit}` : ""} · ${tag.deviceName}`}
                              className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
                                isSelected ? "bg-primary/10" : "hover:bg-surface-3/60"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTag(tag.id)}
                                className="accent-[#3b82f6] cursor-pointer flex-shrink-0"
                              />
                              {/* Цвет совпадает с линией на графике — точка
                                  здесь заменяет отдельную легенду */}
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                  background: isSelected
                                    ? colorByTagId.get(tag.id)
                                    : "#3a3a3a",
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#e5e2e1]">
                                {formatTagLabelShort(tag.name)}
                              </span>
                              {tag.unit && (
                                <span className="flex-shrink-0 text-[12.5px] font-ibmPlexMono text-[#5c6270]">
                                  {tag.unit}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
              </Reveal>

              <Reveal index={2} className="min-w-0 space-y-2.5">
                {/* Выбранное всегда на виду. Раньше выбор жил чипами внутри
                    того же облака: стоило переключить фильтр устройства, и
                    понять, что именно построено, было можно только по самим
                    графикам ниже. */}
                {/* Чипы появляются и исчезают, а не мигают: при выборе
                    десятка тегов подряд мгновенная перерисовка строки не даёт
                    заметить, что именно добавилось */}
                {selectedTags.length > 0 && (
                  <motion.div
                    layout
                    className="flex flex-wrap items-center gap-1.5 rounded-[8px] border border-surface-border bg-surface-2 px-3 py-2"
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                    {selectedTags.map((tag) => (
                      <motion.span
                        key={tag.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        title={`${tag.name}${tag.unit ? `, ${tag.unit}` : ""} · ${tag.deviceName}`}
                        className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-[8px] border border-surface-border bg-surface-1 text-[13px] text-[#bfc7d4] max-w-[260px]"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: colorByTagId.get(tag.id) }}
                        />
                        <span className="truncate">{formatTagLabelShort(tag.name)}</span>
                        <button
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          title="Убрать из выборки"
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-[8px] text-[#5c6270] hover:text-[#e5e2e1] hover:bg-surface-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                        >
                          ×
                        </button>
                      </motion.span>
                    ))}
                    </AnimatePresence>
                  </motion.div>
                )}

                {selectedTags.length === 0 ? (
                  <Panel>
                    <EmptyState
                      title="Теги не выбраны"
                      description="Отметьте один или несколько тегов слева — история строится по даунсемплированным данным, тому же источнику, что и тренды на мнемосхемах."
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
              </Reveal>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

/** Подпись и значение в одной строке справочной полосы над графиками. */
function Meta({ label, children }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 min-w-0">
      <span className="text-[12.5px] uppercase tracking-wide text-[#6b7280] flex-shrink-0">
        {label}
      </span>
      <span className="font-ibmPlexMono text-[#bfc7d4] truncate">{children}</span>
    </span>
  );
}

function plural(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export default Index;
