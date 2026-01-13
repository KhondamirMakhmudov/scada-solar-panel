import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { useSession } from "next-auth/react";
import ContentLoader from "@/components/loader";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import StatCard from "@/components/card/StatisticCard";
import { get } from "lodash";
import usePostPythonQuery from "@/hooks/python/usePostQuery";
import toast from "react-hot-toast";

const DeviceCard = ({ device, delay, onAction }) => {
  const [actionLoading, setActionLoading] = useState(null);
  const [showActions, setShowActions] = useState(false);

  const totalPolls = device.successfulPolls + device.failedPolls;
  const successRate =
    totalPolls > 0
      ? ((device.successfulPolls / totalPolls) * 100).toFixed(2)
      : "0.00";
  const lastPollDate = device.lastPollTime
    ? new Date(device.lastPollTime)
    : null;
  const timeAgo = lastPollDate ? getTimeAgo(lastPollDate) : "Нет данных";

  const handleAction = async (action) => {
    setActionLoading(action);
    await onAction(device.deviceId, action);
    setTimeout(() => {
      setActionLoading(null);
      setShowActions(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="group relative bg-green-950 border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${
                device.isPolling
                  ? "bg-green-500/20 border-green-500/30"
                  : "bg-red-500/20 border-red-500/30"
              } border flex items-center justify-center`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  device.isPolling ? "bg-green-400" : "bg-red-400"
                } ${device.isPolling ? "animate-pulse" : ""}`}
              ></div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">
                {device.deviceName}
              </h3>
              <p className="text-gray-400 text-sm">ID: {device.deviceId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                device.isPolling
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {device.isPolling ? "Активен" : "Неактивен"}
            </span>

            {/* Actions Menu Toggle */}
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-8 h-8 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-600 flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined text-gray-300 text-lg">
                more_vert
              </span>
            </button>
          </div>
        </div>

        {/* Actions Dropdown */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-gray-800 border border-gray-700 rounded-xl p-2 space-y-1"
          >
            <button
              onClick={() => handleAction("start")}
              disabled={actionLoading !== null}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-green-500/10 border border-transparent hover:border-green-500/30 transition-all text-left group/btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "start" ? (
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-green-400 text-xl">
                  play_arrow
                </span>
              )}
              <div className="flex-1">
                <p className="text-white font-medium text-sm">
                  Запустить опрос
                </p>
                <p className="text-gray-400 text-xs">Начать опрос устройства</p>
              </div>
            </button>

            <button
              onClick={() => handleAction("stop")}
              disabled={actionLoading !== null}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all text-left group/btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "stop" ? (
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-red-400 text-xl">
                  stop
                </span>
              )}
              <div className="flex-1">
                <p className="text-white font-medium text-sm">
                  Остановить опрос
                </p>
                <p className="text-gray-400 text-xs">
                  Приостановить опрос устройства
                </p>
              </div>
            </button>

            <button
              onClick={() => handleAction("restart")}
              disabled={actionLoading !== null}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 transition-all text-left group/btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "restart" ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-blue-400 text-xl">
                  restart_alt
                </span>
              )}
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Перезапустить</p>
                <p className="text-gray-400 text-xs">
                  Перезапустить опрос устройства
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-green-700/50">
            <p className="text-gray-400 text-xs mb-1">Успешных опросов</p>
            <p className="text-white text-xl font-bold">
              {device.successfulPolls.toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-red-700/50">
            <p className="text-gray-400 text-xs mb-1">Неудачных опросов</p>
            <p className="text-white text-xl font-bold">
              {device.failedPolls.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Success Rate Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Успешность</span>
            <span className="text-white font-semibold">{successRate}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${successRate}%` }}
              transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                parseFloat(successRate) > 95
                  ? "bg-gradient-to-r from-green-500 to-emerald-400"
                  : parseFloat(successRate) > 90
                  ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                  : "bg-gradient-to-r from-red-500 to-pink-400"
              }`}
            ></motion.div>
          </div>
        </div>

        {/* Last Poll Time */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Последний опрос:</span>
          <span className="text-gray-300 font-medium">{timeAgo}</span>
        </div>

        {device.lastError && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm font-medium">
              ⚠ Ошибка: {device.lastError}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return `${seconds} сек. назад`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

const Index = () => {
  const { data: session } = useSession();
  const [filter, setFilter] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);

  const { data: analiticsModbus, isLoading: isLoadingModbus } =
    useGetPythonQuery({
      key: KEYS.statusMonitoringModbus,
      url: URLS.statusMonitoringModbus,
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
        Accept: "application/json",
      },
      enabled: !!session?.accessToken,
    });

  const { mutate: startPolling } = usePostPythonQuery({
    listKeyId: KEYS.statusMonitoringModbus,
  });

  const { mutate: stopPolling } = usePostPythonQuery({
    listKeyId: KEYS.statusMonitoringModbus,
  });

  const { mutate: restartPolling } = usePostPythonQuery({
    listKeyId: KEYS.statusMonitoringModbus,
  });

  const handleDeviceAction = async (deviceId, action) => {
    const actionMap = {
      start: {
        url: `${URLS.actionPolling}${deviceId}/start`,
        mutate: startPolling,
      },
      stop: {
        url: `${URLS.actionPolling}${deviceId}/stop`,
        mutate: stopPolling,
      },
      restart: {
        url: `${URLS.actionPolling}${deviceId}/restart`,
        mutate: restartPolling,
      },
    };

    const selectedAction = actionMap[action];
    if (selectedAction) {
      selectedAction.mutate(
        {
          url: selectedAction.url,
          attributes: {},
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            // Refetch data after successful action
            toast.success("Success");
          },
        }
      );
    }
  };

  // Auto-refresh warning after 2 minutes
  useEffect(() => {
    const warningTimer = setTimeout(() => {
      setShowRefreshWarning(true);
    }, 120000); // 2 minutes

    return () => clearTimeout(warningTimer);
  }, [lastUpdate]);

  const handleRefresh = () => {
    refetchModbus();
    setLastUpdate(new Date());
    setShowRefreshWarning(false);
  };

  const devices = get(analiticsModbus, "data.activeTasks", []);
  const inActiveDevices = get(analiticsModbus, "data.inactiveTasks", []);
  const filteredDevices =
    filter === "inactive"
      ? inActiveDevices.filter((device) => {
          device.isPolling;
          return true;
        })
      : devices.filter((device) => {
          device.isPolling;
          return true;
        });

  const totalSuccessful = devices.reduce(
    (acc, device) => acc + device.successfulPolls,
    0
  );
  const totalFailed = devices.reduce(
    (acc, device) => acc + device.failedPolls,
    0
  );
  const avgSuccessRate =
    totalSuccessful + totalFailed > 0
      ? ((totalSuccessful / (totalSuccessful + totalFailed)) * 100).toFixed(1)
      : 0;

  if (isLoadingModbus) {
    return (
      <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
      <div className="font-manrope py-6 space-y-6">
        {/* Refresh Warning Banner */}
        {showRefreshWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-yellow-400 text-2xl">
                schedule
              </span>
              <div>
                <p className="text-yellow-400 font-semibold">
                  Данные могут быть устаревшими
                </p>
                <p className="text-yellow-300/80 text-sm">
                  Рекомендуется обновить данные для получения актуальной
                  информации
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-all"
            >
              Обновить сейчас
            </button>
          </motion.div>
        )}

        {/* Header with Filters */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-gray-400 text-sm">
              Мониторинг и управление устройствами в реальном времени
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Последнее обновление: {lastUpdate.toLocaleTimeString("ru-RU")}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Обновить
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  filter === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  filter === "active"
                    ? "bg-green-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Активные
              </button>
              <button
                onClick={() => setFilter("inactive")}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  filter === "inactive"
                    ? "bg-red-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Неактивные
              </button>
            </div>
          </div>
        </motion.div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            icon="database"
            label="Активные устройства"
            value={get(analiticsModbus, "data.activeTasksCount", 0)}
            delay={0.1}
          />
          <StatCard
            icon="check_circle"
            label="Успешных опросов"
            value={totalSuccessful.toLocaleString()}
            delay={0.2}
          />
          <StatCard
            icon="cancel"
            label="Неудачных опросов"
            value={totalFailed.toLocaleString()}
            delay={0.3}
          />
          <StatCard
            icon="trending_up"
            label="Средняя успешность"
            value={`${avgSuccessRate}%`}
            delay={0.4}
          />
        </div>

        {/* Devices Section */}
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between mb-4"
          >
            <h2 className="text-2xl font-bold text-white">
              Устройства ({filteredDevices.length})
            </h2>
          </motion.div>

          {filteredDevices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700"
            >
              <p className="text-gray-400 text-lg">
                Нет устройств для отображения
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredDevices.map((device, index) => (
                <DeviceCard
                  key={device.deviceId}
                  device={device}
                  delay={0.6 + index * 0.1}
                  onAction={handleDeviceAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
