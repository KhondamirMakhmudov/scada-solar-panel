import { useEffect, useMemo, useState } from "react";
import { get } from "lodash";
import { config } from "@/config";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { buildScadaWsUrl, useWebSocket } from "@/hooks/useWebsoket";
import useGetQuery from "@/hooks/all/useGetQuery";
import CustomSelect from "@/components/select";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WifiTetheringOutlinedIcon from "@mui/icons-material/WifiTetheringOutlined";
import CircleIcon from "@mui/icons-material/Circle";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import MoveToInboxOutlinedIcon from "@mui/icons-material/MoveToInboxOutlined";
import OutboxOutlinedIcon from "@mui/icons-material/OutboxOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";

const CHANNEL_META = {
  devices: {
    label: "Устройства",
    icon: SettingsOutlinedIcon,
    description: "Получить данные конкретного устройства SCADA",
  },
  tags: {
    label: "Теги",
    icon: WifiTetheringOutlinedIcon,
    description: "Получить данные конкретного тега (датчика)",
  },
};

export default function WebSocketTestPage() {
  const [channel, setChannel] = useState("devices");
  const [entityId, setEntityId] = useState("");
  const baseHttpUrl = config.WEBSOCKET_URL;

  const { data: devicesData, isLoading: isLoadingDevices } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
  });

  const { data: tagsData, isLoading: isLoadingTags } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
  });

  const deviceList = get(devicesData, "data.data", []);
  const tagList = get(tagsData, "data.data", []);

  const currentList = channel === "devices" ? deviceList : tagList;
  const isLoadingList =
    channel === "devices" ? isLoadingDevices : isLoadingTags;

  useEffect(() => {
    setEntityId("");
  }, [channel]);

  const entityOptions = useMemo(
    () =>
      currentList.map((item) => ({
        label: item.name || "Без названия",
        value: item.id,
      })),
    [currentList],
  );

  const wsUrl = useMemo(() => {
    try {
      return buildScadaWsUrl({
        baseHttpUrl,
        channel,
        id: entityId,
      });
    } catch {
      return "";
    }
  }, [baseHttpUrl, channel, entityId]);

  const { status, messages, connect, disconnect, clearMessages } = useWebSocket(
    wsUrl,
    {
      autoConnect: false,
      autoReconnect: true,
      heartbeatInterval: 25000,
      heartbeatMessage: "ping",
      maxMessages: 150,
    },
  );

  const isConnected = status === "open";
  const isConnecting = status === "connecting";
  const isError = status === "error";

  const messageStats = {
    total: messages.length,
    sent: messages.filter((m) => m.direction === "→").length,
    received: messages.filter((m) => m.direction === "←").length,
  };

  return (
    <DashboardLayout headerTitle="Тест WebSocket SCADA">
      <div className="font-manrope py-6 space-y-6 text-white max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">WebSocket SCADA Тестер</h1>
            <p className="text-slate-400 text-sm mt-1">
              Отладка и тестирование подключения к устройствам и тегам
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="relative z-20 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">
                Тип данных
              </h3>
              <div className="space-y-2">
                {Object.entries(CHANNEL_META).map(([key, preset]) => {
                  const ChannelIcon = preset.icon;

                  return (
                    <button
                      key={key}
                      onClick={() => setChannel(key)}
                      className={`w-full p-3 rounded-lg text-left transition border ${
                        channel === key
                          ? "bg-blue-500/30 border-blue-500/50"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <ChannelIcon
                          className="text-lg text-slate-100"
                          fontSize="inherit"
                        />
                        <div>
                          <div className="font-semibold text-sm">
                            {preset.label}
                          </div>
                          <div className="text-xs text-slate-400">
                            {preset.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  {channel === "devices" ? "Выбрать устройство" : "Выбрать тег"}
                </h3>
                {currentList.length > 0 && (
                  <span className="text-[10px] text-slate-500 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                    {currentList.length} записей
                  </span>
                )}
              </div>

              {isLoadingList ? (
                <div className="text-center py-3 text-slate-500 text-xs">
                  Загрузка списка...
                </div>
              ) : (
                <CustomSelect
                  value={entityId}
                  onChange={setEntityId}
                  options={entityOptions}
                  placeholder={
                    entityOptions.length ? "Выберите из списка" : "Нет данных"
                  }
                  sortOptions={false}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={connect}
                  disabled={!wsUrl || isConnected || isConnecting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
                >
                  Подключиться
                </button>
                <button
                  onClick={disconnect}
                  disabled={!isConnected && !isConnecting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
                >
                  Отключиться
                </button>
                <button
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition ml-auto"
                >
                  Очистить
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-200">
                  Сообщения
                </h3>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Всего: </span>
                    <span className="font-semibold text-slate-200">
                      {messageStats.total}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-400">Получено: </span>
                    <span className="font-semibold text-emerald-300">
                      {messageStats.received}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-400">Отправлено: </span>
                    <span className="font-semibold text-blue-300">
                      {messageStats.sent}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg border border-white/10 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2 p-3">
                  {messages.length > 0 ? (
                    [...messages].reverse().map((msg, idx) => {
                      const isIncoming = msg.direction === "←";
                      let parsedData = null;
                      let rawText = msg.text;

                      // Try to parse JSON data
                      if (typeof msg.text === "string") {
                        try {
                          parsedData = JSON.parse(msg.text);
                        } catch {
                          parsedData = null;
                        }
                      } else if (typeof msg.text === "object") {
                        parsedData = msg.text;
                      }

                      // Check if it's a sensor/tag data message
                      const isSensorData =
                        parsedData &&
                        (parsedData.tag_id ||
                          parsedData.tag_name ||
                          parsedData.value !== undefined);

                      return (
                        <div
                          key={`${idx}-${msg.time || msg.text}`}
                          className={`rounded-lg border transition ${
                            isIncoming
                              ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50"
                              : "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50"
                          }`}
                        >
                          {/* Header with direction and timestamp */}
                          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/5">
                            <span
                              className={`text-xs font-semibold inline-flex items-center gap-1.5 ${
                                isIncoming
                                  ? "text-emerald-400"
                                  : "text-blue-400"
                              }`}
                            >
                              {isIncoming ? (
                                <MoveToInboxOutlinedIcon fontSize="small" />
                              ) : (
                                <OutboxOutlinedIcon fontSize="small" />
                              )}
                              {isIncoming ? "Входящее" : "Исходящее"}
                            </span>
                            {msg.time && (
                              <span className="text-[10px] text-slate-500">
                                {new Date(msg.time).toLocaleTimeString(
                                  "ru-RU",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  },
                                )}
                              </span>
                            )}
                          </div>

                          {/* Sensor Data Display */}
                          {isSensorData ? (
                            <div className="p-3 space-y-2">
                              {/* Tag Name & Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold text-slate-100">
                                    {parsedData.tag_name || "Неизвестный тег"}
                                  </div>
                                  {parsedData.device_id && (
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      dev: {parsedData.device_id.slice(0, 8)}...
                                    </div>
                                  )}
                                </div>
                                {parsedData.is_error ? (
                                  <div className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500/20 border border-red-500/40 text-red-300">
                                    ОШИБКА
                                  </div>
                                ) : (
                                  <div className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                                    OK
                                  </div>
                                )}
                              </div>

                              {/* Main Value Display */}
                              <div className="bg-black/60 rounded-lg p-3 border border-white/10">
                                <div className="text-center">
                                  <div className="text-xs text-slate-400 mb-1">
                                    Значение
                                  </div>
                                  <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-2xl font-bold text-slate-100 font-mono">
                                      {parsedData.value ?? "—"}
                                    </span>
                                    {parsedData.unit && (
                                      <span className="text-xs text-slate-400 font-semibold">
                                        {parsedData.unit}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Error Message if present */}
                              {parsedData.error_message && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                                  <div className="text-[10px] text-red-300 font-mono">
                                    {parsedData.error_message}
                                  </div>
                                </div>
                              )}

                              {/* Metadata Grid */}
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                {parsedData.tag_id && (
                                  <div className="bg-white/5 rounded p-2 border border-white/10">
                                    <div className="text-slate-500 mb-0.5">
                                      Tag ID
                                    </div>
                                    <div className="text-slate-300 font-mono truncate">
                                      {parsedData.tag_id.slice(0, 12)}...
                                    </div>
                                  </div>
                                )}
                                {msg.time && (
                                  <div className="bg-white/5 rounded p-2 border border-white/10">
                                    <div className="text-slate-500 mb-0.5">
                                      Время
                                    </div>
                                    <div className="text-slate-300 font-mono">
                                      {new Date(msg.time).toLocaleString(
                                        "ru-RU",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        },
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Fallback for non-sensor messages */
                            <div className="p-3">
                              <div className="bg-black/50 rounded p-2 font-mono overflow-x-auto">
                                <pre className="whitespace-pre-wrap break-all text-slate-300 text-xs">
                                  {typeof rawText === "string"
                                    ? rawText
                                    : JSON.stringify(rawText, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <div className="mb-2 inline-flex text-2xl text-slate-400">
                        <MarkEmailUnreadOutlinedIcon fontSize="inherit" />
                      </div>
                      <div className="text-xs">
                        {isConnected
                          ? "Ожидание сообщений..."
                          : "Подключитесь для получения сообщений"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
