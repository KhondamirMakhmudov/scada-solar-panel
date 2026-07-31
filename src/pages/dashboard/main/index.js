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
import { formatTagLabel } from "@/lib/tagNameTranslation";
import {
  Cable,
  Devices,
  LocalOffer,
  Settings,
  CheckCircle,
  WarningAmber,
} from "@mui/icons-material";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  deriveGroupStatus,
} from "@/constants/statusPalette";

// Сколько параметров показывать в панели «Текущие значения» — снимок первых
// N тегов проекта, а не курируемый список (у бэкенда нет понятия «важные
// теги»), поэтому панель — это просто живой срез, а не дашборд по избранному.
const LIVE_VALUES_LIMIT = 8;

const MetricCard = ({ icon: Icon, label, value, active, total, hint }) => {
  // Драйверы приходят одним числом без «сколько из скольких» — для них
  // состояние не выводится, показывается только счётчик
  const status = total === undefined ? null : deriveGroupStatus(active, total);

  return (
    <div
      className="bg-surface-dark border border-surface-border rounded-[2px] p-3.5 hover:border-surface-border-hover transition-colors"
      style={status ? { borderLeftWidth: 2, borderLeftColor: STATUS_COLOR[status] } : undefined}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Icon sx={{ fontSize: 15, color: "#7c8290" }} />
        <p className="text-[10px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </p>
      </div>
      <p className="text-text-primary text-2xl font-ibmPlexMono font-semibold tabular-nums leading-none mb-2">
        {value}
      </p>
      {status ? (
        <p className="flex items-center gap-1.5 text-[10.5px] font-ibmPlexMono" style={{ color: STATUS_COLOR[status] }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
          {active === total ? "все активны" : `${total - active} неактивны`}
        </p>
      ) : (
        <p className="text-[10.5px] font-ibmPlexMono text-text-muted">{hint}</p>
      )}
    </div>
  );
};

const StatusRow = ({ label, count, total }) => {
  const status = deriveGroupStatus(count, total);
  const color = STATUS_COLOR[status];
  const StatusIcon = status === "ok" ? CheckCircle : WarningAmber;

  return (
    <div className="flex items-center gap-4 py-2.5 px-3 border-b border-surface-border last:border-b-0 hover:bg-[#232222] transition-colors">
      <p className="flex-1 text-[12px] font-ibmPlexSans text-text-secondary truncate">{label}</p>
      <span className="text-[12px] font-ibmPlexMono text-text-muted tabular-nums">
        {count}/{total}
      </span>
      <span
        className="flex items-center gap-1.5 min-w-[100px] justify-end text-[10.5px] font-ibmPlexMono font-medium"
        style={{ color }}
      >
        <StatusIcon sx={{ fontSize: 14 }} />
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
};

const ConnectionTypeCard = ({ name, count }) => (
  <div className="bg-surface-dark border border-surface-border rounded-[2px] p-3">
    <p className="text-[10px] font-ibmPlexSans uppercase tracking-wider text-text-muted mb-1.5 truncate">
      {name}
    </p>
    <div className="flex items-baseline gap-1.5">
      <span className="text-text-primary text-lg font-ibmPlexMono font-semibold tabular-nums">{count}</span>
      <span className="text-[10.5px] font-ibmPlexMono text-text-faint">
        соединени{count === 1 ? "е" : "й"}
      </span>
    </div>
  </div>
);

const LiveValueRow = ({ tag, value }) => {
  const hasValue = value && !value.isError && value.value !== null && value.value !== undefined;
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-background-dark border border-surface-border rounded-[2px]">
      <span className="text-[10px] font-ibmPlexMono text-text-muted truncate">{tag}</span>
      <span
        className={`text-[12px] font-ibmPlexMono font-medium tabular-nums ${
          value?.isError ? "text-status-fault" : "text-text-primary"
        }`}
      >
        {hasValue ? String(value.value) : value?.isError ? "ошибка" : "—"}
        {hasValue && value.unit ? ` ${value.unit}` : ""}
      </span>
    </div>
  );
};

const Index = () => {
  const { data: session } = useSession();
  const authHeaders = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}`, Accept: "application/json" }
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
  const liveTags = (Array.isArray(tagsRaw) ? tagsRaw : []).slice(0, LIVE_VALUES_LIMIT);
  const liveTagIds = useMemo(() => liveTags.map((tag) => tag.id).sort().join(","), [liveTags]);

  const { data: latestValuesResp } = useGetQuery({
    key: [KEYS.tagValuesLatest, "overview", liveTagIds],
    url: URLS.tagValuesLatest,
    apiClient: requestScreens,
    params: { tagIds: liveTagIds },
    headers: authHeaders,
    enabled: !!session?.accessToken && liveTagIds.length > 0,
  });

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

  return (
    <DashboardLayout headerTitle={"Обзор системы"}>
      {/* Одна короткая анимация появления на всю страницу вместо каскада
          задержек до 0.9 с: сводка состояния должна читаться сразу */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="font-ibmPlexSans space-y-5 max-w-[1600px]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
          <MetricCard icon={Settings} label="Драйверы" value={drivers} hint="работают" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4 items-start">
          <div className="space-y-4">
            {Object.keys(connectionTypes).length > 0 && (
              <section>
                <h3 className="text-[10.5px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                  Типы соединений
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(connectionTypes).map(([type, count]) => (
                    <ConnectionTypeCard key={type} name={type.replace(/_/g, " ")} count={count} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-[10.5px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                Статус системы
              </h3>
              <div className="bg-surface-dark border border-surface-border rounded-[2px] overflow-hidden">
                <StatusRow
                  label="Активные соединения"
                  count={connections.enabled || 0}
                  total={connections.total || 0}
                />
                <StatusRow
                  label="Доступные устройства"
                  count={devices.enabled || 0}
                  total={devices.total || 0}
                />
                <StatusRow label="Активные параметры" count={tagsActive} total={tagsTotal} />
              </div>
            </section>
          </div>

          <section className="bg-surface-dark border border-surface-border rounded-[2px]">
            <div className="px-3 py-2.5 border-b border-surface-border">
              <h3 className="text-[10.5px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">
                Текущие значения
              </h3>
            </div>
            <div className="p-2.5 grid grid-cols-1 gap-1.5">
              {liveTags.length === 0 ? (
                <p className="text-[11px] text-text-faint px-1 py-2">Параметры не найдены</p>
              ) : (
                liveTags.map((tag) => (
                  <LiveValueRow
                    key={tag.id}
                    tag={tag.name ? formatTagLabel(tag.name) : tag.id}
                    value={latestValuesByTagId.get(tag.id)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
