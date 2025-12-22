import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const [data, setData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://10.40.9.47:18081/ws/raw");

    ws.onopen = () => {
      console.log("Connected to SCADA");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "readings" && message.data) {
          setData((prev) => {
            const newData = [...prev, ...message.data];
            return newData.slice(-100);
          });
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => ws.close();
  }, []);

  // Get latest reading for each device
  const getLatestForDevice = (deviceId) => {
    return data
      .filter((item) => item.deviceId === deviceId)
      .sort((a, b) => {
        const timeA = new Date(...a.timestamp.slice(0, 6));
        const timeB = new Date(...b.timestamp.slice(0, 6));
        return timeB - timeA;
      })[0];
  };

  // Get specific parameter for device
  const getDeviceParameter = (deviceId, paramName) => {
    return data
      .filter(
        (item) =>
          item.deviceId === deviceId &&
          item.registerName.toLowerCase().includes(paramName.toLowerCase())
      )
      .sort((a, b) => {
        const timeA = new Date(...a.timestamp.slice(0, 6));
        const timeB = new Date(...b.timestamp.slice(0, 6));
        return timeB - timeA;
      })[0];
  };

  // Calculate totals
  const totalPower = data
    .filter((item) => item.registerName.includes("Output power"))
    .reduce((sum, item) => {
      const latest = getDeviceParameter(item.deviceId, "Output power");
      return latest && latest.deviceId === item.deviceId
        ? sum
        : sum + (item.value || 0);
    }, 0);

  const totalEnergyToday = data
    .filter((item) => item.registerName.includes("Today"))
    .reduce((sum, item) => {
      const latest = getDeviceParameter(item.deviceId, "Today");
      return latest && latest.deviceId === item.deviceId
        ? sum
        : sum + (item.value || 0);
    }, 0);

  const totalGenerated = data
    .filter(
      (item) =>
        item.registerName.includes("Total generate") ||
        item.registerName.includes("Total Energy")
    )
    .reduce((sum, item) => sum + (item.value || 0), 0);

  // Get device data
  const devices = [1, 2, 3].map((id) => {
    const latest = getLatestForDevice(id);
    const power =
      getDeviceParameter(id, "Output power") ||
      getDeviceParameter(id, "Active Power");
    const energy = getDeviceParameter(id, "Today");
    const temp = getDeviceParameter(id, "temperature");
    const voltage = getDeviceParameter(id, "voltage");

    return {
      id,
      name: latest?.deviceName || `Устройство ${id}`,
      active: !!latest,
      power: power?.value || 0,
      energy: energy?.value || 0,
      temp: temp?.value || 0,
      voltage: voltage?.value || 0,
      lastUpdate: latest?.timestamp,
    };
  });

  const activeDevices = devices.filter((d) => d.active).length;

  const formatTime = (timestamp) => {
    if (!timestamp || !Array.isArray(timestamp)) return "-";
    const date = new Date(...timestamp.slice(0, 6));
    return date.toLocaleTimeString("ru-RU");
  };

  return (
    <DashboardLayout headerTitle={"Общий обзор"}>
      <div className="font-manrope py-6 space-y-6">
        {/* Hero Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden bg-gradient-to-br from-green-900/20 via-emerald-900/10 to-teal-900/20 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30 rounded-3xl border border-green-500/20 p-8"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl -z-10"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div
                  className={`absolute inset-0 ${
                    connected ? "bg-green-500" : "bg-red-500"
                  } blur-xl opacity-30 animate-pulse`}
                ></div>
                <div
                  className={`relative w-20 h-20 rounded-2xl ${
                    connected ? "bg-green-500/20" : "bg-red-500/20"
                  } border ${
                    connected ? "border-green-500/30" : "border-red-500/30"
                  } flex items-center justify-center`}
                >
                  <span
                    className={`material-symbols-outlined text-5xl ${
                      connected ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {connected ? "wifi" : "wifi_off"}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                    Солнечная SCADA
                  </h1>
                  <div
                    className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                      connected
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                    } border ${
                      connected ? "border-green-500/30" : "border-red-500/30"
                    }`}
                  >
                    {connected ? "ПОДКЛЮЧЕНО" : "ОТКЛЮЧЕНО"}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  • Мониторинг в реальном времени •
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    connected ? "bg-green-500" : "bg-red-500"
                  } animate-pulse`}
                ></div>
                <span className="text-gray-900 dark:text-white text-lg font-medium">
                  {connected ? "Активен" : "Нет связи"}
                </span>
              </div>
              {lastUpdate && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Обновлено: {lastUpdate.toLocaleTimeString("ru-RU")}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative bg-surface-dark border border-surface-dark rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-yellow-600 dark:text-yellow-400">
                    bolt
                  </span>
                </div>
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 group-hover:animate-pulse">
                  trending_up
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Текущая мощность
              </p>
              <p className="text-gray-900 dark:text-white text-3xl font-bold">
                {totalPower.toFixed(1)}{" "}
                <span className="text-xl text-gray-500 dark:text-gray-400">
                  Вт
                </span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-surface-dark border border-surface-dark rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">
                    wb_sunny
                  </span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  Сегодня
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Выработано энергии
              </p>
              <p className="text-gray-900 dark:text-white text-3xl font-bold">
                {totalEnergyToday.toFixed(1)}{" "}
                <span className="text-xl text-gray-500 dark:text-gray-400">
                  кВт·ч
                </span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-surface-dark border border-surface-dark rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">
                    devices
                  </span>
                </div>
                <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                  {activeDevices}/{devices.length}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Активные устройства
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-gray-900 dark:text-white text-3xl font-bold">
                  {activeDevices}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  онлайн
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative bg-surface-dark border border-surface-dark rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-purple-600 dark:text-purple-400">
                    database
                  </span>
                </div>
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 animate-pulse">
                  sync
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Всего данных
              </p>
              <p className="text-gray-900 dark:text-white text-3xl font-bold">
                {data.length}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Device Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 overflow-hidden group hover:border-green-500/30 dark:hover:border-green-500/30 transition-all duration-300 shadow-sm"
              >
                <div
                  className={`absolute -top-20 -right-20 w-64 h-64 ${
                    device.active ? "bg-green-500/5" : "bg-gray-500/5"
                  } rounded-full blur-3xl group-hover:${
                    device.active ? "bg-green-500/10" : "bg-gray-500/10"
                  } transition-all duration-500`}
                ></div>

                {/* Header */}
                <div className="relative flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl ${
                        device.active
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-gray-500/10 border-gray-500/20"
                      } border flex items-center justify-center`}
                    >
                      <span
                        className={`material-symbols-outlined text-3xl ${
                          device.active
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-500 dark:text-gray-600"
                        }`}
                      >
                        solar_power
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Устройство {device.id}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                        {device.name}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      device.active
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  ></div>
                </div>

                {/* Stats */}
                <div className="relative space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-lg">
                          bolt
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Мощность
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {device.power.toFixed(1)} Вт
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">
                          wb_sunny
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Сегодня
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {device.energy.toFixed(1)} кВт·ч
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">
                          device_thermostat
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Темп.
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {device.temp.toFixed(1)}°C
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-sm">
                          electric_bolt
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Напряж.
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {device.voltage.toFixed(1)}В
                      </span>
                    </div>
                  </div>

                  {device.active && device.lastUpdate && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 text-center pt-2">
                      Обновлено: {formatTime(device.lastUpdate)}
                    </div>
                  )}
                </div>

                {!device.active && (
                  <div className="absolute inset-0 bg-gray-900/50 dark:bg-gray-950/70 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-5xl text-gray-400 mb-2">
                        warning
                      </span>
                      <p className="text-white font-medium">Нет данных</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Live Data Stream */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                  data_usage
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Поток данных в реальном времени
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Активен
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Устройство
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Параметр
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Значение
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Качество
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Время
                  </th>
                </tr>
              </thead>
              <tbody>
                {data
                  .slice(-15)
                  .reverse()
                  .map((item, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {item.deviceId}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              Устройство {item.deviceId}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[150px]">
                              {item.deviceName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {item.registerName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {item.value}{" "}
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                            {item.unit}
                          </span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.quality === "GOOD"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          {item.quality}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(item.timestamp)}
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>

          {data.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
                hourglass_empty
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Ожидание данных...
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
