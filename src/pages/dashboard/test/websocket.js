import { useMemo, useState } from "react";
import Link from "next/link";
import { config } from "@/config";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { buildScadaWsUrl, useWebSocket } from "@/hooks/useWebsoket";

const DEFAULT_DEVICE_ID = "774b4d0d-e548-4629-bb9a-bf77c1b9b2d5";

export default function WebSocketTestPage() {
  const [channel, setChannel] = useState("devices");
  const [entityId, setEntityId] = useState(DEFAULT_DEVICE_ID);
  const [baseHttpUrl, setBaseHttpUrl] = useState(config.PYTHON_API_URL);

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

  const { status, messages, connect, disconnect, clearMessages, send } =
    useWebSocket(wsUrl, {
      autoConnect: false,
      autoReconnect: true,
      heartbeatInterval: 25000,
      heartbeatMessage: "ping",
      maxMessages: 150,
    });

  const statusColor =
    status === "open"
      ? "text-emerald-400"
      : status === "connecting"
        ? "text-yellow-300"
        : status === "error"
          ? "text-red-400"
          : "text-slate-300";

  const statusLabel =
    status === "open"
      ? "подключено"
      : status === "connecting"
        ? "подключение..."
        : status === "error"
          ? "ошибка"
          : "закрыто";

  return (
    <DashboardLayout headerTitle="Тест WebSocket">
      <div className="font-manrope py-6 space-y-5 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Тест WebSocket SCADA</h1>
          <Link
            href="/dashboard/test"
            className="text-sm text-blue-300 hover:text-blue-200"
          >
            ← Назад к тестовой странице
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-slate-300">Канал подписки</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded bg-black/30 border border-white/20 px-3 py-2"
              >
                <option value="devices">Устройства (devices)</option>
                <option value="tags">Теги (tags)</option>
              </select>
            </label>

            <label className="text-sm space-y-1 md:col-span-2">
              <span className="text-slate-300">UUID устройства/тега</span>
              <input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value.trim())}
                className="w-full rounded bg-black/30 border border-white/20 px-3 py-2"
                placeholder="Введите UUID"
              />
            </label>
          </div>

          <label className="text-sm space-y-1 block">
            <span className="text-slate-300">Базовый URL HTTP API</span>
            <input
              value={baseHttpUrl}
              onChange={(e) => setBaseHttpUrl(e.target.value.trim())}
              className="w-full rounded bg-black/30 border border-white/20 px-3 py-2"
              placeholder="http://localhost:8000/api/v1"
            />
          </label>

          <div className="text-xs text-slate-400 break-all">
            WebSocket URL: {wsUrl || "—"}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={connect}
              disabled={!wsUrl || status === "open" || status === "connecting"}
              className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-40"
            >
              Подключиться
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-2 rounded bg-rose-600"
            >
              Отключиться
            </button>
            <button
              onClick={() => send("ping")}
              disabled={status !== "open"}
              className="px-3 py-2 rounded bg-indigo-600 disabled:opacity-40"
            >
              Отправить ping
            </button>
            <button
              onClick={clearMessages}
              className="px-3 py-2 rounded bg-slate-700"
            >
              Очистить сообщения
            </button>

            <span className={`ml-auto text-sm font-semibold ${statusColor}`}>
              Статус: {statusLabel}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 text-sm text-slate-300">
            Сообщения ({messages.length})
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-auto pr-1">
            {[...messages].reverse().map((msg, idx) => (
              <div
                key={`${idx}-${msg.time || msg.text}`}
                className="rounded border border-white/10 bg-white/5 p-2 text-xs"
              >
                <div className="text-slate-400 mb-1">
                  {msg.direction} {msg.time ? `• ${msg.time}` : ""}
                </div>
                <pre className="whitespace-pre-wrap break-all text-slate-100">
                  {typeof msg.text === "string"
                    ? msg.text
                    : JSON.stringify(msg.text, null, 2)}
                </pre>
              </div>
            ))}
            {!messages.length && (
              <div className="text-xs text-slate-500">Пока сообщений нет.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
