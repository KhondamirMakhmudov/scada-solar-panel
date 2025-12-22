import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { useSession } from "next-auth/react";
import ContentLoader from "@/components/loader";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const Index = () => {
  const { data: session } = useSession();
  const {
    data: analitics,
    isLoading,
    isFetching,
  } = useGetPythonQuery({
    key: KEYS.statusMonitoring,
    url: URLS.statusMonitoring,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const [uptime, setUptime] = useState("");

  useEffect(() => {
    if (analitics?.startedAt) {
      const calculateUptime = () => {
        const start = new Date(analitics.startedAt);
        const now = new Date();
        const diff = now - start;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setUptime(`${days}д ${hours}ч ${minutes}м`);
        } else {
          setUptime(`${hours}ч ${minutes}м`);
        }
      };

      calculateUptime();
      const interval = setInterval(calculateUptime, 60000);
      return () => clearInterval(interval);
    }
  }, [analitics?.startedAt]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  const modbus = analitics?.modbus || {};
  const opcUa = analitics?.opcUa || {};
  const totalReadings =
    (modbus.readingsCollected || 0) + (opcUa.readingsCollected || 0);
  const totalSources = (modbus.activeDevices || 0) + (opcUa.activeServers || 0);
  const isRunning = analitics?.status === "RUNNING";

  return (
    <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
      <div className="font-manrope py-6 space-y-6">
        {/* Hero Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-background-dark to-surface-dark rounded-3xl border border-surface-dark p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="relative"></div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-white">
                    Коллектор SCADA
                  </h1>
                  <div
                    className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                      isRunning
                        ? "bg-primary/20 text-primary"
                        : "bg-red-500/20 text-red-500"
                    } border ${
                      isRunning ? "border-primary/30" : "border-red-500/30"
                    }`}
                  >
                    {analitics?.status || "UNKNOWN"}
                  </div>
                </div>
                <p className="text-gray-200 text-lg">
                  Система промышленного мониторинга и сбора данных
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${
                  isRunning ? "bg-primary" : "bg-red-500"
                } animate-pulse`}
              ></div>
              <span className="text-white text-lg font-medium">
                {isRunning ? "Активен" : "Остановлен"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="group relative bg-surface-dark border border-surface-dark  rounded-2xl p-6 hover:border-primary/50 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    timer
                  </span>
                </div>
                <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors">
                  trending_up
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-2">
                Время работы
              </p>
              <p className="text-white text-3xl font-bold">
                {uptime || "0ч 0м"}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="group relative bg-surface-dark border border-surface-dark  rounded-2xl p-6 hover:border-primary/50 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    settings
                  </span>
                </div>
                <span className="text-xs text-text-secondary bg-surface-border px-2 py-1 rounded-full">
                  {totalSources}
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-2">
                Активные источники
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-white text-3xl font-bold">{totalSources}</p>
                <p className="text-text-secondary text-sm">устройств</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="group relative bg-surface-dark border border-surface-dark  rounded-2xl p-6 hover:border-primary/50 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    database
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary animate-pulse">
                  sync
                </span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-2">
                Всего данных
              </p>
              <p className="text-white text-3xl font-bold">
                {totalReadings.toLocaleString()}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="group relative bg-surface-dark border border-surface-dark  rounded-2xl p-6 hover:border-primary/50 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    update
                  </span>
                </div>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-2">
                Обновлено
              </p>
              <p className="text-white text-2xl font-bold">
                {formatTime(analitics?.lastUpdate)}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Protocol Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Modbus Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative bg-surface-dark border border-surface-dark  rounded-3xl p-8 overflow-hidden group hover:border-primary/30 transition-all duration-300"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500"></div>

            {/* Header */}
            <div className="relative flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-4xl text-cyan-400">
                    cable
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Modbus TCP/RTU
                  </h2>
                  <p className="text-text-secondary">
                    Промышленный протокол связи
                  </p>
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  modbus.enabled
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-red-500/20 text-red-500 border border-red-500/30"
                }`}
              >
                {modbus.enabled ? "АКТИВЕН" : "ВЫКЛЮЧЕН"}
              </div>
            </div>

            {/* Stats */}
            <div className="relative space-y-4">
              <div className="bg-background-dark/50 border border-surface-border rounded-2xl p-5 hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-cyan-400">
                        devices
                      </span>
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">
                        Активные устройства
                      </p>
                      <p className="text-white text-xl font-bold mt-1">
                        {modbus.activeDevices || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/5 flex items-center justify-center">
                      <span className="text-2xl font-bold text-cyan-400">
                        {modbus.activeDevices || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-background-dark/50 border border-surface-border rounded-2xl p-5 hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-cyan-400">
                        storage
                      </span>
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">
                        Регистров памяти
                      </p>
                      <p className="text-white text-xl font-bold mt-1">
                        {modbus.totalRegisters || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-cyan-500/10 rounded-lg">
                      <span className="text-sm font-bold text-cyan-400">
                        {modbus.totalRegisters || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-cyan-400">
                        analytics
                      </span>
                    </div>
                    <div>
                      <p className="text-cyan-400/80 text-sm font-medium">
                        Собрано показаний
                      </p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {(modbus.readingsCollected || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-cyan-400 animate-pulse">
                    trending_up
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* OPC UA Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative bg-surface-dark border border-surface-dark  rounded-3xl p-8 overflow-hidden group hover:border-primary/30 transition-all duration-300"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all duration-500"></div>

            {/* Header */}
            <div className="relative flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-4xl text-orange-400">
                    hub
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">OPC UA</h2>
                  <p className="text-text-secondary">
                    Унифицированная архитектура
                  </p>
                </div>
              </div>
              <div
                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  opcUa.enabled
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-red-500/20 text-red-500 border border-red-500/30"
                }`}
              >
                {opcUa.enabled ? "АКТИВЕН" : "ВЫКЛЮЧЕН"}
              </div>
            </div>

            {/* Stats */}
            <div className="relative space-y-4">
              <div className="bg-background-dark/50 border border-surface-border rounded-2xl p-5 hover:border-orange-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-400">
                        dns
                      </span>
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">
                        Активные серверы
                      </p>
                      <p className="text-white text-xl font-bold mt-1">
                        {opcUa.activeServers || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/5 flex items-center justify-center">
                      <span className="text-2xl font-bold text-orange-400">
                        {opcUa.activeServers || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-background-dark/50 border border-surface-border rounded-2xl p-5 hover:border-orange-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-400">
                        account_tree
                      </span>
                    </div>
                    <div>
                      <p className="text-text-secondary text-sm">
                        Узлов в дереве
                      </p>
                      <p className="text-white text-xl font-bold mt-1">
                        {opcUa.totalNodes || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-orange-500/10 rounded-lg">
                      <span className="text-sm font-bold text-orange-400">
                        {opcUa.totalNodes || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-400">
                        analytics
                      </span>
                    </div>
                    <div>
                      <p className="text-orange-400/80 text-sm font-medium">
                        Собрано показаний
                      </p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {(opcUa.readingsCollected || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-orange-400 animate-pulse">
                    trending_up
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-gradient-to-r from-surface-dark to-background-dark border border-surface-dark  rounded-2xl p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRunning ? "bg-primary" : "bg-red-500"
                } animate-pulse`}
              ></div>
              <p className="text-white font-medium">
                Система мониторинга активна • Отслеживается{" "}
                <span className="text-primary font-bold">{totalSources}</span>{" "}
                источников данных
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  schedule
                </span>
                <span>Запущен: {formatDate(analitics?.startedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  update
                </span>
                <span>Обновлено: {formatTime(analitics?.lastUpdate)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
