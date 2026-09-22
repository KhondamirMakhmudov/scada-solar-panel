import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { get } from "lodash";
import toast from "react-hot-toast";
import { config } from "@/config";

import { buildScadaWsUrl } from "@/hooks/useWebsoket";
import { useMultiWebSocket } from "@/hooks/useMultiWebSocket";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestScreens } from "@/services/api";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WifiTetheringOutlinedIcon from "@mui/icons-material/WifiTetheringOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSession } from "next-auth/react";

/* ---------- Visual constants ---------------------------------------------- */
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

function colorFor(seed) {
  if (!seed) return TAG_PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}

const CHANNEL_META = {
  devices: {
    label: "Устройства",
    icon: SettingsOutlinedIcon,
    description: "Один сокет на устройство — /ws/devices/{id}",
  },
  tags: {
    label: "Теги",
    icon: WifiTetheringOutlinedIcon,
    description: "Один сокет на тег — /ws/tags/{id}",
  },
  screens: {
    label: "Экраны",
    icon: DashboardOutlinedIcon,
    description: "Один сокет на экран (все теги экрана) — /ws/screens/{id}",
  },
};

/* ---------- Helpers ------------------------------------------------------- */
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

function formatUptime(sec) {
  return `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor((sec % 3600) / 60))}:${pad2(sec % 60)}`;
}

function byteLength(text) {
  if (typeof text !== "string") return 0;
  return new TextEncoder().encode(text).length;
}

function toHexDump(text) {
  const bytes = Array.from(new TextEncoder().encode(text ?? ""));
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = chunk.map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = chunk.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
    rows.push({ offset: i, hex, ascii });
  }
  return rows;
}

/* ---------- Sparkline (inline SVG, no deps) ------------------------------- */
function Sparkline({ data, color = "#3ee08f", width = 200, height = 24, area = true }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => [i * step, height - ((d.v - min) / range) * (height - 4) - 2]);
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {area && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

/* ---------- Bar sparkline for RX/s -----------------------------------------*/
function RateBars({ buckets, width = 90, height = 22, color = "#3ee08f" }) {
  if (!buckets || buckets.length === 0) return <div style={{ width, height }} />;
  const max = Math.max(...buckets, 1);
  const barW = width / buckets.length;
  return (
    <svg width={width} height={height}>
      {buckets.map((v, i) => {
        const h = Math.max(1, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * barW + 0.5}
            y={height - h}
            width={Math.max(1, barW - 1)}
            height={h}
            fill={color}
            opacity={0.35 + 0.65 * (i / buckets.length)}
          />
        );
      })}
    </svg>
  );
}

/* ---------- JSON pretty view (real, derived from the actual parsed frame) -*/
function JsonNode({ value, depth }) {
  if (value === null || value === undefined) return <span style={{ color: "#6b7280" }}>null</span>;
  if (typeof value === "boolean") return <span style={{ color: "#c084fc" }}>{String(value)}</span>;
  if (typeof value === "number") return <span style={{ color: "#4dd6ff" }}>{value}</span>;
  if (typeof value === "string") return <span style={{ color: "#3ee08f" }}>&quot;{value}&quot;</span>;

  const indent = "  ".repeat(depth + 1);
  const closeIndent = "  ".repeat(depth);

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "#8b9099" }}>[]</span>;
    return (
      <span>
        {"[\n"}
        {value.map((v, i) => (
          <span key={i}>
            {indent}
            <JsonNode value={v} depth={depth + 1} />
            {i < value.length - 1 ? "," : ""}
            {"\n"}
          </span>
        ))}
        {closeIndent}]
      </span>
    );
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return <span style={{ color: "#8b9099" }}>{"{}"}</span>;
    return (
      <span>
        {"{\n"}
        {keys.map((k, i) => (
          <span key={k}>
            {indent}
            <span style={{ color: "#ffc857" }}>&quot;{k}&quot;</span>
            {": "}
            <JsonNode value={value[k]} depth={depth + 1} />
            {i < keys.length - 1 ? "," : ""}
            {"\n"}
          </span>
        ))}
        {closeIndent}
        {"}"}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

/* ---------- Page --------------------------------------------------------- */
export default function WebSocketTestPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [channel, setChannel] = useState("devices");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | recv | ping | err
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedFrameSeq, setSelectedFrameSeq] = useState(null);
  const [frameTab, setFrameTab] = useState("json"); // json | raw | hex
  const [sendText, setSendText] = useState("ping");
  const baseHttpUrl = config.WEBSOCKET_URL;
  const streamRef = useRef(null);

  const { data: devicesData, isLoading: isLoadingDevices } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
    headers: { Authorization: `Bearer ${session?.accessToken}`, Accept: "application/json" },
    enabled: !!session?.accessToken,
  });
  const { data: tagsData, isLoading: isLoadingTags } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    headers: { Authorization: `Bearer ${session?.accessToken}`, Accept: "application/json" },
    enabled: !!session?.accessToken,
  });
  const { data: screensData, isLoading: isLoadingScreens } = useGetQuery({
    key: KEYS.screens,
    url: URLS.screens,
    apiClient: requestScreens,
    headers: { Authorization: `Bearer ${session?.accessToken}`, Accept: "application/json" },
    enabled: !!session?.accessToken,
  });

  const deviceList = useMemo(() => get(devicesData, "data.data", []), [devicesData]);
  const tagList = useMemo(() => get(tagsData, "data.data", []), [tagsData]);
  const screenList = useMemo(() => {
    const raw = get(screensData, "data.data", get(screensData, "data", []));
    return Array.isArray(raw) ? raw : [];
  }, [screensData]);
  const deviceNameById = useMemo(() => new Map(deviceList.map((d) => [d.id, d.name || d.id])), [deviceList]);

  const currentList = useMemo(() => {
    if (channel === "devices") return deviceList;
    if (channel === "tags") return tagList;
    return screenList;
  }, [channel, deviceList, tagList, screenList]);

  const isLoadingList =
    channel === "devices" ? isLoadingDevices : channel === "tags" ? isLoadingTags : isLoadingScreens;

  // Selection is scoped to the current channel — a device id and a tag id
  // can collide, and a stale cross-channel selection would silently open
  // sockets against the wrong endpoint.
  useEffect(() => {
    setSelectedIds(new Set());
    setEntitySearch("");
  }, [channel]);

  const filteredEntities = useMemo(() => {
    if (!entitySearch) return currentList;
    const q = entitySearch.toLowerCase();
    return currentList.filter((e) => {
      const name = (e.name || "").toLowerCase();
      const deviceName = channel === "tags" ? (deviceNameById.get(e.deviceId) || "").toLowerCase() : "";
      return name.includes(q) || deviceName.includes(q);
    });
  }, [currentList, entitySearch, channel, deviceNameById]);

  const toggleEntity = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelectedIds(new Set(filteredEntities.map((e) => e.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const selectedEntities = useMemo(
    () =>
      currentList
        .filter((e) => selectedIds.has(e.id))
        .map((e) => ({ id: e.id, name: e.name || e.id })),
    [currentList, selectedIds],
  );

  const buildUrl = useMemo(
    () => (entityId) => {
      if (!entityId) return null;
      try {
        return buildScadaWsUrl({ baseHttpUrl, channel, id: entityId, token: session?.accessToken });
      } catch {
        return null;
      }
    },
    [baseHttpUrl, channel, session?.accessToken],
  );

  const { connStatus, openCount, messages, reconnectCount, sendToAll, clearMessages } = useMultiWebSocket({
    entities: selectedEntities,
    buildUrl,
    enabled: isRunning,
    heartbeatInterval: 25000,
    heartbeatMessage: "ping",
    maxMessages: 600,
  });

  const isSecure = /^wss:/i.test(buildUrl(selectedEntities[0]?.id) || (baseHttpUrl?.startsWith("https") ? "wss:" : "ws:"));

  /* Uptime counts from the moment at least one socket has ever opened while running. */
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    if (!isRunning || openCount === 0) return undefined;
    const id = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, openCount]);
  useEffect(() => {
    if (!isRunning) setUptime(0);
  }, [isRunning]);

  /* Aggregate latest value + short history per tag, across every connected
     entity. WEBSOCKET_API.md: initial snapshot arrives newest-first, so
     "last received" isn't "current" — sort by the server's own `time`. */
  const tagState = useMemo(() => {
    const byTag = {};
    for (const msg of messages) {
      if (msg.direction !== "in" || !msg.parsed?.tag_id) continue;
      const data = msg.parsed;
      const serverMs = Date.parse(data.time);
      const ms = Number.isFinite(serverMs) ? serverMs : Date.parse(msg.time);
      (byTag[data.tag_id] ||= []).push({ ms, data, entityName: msg.entityName });
    }
    const m = {};
    for (const [tagId, points] of Object.entries(byTag)) {
      points.sort((a, b) => a.ms - b.ms);
      const history = points
        .map((p) => {
          const v = typeof p.data.value === "number" ? p.data.value : Number(p.data.value);
          return Number.isFinite(v) ? { t: p.ms, v } : null;
        })
        .filter(Boolean)
        .slice(-50);
      const lastPoint = points[points.length - 1];
      m[tagId] = { history, last: lastPoint.data, sourceName: lastPoint.entityName };
    }
    return m;
  }, [messages]);

  const activeTags = useMemo(() => Object.values(tagState).slice(0, 12), [tagState]);
  const sourceCount = useMemo(() => new Set(activeTags.map((t) => t.sourceName)).size, [activeTags]);

  /* Real per-second RX rate, last 20s, from actual message timestamps. */
  const rxRateBuckets = useMemo(() => {
    const now = Date.now();
    const buckets = new Array(20).fill(0);
    for (const msg of messages) {
      if (msg.direction !== "in") continue;
      const ms = Date.parse(msg.time);
      const bucket = 19 - Math.floor((now - ms) / 1000);
      if (bucket >= 0 && bucket < 20) buckets[bucket] += 1;
    }
    return buckets;
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filter === "recv") return m.direction === "in";
      if (filter === "ping") return m.direction === "out";
      if (filter === "err") return m.direction === "in" && m.parsed?.is_error;
      return true;
    });
  }, [messages, filter]);

  useEffect(() => {
    if (autoScroll && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [filteredMessages, autoScroll]);

  const stats = useMemo(
    () => ({
      total: messages.length,
      received: messages.filter((m) => m.direction === "in").length,
      pinged: messages.filter((m) => m.direction === "out").length,
      errored: messages.filter((m) => m.direction === "in" && m.parsed?.is_error).length,
    }),
    [messages],
  );

  const selectedFrame = useMemo(
    () => messages.find((m) => m.seq === selectedFrameSeq) || null,
    [messages, selectedFrameSeq],
  );
  const selectedFrameIndex = useMemo(
    () => (selectedFrame ? messages.indexOf(selectedFrame) : -1),
    [messages, selectedFrame],
  );
  const prevFrame = selectedFrameIndex > 0 ? messages[selectedFrameIndex - 1] : null;
  const frameDeltaMs =
    selectedFrame && prevFrame ? Date.parse(selectedFrame.time) - Date.parse(prevFrame.time) : null;

  useEffect(() => {
    if (!selectedFrameSeq && filteredMessages.length > 0) {
      setSelectedFrameSeq(filteredMessages[filteredMessages.length - 1].seq);
    }
  }, [filteredMessages, selectedFrameSeq]);

  const tokenExpiresIn = useMemo(() => {
    if (!session?.accessTokenExpires) return null;
    const ms = session.accessTokenExpires - Date.now();
    return ms > 0 ? Math.round(ms / 60000) : 0;
  }, [session?.accessTokenExpires]);

  const isConnected = isRunning && openCount > 0;
  const isConnecting = isRunning && selectedEntities.length > 0 && openCount === 0;

  const handleCopyFrame = () => {
    if (!selectedFrame) return;
    navigator.clipboard?.writeText(selectedFrame.raw ?? "").then(
      () => toast.success("Скопировано"),
      () => toast.error("Не удалось скопировать"),
    );
  };

  const handleSend = () => {
    if (!sendText.trim()) return;
    const sent = sendToAll(sendText);
    if (!sent) toast.error("Нет открытых сокетов");
  };

  return (
    <div className="w-full min-h-screen bg-[#0e0e0e] text-[#e5e2e1] p-6">
      <div className="font-ibmPlexSans text-text-primary">
        {/* ============================================================
            TOP STATUS BAR
            ============================================================ */}
        <div className="flex items-stretch flex-wrap rounded-xl border border-white/10 bg-gradient-to-b from-[#0e131c] to-[#0a0d12] overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-4 py-2.5 border-r border-white/10">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center font-black text-surface-dark font-mono">
              S
            </div>
            <div>
              <div className="text-[12.5px] tracking-widest font-semibold text-text-dim">SCADA · CONSOLE</div>
              <div className="text-sm font-semibold text-white">WebSocket Тестер</div>
            </div>
          </div>

          <StatusChunk
            label="СОСТОЯНИЕ"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-emerald-400 shadow-[0_0_8px_#3ee08f] animate-pulse"
                      : isConnecting
                        ? "bg-amber-400 animate-pulse"
                        : "bg-text-dim"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    isConnected ? "text-emerald-400" : isConnecting ? "text-amber-400" : "text-text-muted"
                  }`}
                >
                  {isConnected ? "АКТИВНО" : isConnecting ? "ПОДКЛЮЧЕНИЕ" : "ОСТАНОВЛЕНО"}
                </span>
              </span>
            }
          />
          <StatusChunk label="UPTIME" value={formatUptime(uptime)} mono />
          <StatusChunk
            label="СОКЕТЫ"
            value={`${openCount}/${selectedEntities.length}`}
            mono
            title="Открытых сокетов из выбранных сущностей — по одному сокету на сущность"
          />
          <StatusChunk label="RX" value={stats.received} mono color="text-emerald-400" title="Реальные сообщения от сервера" />
          <StatusChunk
            label="PING"
            value={stats.pinged}
            mono
            color="text-text-dim"
            title="Keepalive-кадры браузера — сервер их не интерпретирует, это не часть протокола API"
          />
          <StatusChunk label="ОШИБКИ" value={stats.errored} mono color={stats.errored ? "text-rose-400" : undefined} />
          <StatusChunk label="РЕКОННЕКТ" value={reconnectCount} mono />

          <div className="ml-auto flex items-center gap-4 px-4 py-2">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[11.5px] text-text-dim tracking-wider font-semibold">RX/С</span>
              <RateBars buckets={rxRateBuckets} color="#3ee08f" />
            </div>
            <ToolBtn onClick={() => router.push("/dashboard/main")} accent="slate" title="Вернуться на главную">
              <ArrowBackIcon style={{ fontSize: 14 }} />
              НАЗАД
            </ToolBtn>
            {!isRunning ? (
              <ToolBtn disabled={selectedEntities.length === 0} onClick={() => setIsRunning(true)} accent="emerald">
                <PlayArrowRoundedIcon style={{ fontSize: 14 }} />
                ПОДКЛЮЧИТЬСЯ
              </ToolBtn>
            ) : (
              <ToolBtn onClick={() => setIsRunning(false)} accent="rose">
                <StopRoundedIcon style={{ fontSize: 14 }} />
                ОТКЛЮЧИТЬСЯ
              </ToolBtn>
            )}
            <ToolBtn disabled={messages.length === 0} onClick={clearMessages} accent="slate">
              <DeleteOutlineOutlinedIcon style={{ fontSize: 14 }} />
              ОЧИСТИТЬ
            </ToolBtn>
          </div>
        </div>

        {/* ============================================================
            BODY: rail + content + inspector
            ============================================================ */}
        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr_320px] gap-4">
          {/* ----- LEFT RAIL ----- */}
          <div className="rounded-xl border border-white/10 bg-[#0c1118] overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/10">
              <SectionLabel>ТИП ДАННЫХ</SectionLabel>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {Object.entries(CHANNEL_META).map(([key, preset]) => {
                  const Ico = preset.icon;
                  const active = channel === key;
                  const count =
                    key === "devices" ? deviceList.length : key === "tags" ? tagList.length : screenList.length;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={preset.description}
                      onClick={() => setChannel(key)}
                      className={`min-w-0 p-2.5 rounded-lg text-left flex flex-col gap-1 transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c1118] border ${
                        active
                          ? "bg-white/[0.07] border-white/70 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                          : "bg-transparent border-white/10 text-text-muted hover:border-white/25 hover:bg-white/[0.03]"
                      }`}
                    >
                      <Ico style={{ fontSize: 14 }} />
                      <span className="text-[12.5px] uppercase font-semibold leading-tight break-words">
                        {preset.label}
                      </span>
                      <span className={`text-[11.5px] font-mono ${active ? "text-white/80" : "text-text-dim"}`}>
                        {String(count).padStart(2, "0")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 flex-1 min-h-0 flex flex-col">
              <div className="relative mb-2">
                <SearchOutlinedIcon
                  style={{ fontSize: 14 }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim"
                />
                <input
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  placeholder="фильтр по имени…"
                  className="w-full bg-[#070a0f] border border-white/10 text-text-primary placeholder:text-text-faint pl-7 pr-2 py-1.5 rounded-lg text-xs outline-none transition-colors hover:border-white/20 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/40"
                />
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12.5px] text-text-dim font-mono">
                  подписка: {selectedIds.size} из {currentList.length}
                </span>
                <div className="flex items-center gap-2 text-[12.5px] font-mono">
                  <button
                    type="button"
                    onClick={selectAll}
                    disabled={filteredEntities.length === 0}
                    className="text-sky-400 hover:text-sky-300 disabled:text-text-faint disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/60 rounded"
                  >
                    ВСЕ
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedIds.size === 0}
                    className="text-rose-400 hover:text-rose-300 disabled:text-text-faint disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400/60 rounded"
                  >
                    СБРОС
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 overflow-y-auto pr-1" style={{ maxHeight: "38vh" }}>
                {isLoadingList ? (
                  <div className="text-center py-3 text-text-dim text-xs">Загрузка...</div>
                ) : filteredEntities.length === 0 ? (
                  <div className="text-center py-3 text-text-dim text-xs">Не найдено</div>
                ) : (
                  filteredEntities.map((entity) => {
                    const checked = selectedIds.has(entity.id);
                    const status = connStatus.get(entity.id);
                    const dotColor =
                      status === "open"
                        ? "#3ee08f"
                        : status === "connecting"
                          ? "#ffc857"
                          : status === "error"
                            ? "#ff5c8a"
                            : "#3a3a3a";
                    const deviceName = channel === "tags" ? deviceNameById.get(entity.deviceId) : null;
                    return (
                      <label
                        key={entity.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEntity(entity.id)}
                          className="accent-orange-500 cursor-pointer flex-shrink-0"
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: dotColor, boxShadow: status === "open" ? `0 0 5px ${dotColor}` : "none" }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-text-primary">
                            {formatTagLabelShort(entity.name || "Без названия")}
                          </span>
                          {deviceName && (
                            <span className="block truncate text-[12.5px] text-text-dim font-mono">{deviceName}</span>
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3 border-t border-white/10">
              <SectionLabel>ПАРАМЕТРЫ СЕССИИ</SectionLabel>
              <div className="mt-2 space-y-1.5">
                <SessionRow label="Схема" value={isSecure ? "wss (TLS)" : "ws"} />
                <SessionRow label="Формат" value="JSON, 1 значение/кадр" />
                <SessionRow label="Интервал ping" value="25 с" />
                <SessionRow label="Reconnect" value="авто · экспоненциальный backoff" />
                <SessionRow
                  label="Токен"
                  value={
                    tokenExpiresIn === null
                      ? "—"
                      : tokenExpiresIn > 0
                        ? `действителен · ${tokenExpiresIn} мин`
                        : "истёк"
                  }
                  valueColor={tokenExpiresIn === 0 ? "text-rose-400" : undefined}
                />
              </div>
            </div>
          </div>

          {/* ----- MAIN ----- */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Live tile grid */}
            <div className="rounded-xl border border-white/10 bg-[#0c1118] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SectionLabel>ТЕКУЩИЕ ЗНАЧЕНИЯ</SectionLabel>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-400 font-mono border border-emerald-900/50 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <span className="text-[13px] text-text-dim font-mono">
                  {activeTags.length > 0
                    ? `${sourceCount} источник${sourceCount === 1 ? "" : "ов"} · ${activeTags.length} тег${activeTags.length === 1 ? "" : "ов"}`
                    : "ожидание данных…"}
                </span>
              </div>

              {activeTags.length === 0 ? (
                <div className="text-center py-10 text-text-dim text-xs">
                  {isRunning
                    ? selectedEntities.length === 0
                      ? "Выберите устройства/теги/экраны слева"
                      : "Сокеты подключены. Ожидание первого сообщения…"
                    : "Выберите сущности и нажмите «Подключиться»"}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                  {activeTags.map((t) => (
                    <TagTile key={t.last.tag_id} t={t} />
                  ))}
                </div>
              )}
            </div>

            {/* Message stream */}
            <div className="rounded-xl border border-white/10 bg-[#0c1118] p-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <SectionLabel>ПОТОК СООБЩЕНИЙ</SectionLabel>
                  <span className="text-[13px] text-text-dim font-mono">
                    {filteredMessages.length} / {messages.length} кадров
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoScroll((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-semibold tracking-wide text-[12.5px] border transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
                      autoScroll
                        ? "bg-[#1a2030] border-[#2b3a55] text-orange-400"
                        : "border-white/10 text-text-dim hover:text-text-secondary"
                    }`}
                  >
                    ● АВТОПРОКРУТКА
                  </button>
                  <div className="flex gap-0.5">
                    {[
                      { k: "all", l: "ВСЕ", c: "text-text-primary" },
                      { k: "recv", l: "← RX", c: "text-emerald-400", title: "Данные от сервера" },
                      {
                        k: "ping",
                        l: "→ PING",
                        c: "text-text-dim",
                        title: "Keepalive-кадры браузера — не часть протокола",
                      },
                      { k: "err", l: "ERR", c: "text-rose-400" },
                    ].map((o) => {
                      const active = filter === o.k;
                      return (
                        <button
                          key={o.k}
                          type="button"
                          title={o.title}
                          onClick={() => setFilter(o.k)}
                          className={`px-2.5 py-1 rounded-lg font-mono font-semibold tracking-wide text-[12.5px] border transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
                            active
                              ? `bg-[#1a2030] border-[#2b3a55] ${o.c}`
                              : "border-white/10 text-text-dim hover:text-text-secondary"
                          }`}
                        >
                          {o.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-[#070a0f] border border-white/10 rounded-lg overflow-hidden flex-1 min-h-0">
                <div ref={streamRef} className="overflow-auto h-full" style={{ maxHeight: "42vh" }}>
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-10 text-text-dim">
                      <MarkEmailUnreadOutlinedIcon style={{ fontSize: 28 }} className="text-text-faint mb-2" />
                      <div className="text-xs">
                        {isRunning ? "Ожидание сообщений..." : "Подключитесь для получения сообщений"}
                      </div>
                    </div>
                  ) : (
                    <table className="w-full font-mono text-[14px]">
                      <thead className="sticky top-0 bg-[#0a0d12] z-10">
                        <tr className="text-text-dim text-[12.5px] tracking-wider font-semibold">
                          <Th>ВРЕМЯ</Th>
                          <Th>НАПР</Th>
                          <Th>ИСТОЧНИК</Th>
                          <Th>ТЕГ</Th>
                          <Th align="right">ЗНАЧЕНИЕ</Th>
                          <Th>СТАТУС</Th>
                          <Th align="right">РАЗМЕР</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMessages.map((m, i) => (
                          <LogRow
                            key={m.seq}
                            m={m}
                            alt={i % 2 === 1}
                            selected={m.seq === selectedFrameSeq}
                            onSelect={() => setSelectedFrameSeq(m.seq)}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ----- RIGHT: FRAME INSPECTOR ----- */}
          <div className="rounded-xl border border-white/10 bg-[#0c1118] p-4 flex flex-col gap-3 xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto">
            {!selectedFrame ? (
              <div className="text-center py-10 text-text-dim text-xs">Выберите кадр в потоке сообщений</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12.5px] text-text-dim font-mono">
                      КАДР #{selectedFrame.seq} ·{" "}
                      {selectedFrame.direction === "in"
                        ? "RX"
                        : selectedFrame.direction === "out"
                          ? "PING"
                          : "СИСТЕМА"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFrame}
                    className="inline-flex items-center gap-1 text-[12.5px] font-mono text-text-dim hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500/60 rounded px-1.5 py-0.5"
                  >
                    <ContentCopyOutlinedIcon style={{ fontSize: 12 }} />
                    КОПИЯ
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                  <MetaField label="НАПРАВЛЕНИЕ" value={selectedFrame.direction === "in" ? "RX (сервер → клиент)" : selectedFrame.direction === "out" ? "PING (клиент → сервер)" : "событие сокета"} />
                  <MetaField label="ИСТОЧНИК" value={`${channel}/${selectedFrame.entityName || "—"}`} />
                  <MetaField label="ВРЕМЯ" value={formatTimeMs(selectedFrame.time)} mono />
                  <MetaField label="Δt ОТ ПРЕД." value={frameDeltaMs === null ? "—" : `${frameDeltaMs} мс`} mono />
                </div>

                <div className="flex gap-0.5">
                  {["json", "raw", "hex"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFrameTab(tab)}
                      disabled={tab === "json" && !selectedFrame.parsed}
                      className={`px-2.5 py-1 rounded-lg font-mono font-semibold tracking-wide text-[12.5px] border transition-all active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
                        frameTab === tab
                          ? "bg-[#1a2030] border-[#2b3a55] text-orange-400"
                          : "border-white/10 text-text-dim hover:text-text-secondary"
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                  <span className="ml-auto text-[12.5px] text-text-dim font-mono self-center">
                    {byteLength(selectedFrame.raw)} Б
                  </span>
                </div>

                <div className="bg-[#070a0f] border border-white/10 rounded-lg p-3 overflow-auto" style={{ maxHeight: "34vh" }}>
                  {frameTab === "json" && selectedFrame.parsed ? (
                    <pre className="text-[13px] font-mono leading-relaxed whitespace-pre-wrap text-text-secondary m-0">
                      <JsonNode value={selectedFrame.parsed} depth={0} />
                    </pre>
                  ) : frameTab === "hex" ? (
                    <div className="text-[13px] font-mono leading-relaxed text-text-secondary">
                      {toHexDump(selectedFrame.raw).map((row) => (
                        <div key={row.offset} className="flex gap-3 whitespace-nowrap">
                          <span className="text-text-faint">{row.offset.toString(16).padStart(6, "0")}</span>
                          <span className="text-sky-300">{row.hex}</span>
                          <span className="text-text-dim">{row.ascii}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="text-[13px] font-mono leading-relaxed whitespace-pre-wrap text-text-secondary m-0">
                      {selectedFrame.raw}
                    </pre>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10">
                  <SectionLabel>ОТПРАВИТЬ ТЕКСТ</SectionLabel>
                  <p className="text-[12.5px] text-text-dim mt-1 mb-2 leading-relaxed">
                    У сервера нет протокола команд (WEBSOCKET_API.md) — любой текст воспринимается только как
                    keepalive и не обрабатывается. Отправляется во все открытые сокеты.
                  </p>
                  <textarea
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    rows={2}
                    className="w-full bg-[#070a0f] border border-white/10 text-text-primary placeholder:text-text-faint px-2.5 py-2 rounded-lg text-xs font-mono outline-none transition-colors hover:border-white/20 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/40 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setSendText("ping")}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-text-dim text-[13px] font-mono hover:text-text-secondary hover:border-white/25 transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                    >
                      ping
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={openCount === 0}
                      className="flex-1 py-1.5 rounded-lg bg-orange-500 text-[#0a0d12] text-[13px] font-bold tracking-wide hover:brightness-110 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c1118]"
                    >
                      ОТПРАВИТЬ
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ----------------------------------------------- */
function SectionLabel({ children }) {
  return <div className="text-[12.5px] text-text-muted tracking-widest font-bold uppercase">{children}</div>;
}

function StatusChunk({ label, value, mono, color, muted, title }) {
  return (
    <div title={title} className="px-4 py-2 border-r border-white/10 flex flex-col justify-center gap-0.5 min-w-[100px]">
      <div className="text-[11.5px] text-text-dim tracking-wider font-semibold">{label}</div>
      <div
        className={`text-[14.5px] font-semibold ${color || (muted ? "text-text-dim" : "text-text-primary")} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function SessionRow({ label, value, valueColor }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-text-dim">{label}</span>
      <span className={`text-[13px] font-mono ${valueColor || "text-text-secondary"}`}>{value}</span>
    </div>
  );
}

function MetaField({ label, value, mono }) {
  return (
    <div>
      <div className="text-[11.5px] text-text-dim tracking-wider font-semibold">{label}</div>
      <div className={`text-text-secondary truncate ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

const ACCENT = {
  emerald: "text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 focus-visible:ring-emerald-500/60",
  rose: "text-rose-400 border-rose-500/40 hover:bg-rose-500/10 focus-visible:ring-rose-500/60",
  slate: "text-text-secondary border-white/20 hover:bg-white/5 focus-visible:ring-white/40",
};

function ToolBtn({ children, accent = "slate", disabled, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold tracking-wider border bg-transparent transition-all enabled:active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0d12] ${ACCENT[accent]}`}
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
      className="rounded-lg p-3 flex flex-col gap-1.5 bg-[#0c1118] border border-white/10 hover:bg-[#0e1421] transition-colors"
      style={{ borderTop: `2px solid ${errored ? "#ff5c8a" : c}` }}
      title={t.sourceName}
    >
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] text-text-muted font-semibold uppercase tracking-wide truncate">
          {formatTagLabelShort(last.tag_name || "—")}
        </div>
        {errored ? (
          <span className="text-[11.5px] text-rose-400 border border-rose-900/60 rounded px-1 py-px font-mono inline-flex items-center gap-1 flex-shrink-0">
            <ErrorOutlineOutlinedIcon style={{ fontSize: 9 }} />
            ERR
          </span>
        ) : (
          <span className="text-[11.5px] text-emerald-400 font-mono flex-shrink-0">OK</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: errored ? "#ff5c8a" : "#fff" }}>
          {typeof last.value === "number" ? last.value : Number.isFinite(Number(last.value)) ? Number(last.value) : "—"}
        </span>
        {last.unit && <span className="text-[13px] text-text-dim font-mono">{last.unit}</span>}
      </div>
      <Sparkline data={t.history} color={c} width={220} height={24} />
      <div className="flex justify-between text-[11.5px] text-text-dim font-mono">
        <span>min {min != null ? min.toFixed(2) : "—"}</span>
        <span className="text-text-faint truncate max-w-[100px]">{t.sourceName}</span>
        <span>max {max != null ? max.toFixed(2) : "—"}</span>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th className="px-2.5 py-2 border-b border-white/10 whitespace-nowrap" style={{ textAlign: align }}>
      {children}
    </th>
  );
}

function LogRow({ m, alt, selected, onSelect }) {
  const dirMeta =
    m.direction === "in"
      ? { label: "← RX", color: "text-emerald-400" }
      : m.direction === "out"
        ? { label: "→ PING", color: "text-text-dim" }
        : { label: "• СИСТЕМА", color: "text-amber-400" };
  const d = m.parsed;
  const isErr = d?.is_error;
  return (
    <tr
      onClick={onSelect}
      className={`border-b border-white/5 text-text-muted cursor-pointer transition-colors ${
        selected ? "bg-orange-500/10" : alt ? "bg-white/[0.015] hover:bg-white/[0.03]" : "hover:bg-white/[0.03]"
      }`}
    >
      <Td>{formatTimeMs(m.time)}</Td>
      <Td>
        <span className={`font-bold ${dirMeta.color}`}>{dirMeta.label}</span>
      </Td>
      <Td>
        <span className="text-text-dim truncate inline-block max-w-[110px] align-bottom">{m.entityName || "—"}</span>
      </Td>
      <Td>
        <span className="text-text-primary">{d?.tag_name || <span className="text-text-faint">—</span>}</span>
      </Td>
      <Td align="right">
        <span className={`font-semibold ${isErr ? "text-rose-400" : "text-white"}`}>
          {d ? (typeof d.value === "number" ? d.value : (d.value ?? "—")) : m.raw?.slice(0, 20) || ""}
        </span>
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
          <span className="text-text-faint">—</span>
        )}
      </Td>
      <Td align="right">
        <span className="text-text-dim text-[13px]">{byteLength(m.raw)} Б</span>
      </Td>
    </tr>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums" style={{ textAlign: align }}>
      {children}
    </td>
  );
}
