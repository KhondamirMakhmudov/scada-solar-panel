import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { get } from "lodash";
import { config } from "@/config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { buildScadaWsUrl, useWebSocket } from "@/hooks/useWebsoket";
import useGetQuery from "@/hooks/all/useGetQuery";
import CustomSelect from "@/components/select";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestScreens } from "@/services/api";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WifiTetheringOutlinedIcon from "@mui/icons-material/WifiTetheringOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSession } from "next-auth/react";

/* ---------- Visual constants ---------------------------------------------- */
// Cycle of saturated indicator colors used for tag accents + sparklines.
const TAG_PALETTE = [
  "#ff6b3d",
  "#3ee08f",
  "#4dd6ff",
  "#ffc857",
  "#b388ff",
  "#ff5c8a",
  "#ffd166",
  "#6affb8",
];

// Stable color from any tag_id (or name) — same id always picks same color.
function colorFor(seed) {
  if (!seed) return TAG_PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}

const RANGE_META = {
  "15m": { label: "15 мин", windowMs: 15 * 60 * 1000, interval: "PT5S" },
  "1h": { label: "1 час", windowMs: 60 * 60 * 1000, interval: "PT30S" },
  "6h": { label: "6 часов", windowMs: 6 * 60 * 60 * 1000, interval: "PT5M" },
  "24h": { label: "24 часа", windowMs: 24 * 60 * 60 * 1000, interval: "PT15M" },
};

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
  screens: {
    label: "Экраны",
    icon: DashboardOutlinedIcon,
    description: "Один сокет на все теги экрана (screen.tag_ids)",
  },
};

/* ---------- Helpers ------------------------------------------------------- */
function parsePayload(text) {
  if (!text) return null;
  if (typeof text === "object") return text;
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTimeMs(t) {
  if (!t) return "--:--:--.---";
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${String(
    d.getMilliseconds(),
  ).padStart(3, "0")}`;
}

function formatAxisTime(ms) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatUptime(sec) {
  return `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor((sec % 3600) / 60))}:${pad2(
    sec % 60,
  )}`;
}

/* ---------- Sparkline (inline SVG, no deps) ------------------------------- */
function Sparkline({
  data,
  color = "#3ee08f",
  width = 200,
  height = 28,
  area = true,
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => [
    i * step,
    height - ((d.v - min) / range) * (height - 4) - 2,
  ]);
  const line = pts
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(" ");
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", overflow: "visible" }}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${line} L${width},${height} L0,${height} Z`}
            fill={`url(#${gradId})`}
          />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2.2"
        fill={color}
      />
    </svg>
  );
}

/* ---------- Page --------------------------------------------------------- */
export default function WebSocketTestPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [channel, setChannel] = useState("devices");
  const [entityId, setEntityId] = useState("");
  const [filter, setFilter] = useState("all"); // all | recv | sent | err
  const [tagSearch, setTagSearch] = useState("");
  const baseHttpUrl = config.WEBSOCKET_URL;

  const { data: devicesData, isLoading: isLoadingDevices } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });
  const { data: tagsData, isLoading: isLoadingTags } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });
  const { data: screensData, isLoading: isLoadingScreens } = useGetQuery({
    key: KEYS.screens,
    url: URLS.screens,
    apiClient: requestScreens,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const deviceList = useMemo(() => get(devicesData, "data.data", []), [devicesData]);
  const tagList = useMemo(() => get(tagsData, "data.data", []), [tagsData]);
  const screenList = useMemo(() => {
    const raw = get(screensData, "data.data", get(screensData, "data", []));
    return Array.isArray(raw) ? raw : [];
  }, [screensData]);

  const currentList = useMemo(() => {
    if (channel === "devices") return deviceList;
    if (channel === "tags") return tagList;
    return screenList;
  }, [channel, deviceList, tagList, screenList]);

  const isLoadingList =
    channel === "devices"
      ? isLoadingDevices
      : channel === "tags"
        ? isLoadingTags
        : isLoadingScreens;

  useEffect(() => {
    setEntityId("");
    setTagSearch("");
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
        token: session?.accessToken,
      });
    } catch {
      return "";
    }
  }, [baseHttpUrl, channel, entityId, session?.accessToken]);

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

  /* Aggregate the most recent value + a short history per tag, fed from the
     real message stream. Same map drives the live-values grid and the log. */
  const tagState = useMemo(() => {
    const m = {};
    for (const msg of messages) {
      if (msg.direction !== "in") continue;
      const data = parsePayload(msg.text);
      if (!data || !data.tag_id) continue;
      if (!m[data.tag_id]) {
        m[data.tag_id] = { history: [], last: null };
      }
      const t = m[data.tag_id];
      t.last = data;
      const v =
        typeof data.value === "number" ? data.value : Number(data.value);
      if (Number.isFinite(v)) {
        t.history = [...t.history.slice(-49), { t: msg.time, v }];
      }
    }
    return m;
  }, [messages]);

  const activeTags = useMemo(
    () => Object.values(tagState).slice(0, 8),
    [tagState],
  );

  /* Historical trend, backed by GET /tag-values/aggregates (see
     FRONTEND_INTEGRATION.md: "не тяните сырые точки для графика — используйте
     этот endpoint"). Re-fetched every ~30s (nowTick) so the window slides
     forward; live WS points newer than the last bucket are appended on top. */
  const [range, setRange] = useState("1h");
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const tagIdsKey = useMemo(
    () =>
      activeTags
        .map((t) => t.last?.tag_id)
        .filter(Boolean)
        .sort()
        .join(","),
    [activeTags],
  );

  const { windowMs, interval } = RANGE_META[range];
  const { timeFrom, timeTo } = useMemo(
    () => ({
      timeFrom: new Date(nowTick - windowMs).toISOString(),
      timeTo: new Date(nowTick).toISOString(),
    }),
    [nowTick, windowMs],
  );

  const { data: aggregatesData, isFetching: isLoadingAggregates } =
    useGetQuery({
      key: KEYS.tagValuesAggregates,
      url: URLS.tagValuesAggregates,
      apiClient: requestScreens,
      params: { tagIds: tagIdsKey, timeFrom, timeTo, interval, fill: "locf" },
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
        Accept: "application/json",
      },
      enabled: Boolean(tagIdsKey) && !!session?.accessToken,
    });

  const trendTagNames = useMemo(
    () => activeTags.map((t) => t.last?.tag_name || t.last?.tag_id),
    [activeTags],
  );

  const trendSeries = useMemo(() => {
    const rows = new Map();
    const tagNameById = {};
    activeTags.forEach((t) => {
      if (t.last?.tag_id) {
        tagNameById[t.last.tag_id] = t.last.tag_name || t.last.tag_id;
      }
    });

    const series = get(aggregatesData, "data.data", []);
    let lastHistoricalMs = 0;
    series.forEach((s) => {
      const name = s.tagName || tagNameById[s.tagId] || s.tagId;
      (s.buckets || []).forEach((b) => {
        const ms = new Date(b.time).getTime();
        if (!Number.isFinite(ms) || b.avg == null) return;
        lastHistoricalMs = Math.max(lastHistoricalMs, ms);
        const row = rows.get(ms) || { ms };
        row[name] = b.avg;
        rows.set(ms, row);
      });
    });

    activeTags.forEach((t) => {
      const name = t.last?.tag_name || t.last?.tag_id;
      if (!name) return;
      t.history.forEach((pt) => {
        const ms = new Date(pt.t).getTime();
        if (!Number.isFinite(ms) || ms <= lastHistoricalMs) return;
        const row = rows.get(ms) || { ms };
        row[name] = pt.v;
        rows.set(ms, row);
      });
    });

    return Array.from(rows.values()).sort((a, b) => a.ms - b.ms);
  }, [aggregatesData, activeTags]);

  /* Uptime: counts seconds since connection opened. */
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    if (!isConnected) {
      setUptime(0);
      return;
    }
    const id = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  /* Filter for the log table. */
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filter === "recv") return m.direction === "in";
      if (filter === "sent") return m.direction === "out";
      if (filter === "err") {
        const d = parsePayload(m.text);
        return d && d.is_error;
      }
      return true;
    });
  }, [messages, filter]);

  const stats = {
    total: messages.length,
    sent: messages.filter((m) => m.direction === "out").length,
    received: messages.filter((m) => m.direction === "in").length,
  };

  const filteredTagList = useMemo(() => {
    if (!tagSearch) return currentList;
    const q = tagSearch.toLowerCase();
    return currentList.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [currentList, tagSearch]);

  return (
    <div className="w-full min-h-screen bg-[#0e0e0e] text-[#e5e2e1] p-6">
      <div className="font-manrope text-slate-200">
        {/* ============================================================
            TOP STATUS BAR
            ============================================================ */}
        <div className="flex items-stretch flex-wrap rounded-lg border border-white/10 bg-gradient-to-b from-[#0e131c] to-[#0a0d12] overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-4 py-2.5 border-r border-white/10">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center font-black text-slate-900 font-mono">
              S
            </div>
            <div>
              <div className="text-[10px] tracking-widest font-semibold text-slate-500">
                SCADA · CONSOLE
              </div>
              <div className="text-sm font-semibold text-white">
                WebSocket Тестер
              </div>
            </div>
          </div>

          <StatusChunk
            label="СОЕДИНЕНИЕ"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-emerald-400 shadow-[0_0_8px_#3ee08f] animate-pulse"
                      : isConnecting
                        ? "bg-amber-400 animate-pulse"
                        : isError
                          ? "bg-rose-400"
                          : "bg-slate-500"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    isConnected
                      ? "text-emerald-400"
                      : isConnecting
                        ? "text-amber-400"
                        : isError
                          ? "text-rose-400"
                          : "text-slate-400"
                  }`}
                >
                  {isConnected
                    ? "АКТИВНО"
                    : isConnecting
                      ? "ПОДКЛЮЧЕНИЕ"
                      : isError
                        ? "ОШИБКА"
                        : "ОТКЛЮЧЕНО"}
                </span>
              </span>
            }
          />
          <StatusChunk label="UPTIME" value={formatUptime(uptime)} mono />
          <StatusChunk
            label="КАНАЛ"
            value={entityId ? `/ws/${channel}/${entityId.slice(0, 8)}…` : "—"}
            mono
            muted={!entityId}
          />
          <StatusChunk
            label="RX"
            value={stats.received}
            mono
            color="text-emerald-400"
          />
          <StatusChunk
            label="TX"
            value={stats.sent}
            mono
            color="text-sky-400"
          />

          <div className="ml-auto flex items-center gap-2 px-4 py-2">
            <ToolBtn
              onClick={() => router.push("/dashboard/main")}
              accent="slate"
              title="Вернуться на главную"
            >
              <ArrowBackIcon style={{ fontSize: 14 }} />
              НАЗАД
            </ToolBtn>
            <ToolBtn
              disabled={!wsUrl || isConnected || isConnecting}
              onClick={connect}
              accent="emerald"
            >
              <PlayArrowRoundedIcon style={{ fontSize: 14 }} />
              ПОДКЛЮЧИТЬСЯ
            </ToolBtn>
            <ToolBtn
              disabled={!isConnected && !isConnecting}
              onClick={disconnect}
              accent="rose"
            >
              <StopRoundedIcon style={{ fontSize: 14 }} />
              ОТКЛЮЧИТЬСЯ
            </ToolBtn>
            <ToolBtn
              disabled={messages.length === 0}
              onClick={clearMessages}
              accent="slate"
            >
              <DeleteOutlineOutlinedIcon style={{ fontSize: 14 }} />
              ОЧИСТИТЬ
            </ToolBtn>
          </div>
        </div>

        {/* ============================================================
            BODY: rail + content
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* ----- LEFT RAIL ----- */}
          <div className="rounded-lg border border-white/10 bg-[#0c1118] overflow-hidden">
            {/* Channel toggle */}
            <div className="p-3 border-b border-white/10">
              <SectionLabel>ТИП ДАННЫХ</SectionLabel>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {Object.entries(CHANNEL_META).map(([key, preset]) => {
                  const Ico = preset.icon;
                  const active = channel === key;
                  const count =
                    key === "devices"
                      ? deviceList.length
                      : key === "tags"
                        ? tagList.length
                        : screenList.length;
                  return (
                    <button
                      key={key}
                      onClick={() => setChannel(key)}
                      className={`p-2.5 rounded text-left flex flex-col gap-1 transition border ${
                        active
                          ? "bg-[#1a2030] border-orange-500 text-orange-400"
                          : "bg-transparent border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <Ico style={{ fontSize: 14 }} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">
                        {preset.label}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {String(count).padStart(2, "0")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Entity picker */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <SectionLabel>
                  {channel === "devices"
                    ? "УСТРОЙСТВА"
                    : channel === "tags"
                      ? "ТЕГИ"
                      : "ЭКРАНЫ"}
                </SectionLabel>
                {currentList.length > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono border border-white/10 rounded px-1.5 py-0.5">
                    {currentList.length}
                  </span>
                )}
              </div>

              {channel === "devices" ? (
                isLoadingList ? (
                  <div className="text-center py-3 text-slate-500 text-xs">
                    Загрузка списка...
                  </div>
                ) : (
                  <CustomSelect
                    value={entityId}
                    onChange={setEntityId}
                    options={entityOptions}
                    placeholder={
                      entityOptions.length
                        ? "Выберите устройство"
                        : "Нет данных"
                    }
                    sortOptions={false}
                  />
                )
              ) : (
                <>
                  <div className="relative mb-2">
                    <SearchOutlinedIcon
                      style={{ fontSize: 14 }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="фильтр…"
                      className="w-full bg-[#070a0f] border border-white/10 text-slate-200 placeholder:text-slate-600 pl-7 pr-2 py-1.5 rounded text-xs outline-none focus:border-white/30"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto pr-1">
                    {isLoadingList ? (
                      <div className="text-center py-3 text-slate-500 text-xs">
                        Загрузка...
                      </div>
                    ) : filteredTagList.length === 0 ? (
                      <div className="text-center py-3 text-slate-500 text-xs">
                        Не найдено
                      </div>
                    ) : (
                      filteredTagList.map((t) => {
                        const active = entityId === t.id;
                        const c = colorFor(t.id);
                        const errored = tagState[t.id]?.last?.is_error;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setEntityId(t.id)}
                            className="rounded text-left flex items-center gap-2 px-2.5 py-1.5 text-xs border transition"
                            style={{
                              background: active ? "#1a2030" : "transparent",
                              borderColor: active ? "#2b3a55" : "transparent",
                              borderLeft: `2px solid ${
                                active ? c : "transparent"
                              }`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-none"
                              style={{
                                background: errored ? "#ff5c8a" : c,
                              }}
                            />
                            <span className="flex-1 min-w-0 truncate text-slate-200">
                              {t.name || "Без названия"}
                            </span>
                            {tagState[t.id]?.last?.unit && (
                              <span className="font-mono text-[10px] text-slate-500">
                                {tagState[t.id].last.unit}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ----- MAIN ----- */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Live tile grid (built from message history) */}
            <div className="rounded-lg border border-white/10 bg-[#0c1118] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SectionLabel>ТЕКУЩИЕ ЗНАЧЕНИЯ</SectionLabel>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono border border-emerald-900/50 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {activeTags.length > 0
                    ? `${activeTags.length} активн${
                        activeTags.length === 1 ? "ый" : "ых"
                      }`
                    : "ожидание данных…"}
                </span>
              </div>

              {activeTags.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  {isConnected
                    ? "Поток подключен. Ожидание первого сообщения…"
                    : "Подключитесь, чтобы увидеть текущие значения тегов"}
                </div>
              ) : (
                <>
                  {/* Tiles */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
                    {activeTags.map((t) => (
                      <TagTile key={t.last.tag_id} t={t} />
                    ))}
                  </div>

                  {/* Chart - historical trend from /tag-values/aggregates,
                      with the live WS tail appended on top */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <SectionLabel>ТРЕНД ЗНАЧЕНИЙ</SectionLabel>
                        {isLoadingAggregates && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            загрузка истории…
                          </span>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        {Object.entries(RANGE_META).map(([key, meta]) => (
                          <button
                            key={key}
                            onClick={() => setRange(key)}
                            className={`px-2.5 py-1 rounded font-mono font-semibold tracking-wide text-[10px] border transition ${
                              range === key
                                ? "bg-[#1a2030] border-[#2b3a55] text-orange-400"
                                : "border-white/10 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {meta.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <TrendChart series={trendSeries} tagNames={trendTagNames} />
                  </div>
                </>
              )}
            </div>

            {/* Message stream */}
            <div className="rounded-lg border border-white/10 bg-[#0c1118] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SectionLabel>ПОТОК СООБЩЕНИЙ</SectionLabel>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {filteredMessages.length} / {messages.length}
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {[
                    { k: "all", l: "ВСЕ", c: "text-slate-200" },
                    { k: "recv", l: "← RX", c: "text-emerald-400" },
                    { k: "sent", l: "→ TX", c: "text-sky-400" },
                    { k: "err", l: "ERR", c: "text-rose-400" },
                  ].map((o) => {
                    const active = filter === o.k;
                    return (
                      <button
                        key={o.k}
                        onClick={() => setFilter(o.k)}
                        className={`px-2.5 py-1 rounded font-mono font-semibold tracking-wide text-[10px] border transition ${
                          active
                            ? `bg-[#1a2030] border-[#2b3a55] ${o.c}`
                            : "border-white/10 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#070a0f] border border-white/10 rounded overflow-hidden">
                <div className="overflow-auto max-h-[55vh]">
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <MarkEmailUnreadOutlinedIcon
                        style={{ fontSize: 28 }}
                        className="text-slate-600 mb-2"
                      />
                      <div className="text-xs">
                        {isConnected
                          ? "Ожидание сообщений..."
                          : "Подключитесь для получения сообщений"}
                      </div>
                    </div>
                  ) : (
                    <table className="w-full font-mono text-[12px]">
                      <thead className="sticky top-0 bg-[#0a0d12] z-10">
                        <tr className="text-slate-500 text-[10px] tracking-wider font-semibold">
                          <Th>TIME</Th>
                          <Th>DIR</Th>
                          <Th>TAG</Th>
                          <Th align="right">VALUE</Th>
                          <Th>UNIT</Th>
                          <Th>STATUS</Th>
                          <Th>DEVICE</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredMessages].reverse().map((m, i) => (
                          <LogRow
                            key={`${m.time}-${i}`}
                            m={m}
                            alt={i % 2 === 1}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ----------------------------------------------- */
function TrendChart({ series, tagNames }) {
  const chartData = useMemo(
    () =>
      series.map((row) => ({
        ...row,
        time: formatAxisTime(row.ms),
      })),
    [series],
  );

  if (!tagNames || tagNames.length === 0) {
    return null;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-slate-500 text-xs py-4">Собираем данные...</div>
    );
  }

  return (
    <div
      className="w-full bg-[#070a0f] rounded border border-white/10 p-3"
      style={{ height: "340px" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" />
          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0a0d12",
              border: "1px solid #334155",
              borderRadius: "4px",
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Legend />
          {tagNames.map((key) => (
            <Line
              key={key}
              dataKey={key}
              stroke={colorFor(key)}
              dot={false}
              strokeWidth={2}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] text-slate-400 tracking-widest font-bold uppercase">
      {children}
    </div>
  );
}

function StatusChunk({ label, value, mono, color, muted }) {
  return (
    <div className="px-4 py-2 border-r border-white/10 flex flex-col justify-center gap-0.5 min-w-[120px]">
      <div className="text-[9px] text-slate-500 tracking-wider font-semibold">
        {label}
      </div>
      <div
        className={`text-[13px] font-semibold ${
          color || (muted ? "text-slate-500" : "text-slate-100")
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

const ACCENT = {
  emerald: "text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10",
  rose: "text-rose-400 border-rose-500/40 hover:bg-rose-500/10",
  slate: "text-slate-300 border-white/20 hover:bg-white/5",
};

function ToolBtn({ children, accent = "slate", disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-wider border bg-transparent transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent ${ACCENT[accent]}`}
    >
      {children}
    </button>
  );
}

function TagTile({ t }) {
  const last = t.last;
  const c = colorFor(last.tag_id || last.tag_name);
  const errored = !!last.is_error;
  const vals = t.history.map((d) => d.v);
  const min = vals.length ? Math.min(...vals) : null;
  const max = vals.length ? Math.max(...vals) : null;
  return (
    <div
      className="rounded p-3 flex flex-col gap-1.5 bg-[#0c1118] border border-white/10 hover:bg-[#0e1421] transition"
      style={{ borderTop: `2px solid ${errored ? "#ff5c8a" : c}` }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide truncate">
          {last.tag_name || "—"}
        </div>
        {errored ? (
          <span className="text-[9px] text-rose-400 border border-rose-900/60 rounded px-1 py-px font-mono inline-flex items-center gap-1">
            <ErrorOutlineOutlinedIcon style={{ fontSize: 9 }} />
            ERR
          </span>
        ) : (
          <span className="text-[9px] text-emerald-400 font-mono">OK</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-2xl font-bold font-mono tabular-nums"
          style={{ color: errored ? "#ff5c8a" : "#fff" }}
        >
          {typeof last.value === "number"
            ? last.value
            : Number.isFinite(Number(last.value))
              ? Number(last.value)
              : "—"}
        </span>
        {last.unit && (
          <span className="text-[11px] text-slate-500 font-mono">
            {last.unit}
          </span>
        )}
      </div>
      <Sparkline data={t.history} color={c} width={220} height={24} />
      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
        <span>min {min != null ? min.toFixed(2) : "—"}</span>
        {last.device_id && (
          <span className="text-slate-600 truncate max-w-[100px]">
            dev: {String(last.device_id).slice(0, 8)}
          </span>
        )}
        <span>max {max != null ? max.toFixed(2) : "—"}</span>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className="px-2.5 py-2 border-b border-white/10 whitespace-nowrap"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function LogRow({ m, alt }) {
  const isRecv = m.direction === "in";
  const dirColor = isRecv ? "text-emerald-400" : "text-sky-400";
  const d = parsePayload(m.text);
  const isErr = d?.is_error;
  return (
    <tr
      className={`border-b border-white/5 text-slate-400 ${
        alt ? "bg-white/[0.015]" : ""
      }`}
    >
      <Td>{formatTimeMs(m.time)}</Td>
      <Td>
        <span className={`font-bold ${dirColor}`}>
          {isRecv ? "←  RX" : "→  TX"}
        </span>
      </Td>
      <Td>
        <span className="text-slate-200">
          {d?.tag_name || <span className="text-slate-600">—</span>}
        </span>
      </Td>
      <Td align="right">
        <span
          className={`font-semibold ${isErr ? "text-rose-400" : "text-white"}`}
        >
          {d
            ? typeof d.value === "number"
              ? d.value
              : (d.value ?? "—")
            : typeof m.text === "string"
              ? m.text.slice(0, 20)
              : ""}
        </span>
      </Td>
      <Td>
        <span className="text-slate-500">{d?.unit || ""}</span>
      </Td>
      <Td>
        {isErr ? (
          <span className="text-rose-400 inline-flex items-center gap-1">
            <ErrorOutlineOutlinedIcon style={{ fontSize: 11 }} />
            ERR
          </span>
        ) : d ? (
          <span className="text-emerald-400">● OK</span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </Td>
      <Td>
        <span className="text-slate-500 text-[11px]">
          {d?.device_id ? String(d.device_id).slice(0, 12) : ""}
        </span>
      </Td>
    </tr>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td
      className="px-2.5 py-1.5 whitespace-nowrap tabular-nums"
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
