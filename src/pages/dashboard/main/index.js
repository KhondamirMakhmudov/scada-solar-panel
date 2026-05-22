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
  ErrorCircle,
  WarningCircle,
} from "@mui/icons-material";

const MetricCard = ({ icon: Icon, label, value, status, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="text-blue-400" />
      <p className="text-gray-400 text-xs">{label}</p>
    </div>
    <p className="text-white text-2xl font-bold mb-1">{value}</p>
    {status && <p className={`text-xs ${status.color}`}>{status.text}</p>}
  </motion.div>
);

const StatusItem = ({
  label,
  count,
  total,
  statusColor,
  statusText,
  statusIcon: StatusIcon,
  delay,
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="flex items-center justify-between py-4 px-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/30 transition-colors"
  >
    <p className="text-gray-300 text-sm flex-1">{label}</p>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 font-medium text-sm">
          {count}/{total}
        </span>
      </div>
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        {StatusIcon && <StatusIcon sx={{ fontSize: 18, color: "inherit" }} className={statusColor} />}
        <span className={`text-xs font-medium ${statusColor}`}>
          {statusText}
        </span>
      </div>
    </div>
  </motion.div>
);

const ConnectionTypeCard = ({ name, count, isActive, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-gray-900 border border-gray-700 rounded-xl p-4"
  >
    <p className="text-gray-400 text-xs mb-2">{name}</p>
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-white text-xl font-bold">{count}</span>
      <span className="text-gray-400 text-xs">
        соединени{count === 1 ? "е" : "й"}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${
          isActive ? "bg-green-500" : "bg-red-500"
        }`}
      ></span>
      <span
        className={`text-xs ${isActive ? "text-green-400" : "text-red-400"}`}
      >
        {isActive ? "Активно" : "Неактивно"}
      </span>
    </div>
  </motion.div>
);

const Index = () => {
  const { data: session } = useSession();

  const {
    data: systemOverview,
    isLoading,
    isFetching,
  } = useGetPythonQuery({
    key: KEYS.systemOverview,
    url: URLS.systemOverview,
    // headers: {
    //   Authorization: `Bearer ${session?.accessToken}`,
    //   Accept: "application/json",
    // },
  });

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  // Extract system overview data
  const data = get(systemOverview, "data.data", {});
  const connections = get(data, "connections", {});
  const devices = get(data, "devices", {});
  const tags = get(data, "tags", {});
  const connectionTypes = get(data, "connectionsByType", {});
  const drivers = get(data, "drivers", 0);

  return (
    <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
      <div className="font-manrope py-6 space-y-6">
        {/* System Overview Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Обзор системы
            </h2>
            <p className="text-gray-400 text-sm">
              Мониторинг и управление устройствами в реальном времени
            </p>
          </div>
        </motion.div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Cable}
            label="Соединения"
            value={connections.total || 0}
            status={
              connections.enabled === connections.total
                ? { color: "text-green-400", text: "Все активны" }
                : {
                    color: "text-yellow-400",
                    text: `${connections.disabled} неактивны`,
                  }
            }
            delay={0.1}
          />
          <MetricCard
            icon={Devices}
            label="Устройства"
            value={devices.total || 0}
            status={
              devices.enabled === devices.total
                ? { color: "text-green-400", text: "Все в сети" }
                : {
                    color: "text-yellow-400",
                    text: `${devices.disabled} оффлайн`,
                  }
            }
            delay={0.2}
          />
          <MetricCard
            icon={LocalOffer}
            label="Параметры"
            value={tags.total || 0}
            status={
              tags.disabled === 0
                ? { color: "text-green-400", text: "Все активны" }
                : {
                    color: "text-yellow-400",
                    text: `${tags.disabled} неактивны`,
                  }
            }
            delay={0.3}
          />
          <MetricCard
            icon={Settings}
            label="Драйверы"
            value={drivers}
            status={{ color: "text-blue-400", text: "Работают" }}
            delay={0.4}
          />
        </div>

        {/* Connection Types Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Типы соединений
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(connectionTypes).map(([type, count], idx) => (
              <ConnectionTypeCard
                key={type}
                name={type.replace(/_/g, " ")}
                count={count}
                isActive={true}
                delay={0.5 + (idx + 1) * 0.1}
              />
            ))}
          </div>
        </motion.div>

        {/* System Health Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Статус системы
            </h3>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/60 rounded-xl overflow-hidden shadow-lg">
            <StatusItem
              label="Активные соединения"
              count={connections.enabled || 0}
              total={connections.total || 0}
              statusColor="text-green-400"
              statusText="Здорово"
              statusIcon={CheckCircle}
              delay={0.7}
            />
            <StatusItem
              label="Доступные устройства"
              count={devices.enabled || 0}
              total={devices.total || 0}
              statusColor="text-green-400"
              statusText="Работают"
              statusIcon={CheckCircle}
              delay={0.8}
            />
            <StatusItem
              label="Активные параметры"
              count={(tags.total || 0) - (tags.disabled || 0)}
              total={tags.total || 0}
              statusColor={tags.disabled > 0 ? "text-yellow-400" : "text-green-400"}
              statusText={tags.disabled > 0 ? "Деградированы" : "Нормально"}
              statusIcon={
                tags.disabled > 0 ? WarningCircle : CheckCircle
              }
              delay={0.9}
            />
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
