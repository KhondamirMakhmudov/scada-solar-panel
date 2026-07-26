import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { useSession } from "next-auth/react";
import ContentLoader from "@/components/loader";
import { motion } from "framer-motion";
import { get } from "lodash";
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

const MetricCard = ({ icon: Icon, label, value, active, total, hint }) => {
  // Драйверы приходят одним числом без «сколько из скольких» — для них
  // состояние не выводится, показывается только счётчик
  const status = total === undefined ? null : deriveGroupStatus(active, total);

  return (
    <div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3b82f6]/30 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Icon sx={{ fontSize: 18, color: "#6b7280" }} />
        <p className="text-[11px] uppercase tracking-wide text-[#6b7280]">{label}</p>
      </div>
      <p className="text-[#e5e2e1] text-3xl font-semibold tabular-nums leading-none mb-2">
        {value}
      </p>
      {status ? (
        <p className="flex items-center gap-1.5 text-[11px]" style={{ color: STATUS_COLOR[status] }}>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: STATUS_COLOR[status] }}
          />
          {active === total ? "Все активны" : `${total - active} неактивны`}
        </p>
      ) : (
        <p className="text-[11px] text-[#6b7280]">{hint}</p>
      )}
    </div>
  );
};

const StatusRow = ({ label, count, total }) => {
  const status = deriveGroupStatus(count, total);
  const color = STATUS_COLOR[status];
  const StatusIcon = status === "ok" ? CheckCircle : WarningAmber;

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-[#2a2a2a] last:border-b-0 hover:bg-[#242424]/40 transition-colors">
      <p className="flex-1 text-[13px] text-[#bfc7d4] truncate">{label}</p>
      <span className="text-[13px] text-[#6b7280] font-mono tabular-nums">
        {count}/{total}
      </span>
      <span
        className="flex items-center gap-1.5 min-w-[110px] justify-end text-[11px] font-medium"
        style={{ color }}
      >
        <StatusIcon sx={{ fontSize: 16 }} />
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
};

const ConnectionTypeCard = ({ name, count }) => (
  <div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-[#6b7280] mb-2 truncate">{name}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-[#e5e2e1] text-2xl font-semibold tabular-nums">{count}</span>
      <span className="text-[11px] text-[#6b7280]">
        соединени{count === 1 ? "е" : "й"}
      </span>
    </div>
  </div>
);

const Index = () => {
  const { data: session } = useSession();

  // Намеренно только isLoading: раньше условие включало isFetching, и любое
  // фоновое обновление запроса подменяло всю страницу загрузчиком — сводка
  // моргала при каждом возврате фокуса на вкладку.
  const { data: systemOverview, isLoading } = useGetPythonQuery({
    key: KEYS.systemOverview,
    url: URLS.systemOverview,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  if (isLoading) {
    return (
      <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
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
    <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
      {/* Одна короткая анимация появления на всю страницу вместо каскада
          задержек до 0.9 с: сводка состояния должна читаться сразу */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="font-manrope space-y-6 max-w-[1600px]"
      >
        <section>
          <h2 className="text-lg font-semibold text-[#e5e2e1] mb-1">Обзор системы</h2>
          <p className="text-[13px] text-[#6b7280] mb-4">
            Мониторинг и управление устройствами в реальном времени
          </p>

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
            <MetricCard
              icon={Settings}
              label="Драйверы"
              value={drivers}
              hint="Работают"
            />
          </div>
        </section>

        {Object.keys(connectionTypes).length > 0 && (
          <section>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#6b7280] mb-3">
              Типы соединений
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {Object.entries(connectionTypes).map(([type, count]) => (
                <ConnectionTypeCard key={type} name={type.replace(/_/g, " ")} count={count} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#6b7280] mb-3">
            Статус системы
          </h3>
          <div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-xl overflow-hidden">
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
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
