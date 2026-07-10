import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import { motion } from "framer-motion";
import { HistoryRounded } from "@mui/icons-material";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import NoData from "@/components/no-data";
import CustomSelect from "@/components/select";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { toDatetimeLocal, pickInterval, resolveRange } from "@/features/archive/constants";
import { useTagHistory } from "@/features/archive/useTagHistory";
import GroupedTagCharts from "@/features/archive/GroupedTagCharts";
import RangePicker from "@/features/archive/RangePicker";
import ViewModeToggle from "@/features/archive/ViewModeToggle";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { useTagValueMaps } from "@/features/mnemonic-editor/hooks/useTagValueMaps";

function resolveTagDeviceId(tag) {
  return tag?.deviceId || get(tag, "device.id", "") || "";
}

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
  const [customFrom, setCustomFrom] = useState(() => toDatetimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState(() => toDatetimeLocal(new Date()));
  const [viewMode, setViewMode] = useState("chart");

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
    return deviceFilter === "all" ? list : list.filter((t) => t.deviceId === deviceFilter);
  }, [tagsById, deviceFilter]);

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

  const { timeFrom, timeTo } = useMemo(
    () => resolveRange(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const spanMs = timeFrom && timeTo ? new Date(timeTo).getTime() - new Date(timeFrom).getTime() : 0;
  const interval = spanMs > 0 ? pickInterval(spanMs) : "PT1H";

  const { seriesByTagId, statsByTagId, isFetching } = useTagHistory({
    tagIds: selectedTagIds,
    timeFrom,
    timeTo,
    interval,
  });
  const valueMaps = useTagValueMaps();

  const isLoadingRefs = isLoadingDevices || isLoadingTags;

  return (
    <DashboardLayout headerTitle="Архивы">
      <div className="font-manrope py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-800 p-6"
        >
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
            <HistoryRounded fontSize="small" />
            SCADA / Архивы
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">История значений тегов</h2>
          <p className="mt-1 text-sm text-slate-400">
            Выберите устройство и теги, задайте период — график и сводка строятся по даунсемплированной
            истории (тот же источник, что и тренды на мнемосхемах).
          </p>
        </motion.div>

        {isLoadingRefs ? (
          <ContentLoader />
        ) : (
          <>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 md:p-5 space-y-4">
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
                <div className="flex items-end">
                  <ViewModeToggle value={viewMode} onChange={setViewMode} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-400">
                  Теги{visibleTags.length === 0 ? " (нет тегов у выбранного устройства)" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                          isSelected
                            ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {formatTagLabelShort(tag.name)}
                        {deviceFilter === "all" && (
                          <span className="ml-1.5 text-xs text-slate-500">· {tag.deviceName}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedTags.length === 0 ? (
              <NoData
                title="Теги не выбраны"
                description="Выберите один или несколько тегов выше, чтобы построить график истории."
              />
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
