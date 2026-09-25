import { useMemo } from "react";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import useGetQuery from "@/hooks/all/useGetQuery";
import { requestScreens } from "@/services/api";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { useSession } from "next-auth/react";
import ContentLoader from "@/components/loader";
import { motion } from "framer-motion";
import { get } from "lodash";
import { Cable, Devices, LocalOffer, Settings } from "@mui/icons-material";
import { STATUS_COLOR, deriveGroupStatus } from "@/constants/statusPalette";
import ConnectionsBarChart from "@/features/dashboard-overview/ConnectionsBarChart";
import StatusMeter from "@/features/dashboard-overview/StatusMeter";
import LiveMetricsPanel from "@/features/dashboard-overview/LiveMetricsPanel";
import { useTagValueMaps } from "@/features/mnemonic-editor/hooks/useTagValueMaps";
import StationsOverviewSection from "@/features/overview/StationsOverviewSection";

// Сколько параметров показывать в панели «Мониторинг параметров» — снимок
// первых N тегов проекта, а не курируемый список (у бэкенда нет понятия
// «важные теги»), поэтому панель — это просто живой срез, а не дашборд по
// избранному.
const LIVE_VALUES_LIMIT = 9;

const MetricCard = ({ icon: Icon, label, value, active, total, hint }) => {
  // Драйверы приходят одним числом без «сколько из скольких» — для них
  // состояние не выводится, показывается только счётчик
  const status = total === undefined ? null : deriveGroupStatus(active, total);

  return (
    <div
      className="bg-surface-dark border border-surface-border rounded-[8px] p-3.5 hover:border-surface-border-hover transition-colors"
      style={
        status
          ? { borderLeftWidth: 2, borderLeftColor: STATUS_COLOR[status] }
          : undefined
      }
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Icon sx={{ fontSize: 15, color: "#7c8290" }} />
        <p className="text-[12.5px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </p>
      </div>
      <p className="text-text-primary text-2xl font-ibmPlexMono font-semibold tabular-nums leading-none mb-2">
        {value}
      </p>
      {status ? (
        <p
          className="flex items-center gap-1.5 text-[13px] font-ibmPlexMono"
          style={{ color: STATUS_COLOR[status] }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: STATUS_COLOR[status] }}
          />
          {active === total ? "все активны" : `${total - active} неактивны`}
        </p>
      ) : (
        <p className="text-[13px] font-ibmPlexMono text-text-muted">{hint}</p>
      )}
    </div>
  );
};

const Index = () => {
  const { data: session } = useSession();
  const authHeaders = session?.accessToken
    ? {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/json",
      }
    : {};

  // Намеренно только isLoading: раньше условие включало isFetching, и любое
  // фоновое обновление запроса подменяло всю страницу загрузчиком — сводка
  // моргала при каждом возврате фокуса на вкладку.
  const { data: systemOverview, isLoading } = useGetPythonQuery({
    key: KEYS.systemOverview,
    url: URLS.systemOverview,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const { data: tagsResp } = useGetPythonQuery({
    key: [KEYS.tags, "overview-live"],
    url: URLS.tags,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const tagsRaw = get(tagsResp, "data.data", get(tagsResp, "data", []));
  const liveTags = (Array.isArray(tagsRaw) ? tagsRaw : []).slice(
    0,
    LIVE_VALUES_LIMIT,
  );
  const liveTagIds = useMemo(
    () =>
      liveTags
        .map((tag) => tag.id)
        .sort()
        .join(","),
    [liveTags],
  );

  const { data: latestValuesResp } = useGetQuery({
    key: [KEYS.tagValuesLatest, "overview", liveTagIds],
    url: URLS.tagValuesLatest,
    apiClient: requestScreens,
    params: { tagIds: liveTagIds },
    headers: authHeaders,
    enabled: !!session?.accessToken && liveTagIds.length > 0,
  });

  const valueMaps = useTagValueMaps();

  const latestValuesByTagId = useMemo(() => {
    const list = get(latestValuesResp, "data.data", []);
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((item) => {
      if (item?.tagId) map.set(item.tagId, item);
    });
    return map;
  }, [latestValuesResp]);

  if (isLoading) {
    return (
      <DashboardLayout headerTitle={"Обзор системы"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  const data = get(systemOverview, "data.data", {});
  const connections = get(data, "connections", {});
  const devices = get(data, "devices", {});
  const tags = get(data, "tags", {});
  const connectionTypes = get(data, "connectionsByType", {});
  const drivers = get(data, "drivers", 0);

  const tagsTotal = tags.total || 0;
  const tagsActive = tagsTotal - (tags.disabled || 0);
  const hasConnectionTypes = Object.keys(connectionTypes).length > 0;

  return (
    <DashboardLayout headerTitle={"Обзор системы"}>
      {/* Одна короткая анимация появления на всю страницу вместо каскада
          задержек до 0.9 с: сводка состояния должна читаться сразу */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="font-ibmPlexSans space-y-5 max-w-full"
      >
        <StationsOverviewSection />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4  gap-3">
          <MetricCard
            icon={Cable}
            label="Соединения"
            value={connections.total || 0}
            active={connections.enabled || 0}
            total={connections.total || 0}
          />
          <MetricCard
            icon={Devices}
            label="Устройства"
            value={devices.total || 0}
            active={devices.enabled || 0}
            total={devices.total || 0}
          />
          <MetricCard
            icon={LocalOffer}
            label="Параметры"
            value={tagsTotal}
            active={tagsActive}
            total={tagsTotal}
          />
          <MetricCard
            icon={Settings}
            label="Драйверы"
            value={drivers}
            hint="работают"
          />
        </div>

        <div
          className={`grid grid-cols-1 ${hasConnectionTypes ? "xl:grid-cols-2" : ""} gap-4 items-start`}
        >
          {hasConnectionTypes && <ConnectionsBarChart data={connectionTypes} />}

          <section className="bg-surface-dark border border-surface-border rounded-[8px] overflow-hidden">
            <h3 className="text-[13px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted px-3.5 pt-3.5 pb-1">
              Статус системы
            </h3>
            <StatusMeter
              label="Соединения"
              active={connections.enabled || 0}
              total={connections.total || 0}
            />
            <StatusMeter
              label="Устройства"
              active={devices.enabled || 0}
              total={devices.total || 0}
            />
            <StatusMeter
              label="Параметры"
              active={tagsActive}
              total={tagsTotal}
            />
          </section>
        </div>

        <section className="bg-surface-dark border border-surface-border rounded-[8px]">
          <div className="flex items-baseline justify-between px-3.5 py-2.5 border-b border-surface-border">
            <h3 className="text-[13px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">
              Мониторинг параметров
            </h3>
            <span className="text-[12.5px] font-ibmPlexMono text-text-faint">
              тренд за последний час
            </span>
          </div>
          <div className="p-3">
            <LiveMetricsPanel
              tags={liveTags}
              latestValuesByTagId={latestValuesByTagId}
              valueMaps={valueMaps}
            />
          </div>
        </section>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
