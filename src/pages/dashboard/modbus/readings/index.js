import { useState, useMemo } from "react";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { URLS } from "@/constants/url";
import { KEYS } from "@/constants/key";
import useGetQuery from "@/hooks/java/useGetQuery";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import CustomTable from "@/components/table";
import CustomSelect from "@/components/select";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import { Typography } from "@mui/material";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const StatCard = ({
  title,
  value,
  unit,
  emoji,
  status,
  statusText,
  quality,
}) => {
  const getStatusColor = () => {
    if (quality === "GOOD") return "bg-blue-500/20 text-blue-400";
    if (quality === "BAD") return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-dark border border-surface-dark rounded-xl p-5 relative overflow-hidden group hover:border-primary/30 transition-all"
    >
      <div className="absolute right-0 top-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
        <span
          className="material-symbols-outlined text-primary"
          style={{
            fontSize: "64px",
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48",
          }}
        >
          {emoji}
        </span>
      </div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold text-white tracking-tight font-mono">
          {value}
        </h3>
        <span className="text-sm text-gray-400 font-medium">{unit}</span>
      </div>
      {quality && (
        <div className="flex items-center gap-1 mt-3">
          <span
            className={`${getStatusColor()} rounded px-1.5 py-0.5 text-xs font-bold flex items-center gap-0.5`}
          >
            {quality}
          </span>
          {statusText && (
            <span className="text-gray-400 text-xs ml-1">{statusText}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

const Index = () => {
  const { data: session } = useSession();
  const [selectedRegisterId, setSelectedRegisterId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "chart"

  // Fetch all devices
  const { data: devices, isLoading: isLoadingDevices } = useGetQuery({
    key: KEYS.MODBUSDevices,
    url: URLS.MODBUSDevices,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Fetch all registers
  const { data: registers, isLoading: isLoadingRegisters } = useGetQuery({
    key: KEYS.MODBUSRegisters,
    url: URLS.MODBUSRegisters,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Fetch registers by device ID
  const { data: registersByDeviceId } = useGetQuery({
    key: [KEYS.MODBUSRegistersByDeviceId, selectedDeviceId],
    url: `${URLS.MODBUSRegistersByDeviceId}/${selectedDeviceId}`,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken && !!selectedDeviceId,
  });

  // Fetch readings by register ID
  const {
    data: readingsByRegisterId,
    isLoading: isLoadingReadings,
    isFetching: isFetchingReadings,
  } = useGetQuery({
    key: [KEYS.MODBUSreadingsByRegisterId, selectedRegisterId],
    url: `${URLS.MODBUSreadingsByRegisterId}/${selectedRegisterId}`,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken && !!selectedRegisterId,
  });

  // Fetch latest reading by device
  const { data: latestReadingsByDevice, isLoading: isLoadingLatest } =
    useGetQuery({
      key: [KEYS.MODBUSLatestReadingsByDevice, selectedDeviceId],
      url: `${URLS.MODBUSLatestReadingsByDevice}/${selectedDeviceId}/latest`,
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
        Accept: "application/json",
      },
      enabled:
        !!session?.accessToken && !!selectedDeviceId && !selectedRegisterId,
    });

  const isLoading = isLoadingDevices || isLoadingRegisters;

  // Prepare options
  const deviceOptions = [
    { label: "Все устройства", value: null },
    ...get(devices, "data.content", []).map((device) => ({
      label: device.name,
      value: device.id,
    })),
  ];

  const availableRegisters = selectedDeviceId
    ? get(registersByDeviceId, "data", [])
    : get(registers, "data.content", []);

  const registerOptions = [
    { label: "Все регистры", value: null },
    ...availableRegisters.map((register) => ({
      label: register.name,
      value: register.id,
    })),
  ];

  // Get display data
  const displayData = selectedRegisterId
    ? get(readingsByRegisterId, "data.content", [])
    : get(latestReadingsByDevice, "data", []);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!displayData.length) return null;

    const values = displayData
      .map((d) => d.value)
      .filter((v) => v !== null && v !== undefined);
    const latest = displayData[0]?.value || 0;
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { latest, average, min, max, count: displayData.length };
  }, [displayData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!selectedRegisterId || !displayData.length) return [];

    return displayData
      .slice(0, 50) // Last 50 readings
      .reverse()
      .map((reading) => ({
        time: new Date(reading.timestamp).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: reading.value,
        quality: reading.quality,
      }));
  }, [displayData, selectedRegisterId]);

  // Table columns
  const columns = [
    {
      header: "№",
      cell: ({ row }) => (
        <span className="font-medium text-gray-300">{row.index + 1}</span>
      ),
    },
    {
      accessorKey: "registerName",
      header: "Имя регистра",
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <p className="font-medium text-gray-100">
            {row.original.registerName}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "deviceName",
      header: "Устройство",
      cell: ({ row }) => (
        <span className="text-sm text-gray-300">{row.original.deviceName}</span>
      ),
    },
    {
      accessorKey: "value",
      header: "Значение",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {row.original.value?.toFixed(2)}
          </span>
          <span className="text-xs text-gray-400">{row.original.unit}</span>
        </div>
      ),
    },
    {
      accessorKey: "rawValue",
      header: "Сырое значение",
      cell: ({ row }) => (
        <span className="text-sm text-gray-400 font-mono">
          {row.original.rawValue}
        </span>
      ),
    },
    {
      accessorKey: "quality",
      header: "Качество",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${
            row.original.quality === "GOOD"
              ? "bg-primary/10 text-primary border border-primary/30"
              : row.original.quality === "BAD"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
          }`}
        >
          {row.original.quality}
        </span>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Время",
      cell: ({ row }) => (
        <div className="text-sm text-gray-300">
          <div>
            {new Date(row.original.timestamp).toLocaleDateString("ru-RU")}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(row.original.timestamp).toLocaleTimeString("ru-RU")}
          </div>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout headerTitle={"Чтение данных"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Чтение данных"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] rounded-lg my-[20px] font-manrope border border-surface-dark bg-background-dark"
      >
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Typography
                variant="h5"
                sx={{ color: "white", fontFamily: "Manrope" }}
              >
                Чтение данных Modbus
              </Typography>
              <p className="text-gray-300">
                Мониторинг и анализ показаний регистров в реальном времени
              </p>
            </div>

            {/* View Mode Toggle */}
            {selectedRegisterId && (
              <div className="flex gap-2 bg-surface-dark rounded-lg p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === "table"
                      ? "bg-primary text-background-dark"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Таблица
                </button>
                <button
                  onClick={() => setViewMode("chart")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === "chart"
                      ? "bg-primary text-background-dark"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  График
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <CustomSelect
              label="Устройство"
              options={deviceOptions}
              value={selectedDeviceId}
              onChange={(value) => {
                setSelectedDeviceId(value);
                setSelectedRegisterId(null);
              }}
              placeholder="Выберите устройство"
              sortOptions={false}
            />

            <CustomSelect
              label="Регистр"
              options={registerOptions}
              value={selectedRegisterId}
              onChange={(value) => setSelectedRegisterId(value)}
              placeholder="Выберите регистр"
              sortOptions={false}
              disabled={!selectedDeviceId && !availableRegisters.length}
            />
          </div>

          {/* Statistics Cards */}
          {statistics && selectedRegisterId && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Последнее значение"
                value={statistics.latest.toFixed(2)}
                unit={displayData[0]?.unit || ""}
                emoji="bolt"
                quality={displayData[0]?.quality}
                statusText="Актуальное"
              />
              <StatCard
                title="Среднее значение"
                value={statistics.average.toFixed(2)}
                unit={displayData[0]?.unit || ""}
                emoji="electric_meter"
              />
              <StatCard
                title="Минимум"
                value={statistics.min.toFixed(2)}
                unit={displayData[0]?.unit || ""}
                emoji="electrical_services"
              />
              <StatCard
                title="Максимум"
                value={statistics.max.toFixed(2)}
                unit={displayData[0]?.unit || ""}
                emoji="memory"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              {selectedRegisterId ? (
                <>
                  Показания регистра:{" "}
                  <span className="text-primary font-medium">
                    {
                      registerOptions.find(
                        (r) => r.value === selectedRegisterId,
                      )?.label
                    }
                  </span>{" "}
                  ({displayData.length} записей)
                </>
              ) : selectedDeviceId ? (
                <>
                  Последние показания устройства:{" "}
                  <span className="text-primary font-medium">
                    {
                      deviceOptions.find((d) => d.value === selectedDeviceId)
                        ?.label
                    }
                  </span>{" "}
                  ({displayData.length} регистров)
                </>
              ) : (
                <>Выберите устройство или регистр для просмотра показаний</>
              )}
            </p>

            {displayData.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="material-symbols-outlined">schedule</span>
                <span>
                  Обновлено:{" "}
                  {new Date(displayData[0]?.timestamp).toLocaleString("ru-RU")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chart View */}
        {viewMode === "chart" && selectedRegisterId && chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-surface-dark/30 rounded-lg p-6 border border-surface-dark"
          >
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              График изменения показаний
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9CA3AF"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  name={`Значение (${displayData[0]?.unit || ""})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Table View */}
        {(viewMode === "table" || !selectedRegisterId) && (
          <>
            {isFetchingReadings || isLoadingLatest ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : displayData.length > 0 ? (
              <CustomTable data={displayData} columns={columns} />
            ) : (
              <div className="text-center py-12 bg-surface-dark/30 rounded-lg border border-surface-dark">
                <div className="text-6xl mb-4">💾</div>
                <p className="text-gray-400 text-lg mb-2">
                  Нет данных для отображения
                </p>
                <p className="text-gray-500 text-sm">
                  {!selectedDeviceId && !selectedRegisterId
                    ? "Выберите устройство или регистр"
                    : "Показания для выбранного регистра отсутствуют"}
                </p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
