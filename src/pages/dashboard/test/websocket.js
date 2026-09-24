import { useEffect, useMemo, useRef, useState } from "react";
import { get } from "lodash";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import MonitorRoundedIcon from "@mui/icons-material/MonitorRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PushPinRoundedIcon from "@mui/icons-material/PushPinRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import { config } from "@/config";
import { buildScadaWsUrl } from "@/hooks/useWebsoket";
import { useMultiWebSocket } from "@/hooks/useMultiWebSocket";
import useAllPages from "@/hooks/all/useAllPages";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestScreens } from "@/services/api";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import MethodModal from "@/components/modal/method-modal";
import { Panel, EmptyState, SegmentedControl, seriesColor } from "@/components/ui";
import { STATUS_COLOR } from "@/constants/statusPalette";

/* ---------- Каналы --------------------------------------------------------
   Три эндпоинта из WEBSOCKET_API.md. Путь показан буквально: на странице
   диагностики важно видеть, какой именно сокет будет открыт. */
const CHANNEL_META = {
  devices: {
    label: "Устройства",
    icon: MemoryRoundedIcon,
    path: "/api/v1/ws/devices/{id}",
    note: "Один сокет на устройство — придут значения всех его тегов.",
  },
  tags: {
    label: "Теги",
    icon: SellRoundedIcon,
    path: "/api/v1/ws/tags/{id}",
    note: "Один сокет на тег — придут значения только этого тега.",
  },
  screens: {
    label: "Экраны",
    icon: MonitorRoundedIcon,
    path: "/api/v1/ws/screens/{id}",
    note: "Один сокет на экран — придут значения всех тегов экрана.",
  },
};

const SOCKET_META = {
  open: { label: "открыт", color: STATUS_COLOR.ok },
  connecting: { label: "подключение", color: STATUS_COLOR.warn },
  error: { label: "ошибка", color: STATUS_COLOR.alarm },
  closed: { label: "закрыт", color: STATUS_COLOR.idle },
};
const socketMeta = (status) => SOCKET_META[status] || { label: "не открыт", color: "#3a3a3a" };

/* ---------- Форматирование ------------------------------------------------ */
const pad2 = (n) => String(n).padStart(2, "0");

function formatTimeMs(t) {
  if (!t) return "--:--:--.---";
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${String(
    d.getMilliseconds(),
  ).padStart(3, "0")}`;
}

const formatUptime = (sec) =>
  `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor((sec % 3600) / 60))}:${pad2(sec % 60)}`;

function byteLength(text) {
  if (typeof text !== "string") return 0;
  return new TextEncoder().encode(text).length;
}

/**
 * Значение тега для показа человеку. Приборы отдают float32, и после
 * пересчёта в double из 0.3 получается 0.30000001192092896 — такую строку
 * нельзя ни прочитать, ни уместить в плитку (раньше она растягивала сетку и
 * добавляла горизонтальную прокрутку странице). Семь значащих цифр — предел
 * точности float32, поэтому округление до них убирает мусор хвоста и не
 * портит настоящие значения. Исходное число остаётся в подсказке и на
 * вкладках «Поля»/«Текст», где важна точная форма кадра.
 */
function formatValue(raw) {
  if (raw === null || raw === undefined || raw === "") return "—";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  if (Number.isInteger(n)) return String(n);

  const abs = Math.abs(n);
  if (abs >= 1e9 || abs < 1e-4) return n.toExponential(2);
  return String(Number(n.toPrecision(7)));
}

function toHexDump(text) {
  const bytes = Array.from(new TextEncoder().encode(text ?? ""));
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    rows.push({
      offset: i,
      hex: chunk.map((b) => b.toString(16).padStart(2, "0")).join(" "),
      ascii: chunk.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join(""),
    });
  }
  return rows;
}

const plural = (n, [one, few, many]) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/* ---------- Спарклайн -----------------------------------------------------
   Тянется по ширине плитки (viewBox + preserveAspectRatio="none"), толщина
   линии держится постоянной через vector-effect — иначе при растяжении
   вертикальные участки стали бы заметно толще горизонтальных. */
function Sparkline({ data, color, height = 26 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center min-w-0">
        <span className="truncate text-[12px] text-[#5c6270] font-ibmPlexMono">
          накопление истории…
        </span>
      </div>
    );
  }

  const W = 100;
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = W / (data.length - 1);
  const pts = data.map((d, i) => [i * step, height - ((d.v - min) / range) * (height - 4) - 2]);
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ");
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className="block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Столбики «сообщений в секунду» за последние 20 с. */
function RateBars({ buckets, width = 84, height = 18 }) {
  const max = Math.max(...buckets, 1);
  const barW = width / buckets.length;
  return (
    <svg width={width} height={height} aria-hidden="true" className="block">
      {buckets.map((v, i) => {
        const h = Math.max(1, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * barW + 0.5}
            y={height - h}
            width={Math.max(1, barW - 1)}
            height={h}
            fill={STATUS_COLOR.ok}
            opacity={0.3 + 0.7 * (i / buckets.length)}
          />
        );
      })}
    </svg>
  );
}

/* ---------- Подсветка JSON ------------------------------------------------ */
function JsonNode({ value, depth }) {
  if (value === null || value === undefined) return <span className="text-[#5c6270]">null</span>;
  if (typeof value === "boolean") return <span className="text-[#a78bfa]">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-[#38bdf8]">{value}</span>;
  if (typeof value === "string") return <span className="text-[#4ade80]">&quot;{value}&quot;</span>;

  const indent = "  ".repeat(depth + 1);
  const closeIndent = "  ".repeat(depth);

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[#7c8290]">[]</span>;
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

  const keys = Object.keys(value);
  if (keys.length === 0) return <span className="text-[#7c8290]">{"{}"}</span>;
  return (
    <span>
      {"{\n"}
      {keys.map((k, i) => (
        <span key={k}>
          {indent}
          <span className="text-[#bfc7d4]">&quot;{k}&quot;</span>
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

/* ========================================================================== */
export default function WebSocketTestPage() {
  const { data: session } = useSession();

  const [channel, setChannel] = useState("devices");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [tab, setTab] = useState("values"); // values | protocol | connection
  const [filter, setFilter] = useState("all"); // all | data | ping | err
  const [autoScroll, setAutoScroll] = useState(true);
  // null — инспектор следит за последним кадром; число — закреплён конкретный.
  const [pinnedSeq, setPinnedSeq] = useState(null);
  const [frameTab, setFrameTab] = useState("json");
  const [sendText, setSendText] = useState("ping");

  const baseHttpUrl = config.WEBSOCKET_URL;
  const streamRef = useRef(null);
  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  /* Списки читаются постранично целиком: у /devices серверная страница по
     умолчанию — 20 записей, и одиночный запрос показывал 20 устройств из 67. */
  const { data: devicesData, isLoading: isLoadingDevices } = useAllPages({
    key: KEYS.devices,
    url: URLS.devices,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });
  const { data: tagsData, isLoading: isLoadingTags } = useAllPages({
    key: KEYS.tags,
    url: URLS.tags,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });
  // Экраны живут на другом сервисе (8102) и постраничности не имеют.
  const { data: screensData, isLoading: isLoadingScreens } = useGetQuery({
    key: KEYS.screens,
    url: URLS.screens,
    apiClient: requestScreens,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const deviceList = useMemo(() => get(devicesData, "data.data", []), [devicesData]);
  const tagList = useMemo(() => get(tagsData, "data.data", []), [tagsData]);
  const screenList = useMemo(() => {
    const raw = get(screensData, "data.data", get(screensData, "data", []));
    return Array.isArray(raw) ? raw : [];
  }, [screensData]);
  const deviceNameById = useMemo(
    () => new Map(deviceList.map((d) => [d.id, d.name || d.id])),
    [deviceList],
  );

  const channelCounts = {
    devices: deviceList.length,
    tags: tagList.length,
    screens: screenList.length,
  };

  const currentList = useMemo(() => {
    if (channel === "devices") return deviceList;
    if (channel === "tags") return tagList;
    return screenList;
  }, [channel, deviceList, tagList, screenList]);

  const isLoadingList =
    channel === "devices" ? isLoadingDevices : channel === "tags" ? isLoadingTags : isLoadingScreens;

  // Выбор сбрасывается при смене канала: id устройства и id тега могут
  // совпасть, и оставшийся выбор молча открыл бы сокеты не на тот эндпоинт.
  useEffect(() => {
    setSelectedIds(new Set());
    setEntitySearch("");
  }, [channel]);

  const filteredEntities = useMemo(() => {
    if (!entitySearch) return currentList;
    const q = entitySearch.toLowerCase();
    return currentList.filter((e) => {
      const name = (e.name || "").toLowerCase();
      const deviceName =
        channel === "tags" ? (deviceNameById.get(e.deviceId) || "").toLowerCase() : "";
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

  const { connStatus, openCount, messages, reconnectCount, sendToAll, clearMessages } =
    useMultiWebSocket({
      entities: selectedEntities,
      buildUrl,
      enabled: isRunning,
      heartbeatInterval: 25000,
      heartbeatMessage: "ping",
      maxMessages: 600,
    });

  const isSecure = /^wss:/i.test(
    buildUrl(selectedEntities[0]?.id) || (baseHttpUrl?.startsWith("https") ? "wss:" : "ws:"),
  );

  /* Время с момента, когда открылся первый сокет текущей сессии. */
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    if (!isRunning || openCount === 0) return undefined;
    const id = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, openCount]);
  useEffect(() => {
    if (!isRunning) setUptime(0);
  }, [isRunning]);

  /* Последнее значение и короткая история по каждому тегу, по всем сокетам.
     WEBSOCKET_API.md: первый снимок приходит от новых к старым, поэтому
     «пришло последним» ≠ «самое свежее» — сортируем по времени сервера. */
  const tagState = useMemo(() => {
    const byTag = {};
    for (const msg of messages) {
      if (msg.direction !== "in" || !msg.parsed?.tag_id) continue;
      const data = msg.parsed;
      const serverMs = Date.parse(data.time);
      const ms = Number.isFinite(serverMs) ? serverMs : Date.parse(msg.time);
      (byTag[data.tag_id] ||= []).push({ ms, data, entityName: msg.entityName });
    }
    const out = {};
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
      out[tagId] = { tagId, history, last: lastPoint.data, sourceName: lastPoint.entityName };
    }
    return out;
  }, [messages]);

  const tagCards = useMemo(() => Object.values(tagState), [tagState]);
  const errorTagCount = useMemo(() => tagCards.filter((t) => t.last.is_error).length, [tagCards]);

  /* Реальный темп приёма за последние 20 с — по меткам времени сообщений. */
  const rxRateBuckets = useMemo(() => {
    const now = Date.now();
    const buckets = new Array(20).fill(0);
    for (const msg of messages) {
      if (msg.direction !== "in") continue;
      const bucket = 19 - Math.floor((now - Date.parse(msg.time)) / 1000);
      if (bucket >= 0 && bucket < 20) buckets[bucket] += 1;
    }
    return buckets;
  }, [messages]);

  /* Счётчики по каждому сокету — для вкладки «Соединение». */
  const perEntityStats = useMemo(() => {
    const map = new Map();
    for (const msg of messages) {
      if (!msg.entityId || msg.direction !== "in") continue;
      const entry = map.get(msg.entityId) || { received: 0, errors: 0, lastAt: null };
      entry.received += 1;
      if (msg.parsed?.is_error) entry.errors += 1;
      entry.lastAt = msg.time;
      map.set(msg.entityId, entry);
    }
    return map;
  }, [messages]);

  const filteredMessages = useMemo(
    () =>
      messages.filter((m) => {
        if (filter === "data") return m.direction === "in";
        if (filter === "ping") return m.direction === "out";
        if (filter === "err") return m.direction === "in" && m.parsed?.is_error;
        return true;
      }),
    [messages, filter],
  );

  useEffect(() => {
    if (autoScroll && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [filteredMessages, autoScroll, tab]);

  const stats = useMemo(
    () => ({
      received: messages.filter((m) => m.direction === "in").length,
      pinged: messages.filter((m) => m.direction === "out").length,
      errored: messages.filter((m) => m.direction === "in" && m.parsed?.is_error).length,
    }),
    [messages],
  );

  /* Инспектор по умолчанию следует за последним кадром — иначе он застывает
     на первом попавшемся, пока поток идёт дальше. Клик по строке закрепляет
     кадр, «открепить» возвращает слежение. */
  const selectedFrame = useMemo(() => {
    if (pinnedSeq !== null) return messages.find((m) => m.seq === pinnedSeq) || null;
    return filteredMessages.length ? filteredMessages[filteredMessages.length - 1] : null;
  }, [pinnedSeq, messages, filteredMessages]);

  const frameDeltaMs = useMemo(() => {
    if (!selectedFrame) return null;
    const index = messages.indexOf(selectedFrame);
    if (index <= 0) return null;
    return Date.parse(selectedFrame.time) - Date.parse(messages[index - 1].time);
  }, [messages, selectedFrame]);

  useEffect(() => {
    if (frameTab === "json" && selectedFrame && !selectedFrame.parsed) setFrameTab("raw");
  }, [frameTab, selectedFrame]);

  const tokenExpiresIn = useMemo(() => {
    if (!session?.accessTokenExpires) return null;
    const ms = session.accessTokenExpires - Date.now();
    return ms > 0 ? Math.round(ms / 60000) : 0;
  }, [session?.accessTokenExpires]);

  const isConnected = isRunning && openCount > 0;
  const isConnecting = isRunning && selectedEntities.length > 0 && openCount === 0;
  const hasSelection = selectedEntities.length > 0;

  const stateColor = isConnected
    ? STATUS_COLOR.ok
    : isConnecting
      ? STATUS_COLOR.warn
      : STATUS_COLOR.idle;
  const stateLabel = isConnected ? "Данные идут" : isConnecting ? "Подключение…" : "Не подключено";

  const handleCopyFrame = () => {
    if (!selectedFrame) return;
    navigator.clipboard?.writeText(selectedFrame.raw ?? "").then(
      () => toast.success("Кадр скопирован"),
      () => toast.error("Буфер обмена недоступен"),
    );
  };

  const handleSend = () => {
    if (!sendText.trim()) return;
    if (!sendToAll(sendText)) toast.error("Нет открытых сокетов");
  };

  const openPicker = () => {
    setEntitySearch("");
    setPickerOpen(true);
  };

  /* ======================================================================== */
  return (
    <DashboardLayout headerTitle="Поток значений">
      <div className="font-ibmPlexSans space-y-2.5">
        {/* ---------- Шапка: источник, состояние, управление ---------- */}
        <div className="rounded-[2px] border border-surface-border bg-surface-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-2.5">
            <span
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] text-[13.5px] font-semibold flex-shrink-0"
              style={{ color: stateColor, background: `${stateColor}1a` }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isConnected || isConnecting ? "animate-pulse" : ""}`}
                style={{ background: stateColor }}
              />
              {stateLabel}
            </span>

            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-[2px] border border-surface-border bg-surface-1 text-[13.5px] text-[#bfc7d4] transition-colors hover:border-[#475569] hover:text-[#e5e2e1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <TuneRoundedIcon sx={{ fontSize: 16 }} />
              {CHANNEL_META[channel].label}
              <span className="font-ibmPlexMono text-[#6b7280]">
                {selectedIds.size} / {currentList.length}
              </span>
            </button>

            {hasSelection && (
              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[13px]">
                <Metric label="Сессия" value={formatUptime(uptime)} />
                <Metric
                  label="Получено"
                  value={stats.received}
                  color={stats.received ? STATUS_COLOR.ok : undefined}
                  hint="Сообщения со значениями тегов, пришедшие с сервера"
                />
                <Metric
                  label="Ошибки"
                  value={stats.errored}
                  color={stats.errored ? STATUS_COLOR.alarm : undefined}
                  hint="Сообщения с признаком is_error — проблема качества данных, а не связи"
                />
                <Metric
                  label="Ping"
                  value={stats.pinged}
                  hint="Keepalive браузера раз в 25 с. Сервер их не разбирает, в протокол они не входят"
                />
                <Metric
                  label="Переподключений"
                  value={reconnectCount}
                  color={reconnectCount ? STATUS_COLOR.warn : undefined}
                />
                {isRunning && (
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-[#6b7280]">Приём, 20 с</p>
                    <RateBars buckets={rxRateBuckets} />
                  </div>
                )}
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={clearMessages}
                disabled={messages.length === 0}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[2px] border border-surface-border text-[13px] text-[#bfc7d4] transition-colors enabled:hover:border-[#475569] enabled:hover:text-[#e5e2e1] enabled:active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                Очистить
              </button>

              {!isRunning ? (
                <button
                  type="button"
                  onClick={() => setIsRunning(true)}
                  disabled={!hasSelection}
                  title={hasSelection ? undefined : "Сначала выберите источники"}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[2px] bg-primary text-white text-[13px] font-semibold transition-colors enabled:hover:bg-[#2563eb] enabled:active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <PlayArrowRoundedIcon sx={{ fontSize: 17 }} />
                  Подключиться
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRunning(false)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[2px] border text-[13px] font-semibold transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2"
                  style={{ borderColor: `${STATUS_COLOR.alarm}66`, color: STATUS_COLOR.alarm }}
                >
                  <StopRoundedIcon sx={{ fontSize: 17 }} />
                  Отключиться
                </button>
              )}
            </div>
          </div>

          {/* Выбранные источники живыми фишками: видно состояние каждого
              сокета и можно снять один, не открывая окно выбора. */}
          {hasSelection && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-t border-surface-border">
              {selectedEntities.map((entity) => {
                const meta = socketMeta(connStatus.get(entity.id));
                return (
                  <span
                    key={entity.id}
                    title={isRunning ? `сокет: ${meta.label}` : "сокет ещё не открыт"}
                    className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-[2px] border border-surface-border bg-surface-1 text-[13px] text-[#bfc7d4] max-w-[240px]"
                  >
                    {isRunning && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: meta.color }}
                      />
                    )}
                    <span className="truncate">{formatTagLabelShort(entity.name)}</span>
                    <button
                      type="button"
                      onClick={() => toggleEntity(entity.id)}
                      title="Убрать источник"
                      className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-[2px] text-[#5c6270] hover:text-[#e5e2e1] hover:bg-surface-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                    >
                      <CloseRoundedIcon sx={{ fontSize: 13 }} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- Рабочая область ---------- */}
        {!hasSelection ? (
          <StartCard
            channelLabel={CHANNEL_META[channel].label.toLowerCase()}
            onPick={openPicker}
            loading={isLoadingList}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                value={tab}
                onChange={setTab}
                options={[
                  { value: "values", label: `Значения${tagCards.length ? ` · ${tagCards.length}` : ""}` },
                  { value: "protocol", label: `Протокол${messages.length ? ` · ${messages.length}` : ""}` },
                  { value: "connection", label: "Соединение" },
                ]}
              />
              {errorTagCount > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 text-[13px] px-2 py-1 rounded-[2px]"
                  style={{ color: STATUS_COLOR.alarm, background: `${STATUS_COLOR.alarm}14` }}
                >
                  <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
                  {errorTagCount} {plural(errorTagCount, ["тег", "тега", "тегов"])} с ошибкой чтения
                </span>
              )}
            </div>

            {/* ---- Вкладка «Значения» ---- */}
            {tab === "values" &&
              (tagCards.length === 0 ? (
                <Panel>
                  <EmptyState
                    title={isRunning ? "Ждём первое сообщение" : "Данных пока нет"}
                    description={
                      isRunning
                        ? "Сокеты открыты. Значение появится, как только сервер его пришлёт."
                        : "Нажмите «Подключиться» — снимок из последних записей придёт сразу после открытия сокета."
                    }
                  />
                </Panel>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2">
                  {tagCards.map((t, i) => (
                    <TagTile key={t.tagId} t={t} color={seriesColor(i)} />
                  ))}
                </div>
              ))}

            {/* ---- Вкладка «Протокол» ---- */}
            {tab === "protocol" && (
              <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-2.5 items-start">
                <Panel
                  flush
                  title="Журнал кадров"
                  description="Всё, что прошло по сокетам. Нажмите строку, чтобы разобрать кадр."
                  toolbar={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoScroll((v) => !v)}
                        aria-pressed={autoScroll}
                        className={`h-8 px-2.5 rounded-[2px] border text-[13px] transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          autoScroll
                            ? "border-primary/60 bg-primary/15 text-[#bfdbfe]"
                            : "border-surface-border text-[#6b7280] hover:text-[#e5e2e1]"
                        }`}
                      >
                        Автопрокрутка
                      </button>
                      <SegmentedControl
                        size="sm"
                        value={filter}
                        onChange={setFilter}
                        options={[
                          { value: "all", label: "Все" },
                          { value: "data", label: "Данные", title: "Сообщения от сервера" },
                          { value: "ping", label: "Ping", title: "Keepalive браузера" },
                          { value: "err", label: "Ошибки", title: "Сообщения с is_error" },
                        ]}
                      />
                    </div>
                  }
                >
                  <div ref={streamRef} className="overflow-auto" style={{ maxHeight: "58vh" }}>
                    {filteredMessages.length === 0 ? (
                      <EmptyState
                        compact
                        title={isRunning ? "Пока ничего не пришло" : "Журнал пуст"}
                        description={
                          isRunning
                            ? "Сокеты открыты, ждём сообщение от сервера."
                            : "Подключитесь, чтобы увидеть кадры протокола."
                        }
                      />
                    ) : (
                      <table className="w-full border-collapse text-[14px]">
                        <thead className="sticky top-0 z-10">
                          <tr>
                            <Th>Время</Th>
                            <Th>Тип</Th>
                            <Th>Тег</Th>
                            <Th>Источник</Th>
                            <Th numeric>Значение</Th>
                            <Th numeric>Размер</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMessages.map((m) => (
                            <LogRow
                              key={m.seq}
                              m={m}
                              selected={selectedFrame?.seq === m.seq}
                              onSelect={() => setPinnedSeq(m.seq)}
                            />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Panel>

                <Panel
                  title="Разбор кадра"
                  toolbar={
                    selectedFrame && (
                      <button
                        type="button"
                        onClick={handleCopyFrame}
                        title="Скопировать тело кадра"
                        className="inline-flex items-center gap-1 h-8 px-2 rounded-[2px] text-[13px] text-[#6b7280] hover:text-[#e5e2e1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
                        Копировать
                      </button>
                    )
                  }
                >
                  {!selectedFrame ? (
                    <EmptyState
                      compact
                      title="Кадр не выбран"
                      description="Здесь появится разбор сообщения: поля JSON, исходный текст и байты."
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-ibmPlexMono text-[#6b7280]">
                          кадр №{selectedFrame.seq}
                        </span>
                        {pinnedSeq !== null ? (
                          <button
                            type="button"
                            onClick={() => setPinnedSeq(null)}
                            className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-[#60a5fa] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 rounded-[2px]"
                          >
                            <PushPinRoundedIcon sx={{ fontSize: 13 }} />
                            Закреплён — открепить
                          </button>
                        ) : (
                          <span className="text-[13px] text-[#5c6270]">следит за последним</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <MetaField
                          label="Тип"
                          value={
                            selectedFrame.direction === "in"
                              ? "данные от сервера"
                              : selectedFrame.direction === "out"
                                ? "ping от браузера"
                                : "событие сокета"
                          }
                        />
                        <MetaField label="Источник" value={selectedFrame.entityName || "—"} />
                        <MetaField label="Время" value={formatTimeMs(selectedFrame.time)} mono />
                        <MetaField
                          label="С прошлого кадра"
                          value={frameDeltaMs === null ? "—" : `${frameDeltaMs} мс`}
                          mono
                        />
                      </div>

                      {selectedFrame.parsed?.is_error && (
                        <p
                          className="flex items-start gap-1.5 text-[13px] rounded-[2px] px-2.5 py-2"
                          style={{
                            color: STATUS_COLOR.alarm,
                            background: `${STATUS_COLOR.alarm}14`,
                          }}
                        >
                          <ErrorOutlineRoundedIcon
                            sx={{ fontSize: 15 }}
                            className="flex-shrink-0"
                          />
                          {selectedFrame.parsed.error_message ||
                            "Сервер отметил значение как ошибочное"}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <SegmentedControl
                          size="sm"
                          value={frameTab}
                          onChange={setFrameTab}
                          options={[
                            ...(selectedFrame.parsed ? [{ value: "json", label: "Поля" }] : []),
                            { value: "raw", label: "Текст" },
                            { value: "hex", label: "Байты" },
                          ]}
                        />
                        <span className="text-[13px] font-ibmPlexMono text-[#6b7280]">
                          {byteLength(selectedFrame.raw)} Б
                        </span>
                      </div>

                      <div
                        className="rounded-[2px] border border-surface-border bg-surface-1 p-3 overflow-auto"
                        style={{ maxHeight: "32vh" }}
                      >
                        {frameTab === "json" && selectedFrame.parsed ? (
                          <pre className="m-0 text-[13px] font-ibmPlexMono leading-relaxed whitespace-pre-wrap text-[#bfc7d4]">
                            <JsonNode value={selectedFrame.parsed} depth={0} />
                          </pre>
                        ) : frameTab === "hex" ? (
                          <div className="text-[13px] font-ibmPlexMono leading-relaxed">
                            {toHexDump(selectedFrame.raw).map((row) => (
                              <div key={row.offset} className="flex gap-3 whitespace-nowrap">
                                <span className="text-[#5c6270]">
                                  {row.offset.toString(16).padStart(6, "0")}
                                </span>
                                <span className="text-[#38bdf8]">{row.hex}</span>
                                <span className="text-[#6b7280]">{row.ascii}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className="m-0 text-[13px] font-ibmPlexMono leading-relaxed whitespace-pre-wrap text-[#bfc7d4]">
                            {selectedFrame.raw}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </Panel>
              </div>
            )}

            {/* ---- Вкладка «Соединение» ---- */}
            {tab === "connection" && (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-2.5 items-start">
                <Panel
                  flush
                  title="Сокеты"
                  description="По одному соединению на каждый выбранный источник."
                >
                  <div className="overflow-auto" style={{ maxHeight: "58vh" }}>
                    <table className="w-full border-collapse text-[14px]">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <Th>Источник</Th>
                          <Th>Состояние</Th>
                          <Th numeric>Получено</Th>
                          <Th numeric>Ошибок</Th>
                          <Th numeric>Последнее</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntities.map((entity) => {
                          const meta = socketMeta(connStatus.get(entity.id));
                          const s = perEntityStats.get(entity.id);
                          return (
                            <tr
                              key={entity.id}
                              className="border-b border-surface-border/60 last:border-b-0 hover:bg-surface-3/40 transition-colors"
                            >
                              <td className="px-3 py-1.5 text-[13.5px] text-[#e5e2e1]">
                                <span className="block truncate max-w-[280px]">
                                  {formatTagLabelShort(entity.name)}
                                </span>
                              </td>
                              <td className="px-3 py-1.5">
                                <span
                                  className="inline-flex items-center gap-1.5 text-[13px]"
                                  style={{ color: isRunning ? meta.color : "#5c6270" }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: isRunning ? meta.color : "#3a3a3a" }}
                                  />
                                  {isRunning ? meta.label : "не открыт"}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums text-[#bfc7d4]">
                                {s?.received ?? 0}
                              </td>
                              <td
                                className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums"
                                style={{ color: s?.errors ? STATUS_COLOR.alarm : "#5c6270" }}
                              >
                                {s?.errors ?? 0}
                              </td>
                              <td className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums text-[13px] text-[#6b7280]">
                                {s?.lastAt ? formatTimeMs(s.lastAt) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                <div className="space-y-2.5">
                  <Panel title="Параметры сессии">
                    <div className="space-y-1.5">
                      <SessionRow label="Эндпоинт" value={CHANNEL_META[channel].path} />
                      <SessionRow label="Схема" value={isSecure ? "wss (TLS)" : "ws"} />
                      <SessionRow label="Формат" value="JSON, одно значение в кадре" />
                      <SessionRow label="Снимок при старте" value="до 10 последних записей" />
                      <SessionRow label="Ping" value="каждые 25 с" />
                      <SessionRow label="Переподключение" value="авто, с нарастающей паузой" />
                      <SessionRow
                        label="Токен"
                        value={
                          tokenExpiresIn === null
                            ? "—"
                            : tokenExpiresIn > 0
                              ? `ещё ${tokenExpiresIn} мин`
                              : "истёк"
                        }
                        color={tokenExpiresIn === 0 ? STATUS_COLOR.alarm : undefined}
                      />
                    </div>
                  </Panel>

                  <Panel title="Отправить в открытые сокеты">
                    <div className="flex gap-1.5">
                      <input
                        value={sendText}
                        onChange={(e) => setSendText(e.target.value)}
                        className="min-w-0 flex-1 h-9 px-2.5 rounded-[2px] bg-surface-1 border border-surface-border text-[13px] font-ibmPlexMono text-[#e5e2e1] outline-none transition-colors hover:border-[#475569] focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={openCount === 0}
                        className="h-9 px-3 rounded-[2px] border border-surface-border text-[13px] text-[#bfc7d4] transition-colors enabled:hover:border-[#475569] enabled:hover:text-[#e5e2e1] enabled:active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        Отправить
                      </button>
                    </div>
                    <p className="mt-1.5 text-[13px] text-[#6b7280] leading-snug">
                      Протокола команд у сервера нет: любой текст засчитывается как keepalive и не
                      обрабатывается.
                    </p>
                  </Panel>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- Окно выбора источников ---------- */}
      <MethodModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        closeClick={() => setPickerOpen(false)}
        showCloseIcon
        title="Что слушаем"
        width={900}
        padding={3}
      >
        <div className="font-ibmPlexSans space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CHANNEL_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const active = channel === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChannel(key)}
                  aria-pressed={active}
                  className={`text-left p-3 rounded-[2px] border transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active
                      ? "border-primary/60 bg-primary/15"
                      : "border-surface-border bg-surface-1 hover:border-[#475569]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      sx={{ fontSize: 16 }}
                      style={{ color: active ? "#bfdbfe" : "#7c8290" }}
                    />
                    <span
                      className="text-[14px] font-semibold"
                      style={{ color: active ? "#bfdbfe" : "#bfc7d4" }}
                    >
                      {meta.label}
                    </span>
                    <span className="ml-auto text-[13px] font-ibmPlexMono text-[#6b7280] tabular-nums">
                      {channelCounts[key]}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[#6b7280] leading-snug">{meta.note}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <SearchRoundedIcon
                sx={{ fontSize: 16 }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5c6270] pointer-events-none"
              />
              <input
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder="поиск по названию"
                className="w-full h-9 pl-8 pr-2.5 rounded-[2px] bg-surface-1 border border-surface-border text-[14px] text-[#e5e2e1] placeholder:text-[#5c6270] outline-none transition-colors hover:border-[#475569] focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  filteredEntities.forEach((e) => next.add(e.id));
                  return next;
                })
              }
              disabled={filteredEntities.length === 0}
              className="h-9 px-3 rounded-[2px] border border-surface-border text-[13px] text-[#bfc7d4] transition-colors enabled:hover:border-[#475569] enabled:hover:text-[#e5e2e1] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Отметить найденные
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIds.size === 0}
              className="h-9 px-3 rounded-[2px] border border-surface-border text-[13px] text-[#bfc7d4] transition-colors enabled:hover:border-[#475569] enabled:hover:text-[#e5e2e1] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Снять всё
            </button>
          </div>

          <div
            className="rounded-[2px] border border-surface-border bg-surface-1 p-2 overflow-y-auto"
            style={{ maxHeight: "46vh" }}
          >
            {isLoadingList ? (
              <p className="py-6 text-center text-[13px] text-[#6b7280]">Загрузка списка…</p>
            ) : filteredEntities.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#6b7280]">
                {currentList.length === 0 ? "Список пуст" : "Ничего не найдено"}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2">
                {filteredEntities.map((entity) => {
                  const checked = selectedIds.has(entity.id);
                  const deviceName =
                    channel === "tags" ? deviceNameById.get(entity.deviceId) : null;
                  return (
                    <label
                      key={entity.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-[2px] cursor-pointer transition-colors ${
                        checked ? "bg-primary/10" : "hover:bg-surface-3/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEntity(entity.id)}
                        className="accent-[#3b82f6] cursor-pointer flex-shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-[#e5e2e1]">
                          {formatTagLabelShort(entity.name || "Без названия")}
                        </span>
                        {deviceName && (
                          <span className="block truncate text-[12.5px] text-[#6b7280] font-ibmPlexMono">
                            {deviceName}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[13px] text-[#6b7280]">
              Выбрано{" "}
              <span className="font-ibmPlexMono text-[#e5e2e1]">{selectedIds.size}</span> —
              откроется столько же соединений.
              {isRunning && " Изменения применяются сразу."}
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="h-9 px-4 rounded-[2px] bg-primary text-white text-[13px] font-semibold transition-colors hover:bg-[#2563eb] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Готово
            </button>
          </div>
        </div>
      </MethodModal>
    </DashboardLayout>
  );
}

/* ---------- Мелкие части -------------------------------------------------- */
function Metric({ label, value, color, hint }) {
  return (
    <div title={hint} className={hint ? "cursor-help" : undefined}>
      <p className="text-[12px] uppercase tracking-wide text-[#6b7280] whitespace-nowrap">
        {label}
      </p>
      <p
        className="text-[14.5px] font-ibmPlexMono tabular-nums leading-tight"
        style={{ color: color || "#e5e2e1" }}
      >
        {value}
      </p>
    </div>
  );
}

function SessionRow({ label, value, color }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[13px] text-[#6b7280] flex-shrink-0">{label}</span>
      <span
        className="text-[13px] text-right break-all font-ibmPlexMono"
        style={{ color: color || "#bfc7d4" }}
      >
        {value}
      </span>
    </div>
  );
}

function MetaField({ label, value, mono }) {
  return (
    <div className="min-w-0">
      <p className="text-[12.5px] uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className={`text-[13.5px] text-[#bfc7d4] truncate ${mono ? "font-ibmPlexMono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

/** Первый экран: что это за страница и единственное действие, с которого начинают. */
function StartCard({ channelLabel, onPick, loading }) {
  return (
    <div className="rounded-[2px] border border-surface-border bg-surface-2 px-4 py-12">
      <div className="max-w-lg mx-auto text-center">
        <h2 className="text-[17px] font-semibold text-[#e5e2e1] mb-2">
          Проверка потока значений
        </h2>
        <p className="text-[14.5px] text-[#6b7280] leading-relaxed mb-5">
          Страница открывает настоящие WebSocket-соединения к сервису тегов и показывает, что
          именно по ним приходит: текущие значения, кадры протокола и состояние каждого сокета.
        </p>
        <button
          type="button"
          onClick={onPick}
          disabled={loading}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-[2px] bg-primary text-white text-[14px] font-semibold transition-colors enabled:hover:bg-[#2563eb] enabled:active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <TuneRoundedIcon sx={{ fontSize: 18 }} />
          {loading ? "Загрузка списка…" : `Выбрать ${channelLabel}`}
        </button>
        <p className="mt-3 text-[13px] text-[#5c6270]">
          Дальше — «Подключиться». Соединения можно менять, не разрывая сессию.
        </p>
      </div>
    </div>
  );
}

function TagTile({ t, color }) {
  const last = t.last;
  const errored = !!last.is_error;
  const vals = t.history.map((d) => d.v);
  const min = vals.length ? Math.min(...vals) : null;
  const max = vals.length ? Math.max(...vals) : null;

  return (
    <div
      className="min-w-0 rounded-[2px] border border-surface-border bg-surface-2 p-3 flex flex-col gap-1.5"
      title={`${last.tag_name || ""} · источник: ${t.sourceName || "—"}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: errored ? STATUS_COLOR.alarm : color }}
        />
        <p className="text-[12.5px] uppercase tracking-wide text-[#6b7280] truncate flex-1">
          {formatTagLabelShort(last.tag_name || "—")}
        </p>
        {errored && (
          <ErrorOutlineRoundedIcon
            sx={{ fontSize: 13 }}
            style={{ color: STATUS_COLOR.alarm }}
            titleAccess="ошибка чтения"
          />
        )}
      </div>

      <p className="flex items-baseline gap-1 min-w-0" title={`точное значение: ${last.value}`}>
        <span
          className="text-xl font-ibmPlexMono tabular-nums leading-none truncate"
          style={{ color: errored ? STATUS_COLOR.alarm : "#e5e2e1" }}
        >
          {formatValue(last.value)}
        </span>
        {last.unit && (
          <span className="flex-shrink-0 text-[13px] text-[#6b7280]">{last.unit}</span>
        )}
      </p>

      <Sparkline data={t.history} color={errored ? STATUS_COLOR.alarm : color} />

      <div className="flex justify-between gap-2 min-w-0 text-[12px] font-ibmPlexMono text-[#5c6270]">
        <span className="truncate">мин {min != null ? formatValue(min) : "—"}</span>
        <span className="truncate">макс {max != null ? formatValue(max) : "—"}</span>
      </div>
    </div>
  );
}

function Th({ children, numeric }) {
  return (
    <th
      scope="col"
      className={`bg-surface-1 border-b border-surface-border px-3 py-2 text-[12.5px] font-semibold uppercase tracking-wide text-[#6b7280] whitespace-nowrap ${
        numeric ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function LogRow({ m, selected, onSelect }) {
  const kind =
    m.direction === "in"
      ? { label: "данные", color: STATUS_COLOR.ok }
      : m.direction === "out"
        ? { label: "ping", color: "#6b7280" }
        : { label: "событие", color: STATUS_COLOR.warn };
  const d = m.parsed;
  const isErr = d?.is_error;

  return (
    <tr
      onClick={onSelect}
      className={`border-b border-surface-border/60 last:border-b-0 cursor-pointer transition-colors ${
        selected ? "bg-primary/15" : "hover:bg-surface-3/50"
      }`}
    >
      <td className="px-3 py-1.5 font-ibmPlexMono tabular-nums text-[13px] text-[#6b7280] whitespace-nowrap">
        {formatTimeMs(m.time)}
      </td>
      <td className="px-3 py-1.5 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: kind.color }}>
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: kind.color }}
          />
          {kind.label}
        </span>
      </td>
      <td className="px-3 py-1.5 min-w-0">
        <span className="block truncate max-w-[260px] text-[13.5px] text-[#e5e2e1]">
          {d?.tag_name ? formatTagLabelShort(d.tag_name) : m.raw?.slice(0, 40) || "—"}
        </span>
      </td>
      <td className="px-3 py-1.5 min-w-0">
        <span className="block truncate max-w-[180px] text-[13px] text-[#6b7280] font-ibmPlexMono">
          {m.entityName || "—"}
        </span>
      </td>
      <td
        className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums whitespace-nowrap"
        title={d ? `точное значение: ${d.value}` : undefined}
      >
        <span style={{ color: isErr ? STATUS_COLOR.alarm : "#e5e2e1" }}>
          {d ? formatValue(d.value) : "—"}
        </span>
        {d?.unit && <span className="ml-1 text-[12.5px] text-[#6b7280]">{d.unit}</span>}
      </td>
      <td className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums text-[13px] text-[#5c6270] whitespace-nowrap">
        {byteLength(m.raw)} Б
      </td>
    </tr>
  );
}
