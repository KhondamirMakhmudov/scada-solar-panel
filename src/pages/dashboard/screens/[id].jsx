import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import toast from "react-hot-toast";
import { Button } from "@mui/material";
import {
  ArrowBack,
  Close,
  Save,
  Factory,
  WaterDrop,
  Bolt,
  PropaneTank,
  Tune,
  Sensors,
} from "@mui/icons-material";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import CustomSelect from "@/components/select";
import Input from "@/components/input";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { requestPython, requestScreens } from "@/services/api";
import { config } from "@/config";

const buildScreenWsUrl = (screenId, token) => {
  const wsBase = config.SCREENS_API_URL.replace(/^http/, "ws").replace(
    /\/$/,
    "",
  );
  return `${wsBase}/ws/screens/${screenId}?token=${encodeURIComponent(token)}`;
};

const KIND_META = {
  smokestack: {
    label: "Дымовая труба",
    icon: Factory,
    ring: "border-red-400/60",
    bg: "bg-red-500/15",
    text: "text-red-300",
  },
  pump: {
    label: "Насос",
    icon: WaterDrop,
    ring: "border-blue-400/60",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
  },
  motor: {
    label: "Электродвигатель",
    icon: Bolt,
    ring: "border-yellow-400/60",
    bg: "bg-yellow-500/15",
    text: "text-yellow-300",
  },
  tank: {
    label: "Резервуар",
    icon: PropaneTank,
    ring: "border-purple-400/60",
    bg: "bg-purple-500/15",
    text: "text-purple-300",
  },
  valve: {
    label: "Клапан",
    icon: Tune,
    ring: "border-teal-400/60",
    bg: "bg-teal-500/15",
    text: "text-teal-300",
  },
  sensor: {
    label: "Датчик",
    icon: Sensors,
    ring: "border-green-400/60",
    bg: "bg-green-500/15",
    text: "text-green-300",
  },
};

const STATUS_OPTIONS = [
  { label: "Активен", value: "active" },
  { label: "Неактивен", value: "inactive" },
];

const EquipmentNode = ({ data, selected }) => {
  const meta = KIND_META[data.kind] || KIND_META.sensor;
  const Icon = meta.icon;
  const hasTag = Boolean(data.tagId);
  const live = data.live;

  const active = hasTag ? Boolean(live && !live.isError) : data.status !== "inactive";

  const dotClass = hasTag
    ? live
      ? live.isError
        ? "bg-red-500"
        : "bg-green-400 animate-pulse"
      : "bg-slate-600"
    : active
      ? "bg-green-400 animate-pulse"
      : "bg-slate-600";

  const statusColor = hasTag
    ? live
      ? live.isError
        ? "text-red-400"
        : "text-green-400"
      : "text-slate-500"
    : active
      ? "text-green-400"
      : "text-slate-500";

  const statusText = hasTag
    ? live
      ? live.isError
        ? "Ошибка"
        : "Онлайн"
      : "Ожидание"
    : active
      ? "Активен"
      : "Неактивен";

  return (
    <div
      className={`min-w-[130px] rounded-xl border-2 ${
        selected ? "border-white" : meta.ring
      } ${meta.bg} px-3 py-2.5 flex flex-col items-center gap-1 shadow-lg transition-colors`}
    >
      <Handle type="target" position={Position.Left} id="left" className="!bg-slate-400" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-slate-400" />
      <Icon
        sx={{ fontSize: 26, opacity: active ? 1 : 0.4 }}
        className={meta.text}
      />
      <span className="text-xs font-medium text-slate-100 text-center leading-tight">
        {data.label}
      </span>
      {data.tagName && (
        <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
          {data.tagName}
        </span>
      )}
      {hasTag && live && (
        <span
          className={`text-xs font-mono truncate max-w-[110px] ${
            live.isError ? "text-red-300" : "text-slate-100"
          }`}
        >
          {live.isError
            ? live.errorMessage || "Ошибка"
            : `${live.value ?? "—"}${live.unit || ""}`}
        </span>
      )}
      <span
        className={`text-[10px] flex items-center gap-1 ${statusColor}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        {statusText}
      </span>
      <Handle type="source" position={Position.Right} id="right" className="!bg-slate-400" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-slate-400" />
    </div>
  );
};

const Index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();

  const authHeaders = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

  const nodeTypes = useMemo(() => ({ equipment: EquipmentNode }), []);

  const { data: screenResp, isLoading: isLoadingScreen } = useGetQuery({
    key: [KEYS.screens, "detail", id],
    url: `${URLS.screens}/${id}`,
    apiClient: requestScreens,
    headers: { ...authHeaders, Accept: "application/json" },
    enabled: Boolean(id),
  });

  const { data: tagsResp } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    apiClient: requestPython,
    headers: { ...authHeaders, Accept: "application/json" },
  });

  const screen = get(screenResp, "data.data", get(screenResp, "data", null));
  const tagsRaw = get(tagsResp, "data.data", get(tagsResp, "data", []));
  const tagsList = Array.isArray(tagsRaw) ? tagsRaw : [];

  const tagOptions = useMemo(
    () => tagsList.map((tag) => ({ label: tag.name || tag.id, value: tag.id })),
    [tagsList],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [liveValues, setLiveValues] = useState({});
  const [wsStatus, setWsStatus] = useState("connecting");
  const hydrated = useRef(false);

  useEffect(() => {
    if (screen && !hydrated.current) {
      const canvas = get(screen, "params.canvas");
      if (canvas?.nodes?.length) {
        setNodes(canvas.nodes);
        setEdges(canvas.edges || []);
      }
      hydrated.current = true;
    }
  }, [screen, setNodes, setEdges]);

  useEffect(() => {
    if (!id || !session?.accessToken) return undefined;

    setWsStatus("connecting");
    const ws = new WebSocket(buildScreenWsUrl(id, session.accessToken));
    let pingTimer = null;

    ws.onopen = () => {
      setWsStatus("online");
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg?.tag_id) return;

        setLiveValues((prev) => ({
          ...prev,
          [msg.tag_id]: {
            value: msg.value,
            unit: msg.unit,
            isError: Boolean(msg.is_error),
            errorMessage: msg.error_message,
            time: msg.time,
          },
        }));
      } catch (error) {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setWsStatus("offline");
    ws.onclose = () => setWsStatus("offline");

    return () => {
      if (pingTimer) clearInterval(pingTimer);
      ws.close();
    };
  }, [id, session?.accessToken]);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) =>
        n.data.tagId
          ? { ...n, data: { ...n.data, live: liveValues[n.data.tagId] || null } }
          : n,
      ),
    [nodes, liveValues],
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#60a5fa", strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const addNode = (kind) => {
    const meta = KIND_META[kind];
    const count = nodes.length;
    const newNode = {
      id: `node_${Date.now()}_${count}`,
      type: "equipment",
      position: {
        x: 80 + (count % 5) * 180,
        y: 80 + Math.floor(count / 5) * 160,
      },
      data: {
        label: meta.label,
        kind,
        status: "active",
        tagId: null,
        tagName: null,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const updateSelectedNode = (patch) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
  };

  const removeSelectedNode = () => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
  };

  const handleSave = async () => {
    if (!screen) return;

    try {
      setIsSaving(true);
      const existingParams = get(screen, "params", {}) || {};

      await requestScreens.patch(
        `${URLS.screens}/${id}`,
        {
          name: screen.name,
          description: screen.description || "",
          isActive: Boolean(screen.isActive),
          tagIds: screen.tagIds || [],
          params: {
            ...existingParams,
            canvas: {
              nodes: nodes.map(({ id: nodeId, type, position, data }) => ({
                id: nodeId,
                type,
                position,
                data,
              })),
              edges,
            },
          },
        },
        { headers: authHeaders },
      );

      toast.success("Схема сохранена");
    } catch (error) {
      toast.error(
        get(error, "response.data.message", "Ошибка сохранения схемы"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingScreen || !screen) {
    return (
      <DashboardLayout headerTitle={"Экран"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={screen.name}>
      <div className="flex flex-col h-[calc(100vh-112px)] -m-6">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/screens")}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowBack sx={{ fontSize: 16 }} /> Назад
            </button>
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-sm font-semibold text-slate-100">
              {screen.name}
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsStatus === "online"
                    ? "bg-green-400 animate-pulse"
                    : wsStatus === "connecting"
                      ? "bg-yellow-400"
                      : "bg-red-500"
                }`}
              />
              <span className="text-slate-400">
                {wsStatus === "online"
                  ? "Онлайн"
                  : wsStatus === "connecting"
                    ? "Подключение..."
                    : "Нет соединения"}
              </span>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            startIcon={<Save />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "#00111f",
              background: "linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)",
              "&:hover": { opacity: 0.9 },
            }}
          >
            {isSaving ? "Сохранение..." : "Сохранить схему"}
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-56 flex-shrink-0 border-r border-slate-800 bg-slate-900/40 p-3 overflow-y-auto">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
              Оборудование
            </p>
            <div className="space-y-1.5">
              {Object.entries(KIND_META).map(([kind, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={kind}
                    onClick={() => addNode(kind)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/60 hover:border-blue-500/50 hover:bg-blue-500/10 text-left transition-colors"
                  >
                    <Icon sx={{ fontSize: 18 }} className={meta.text} />
                    <span className="text-sm text-slate-200">
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-600 mt-3">
              Нажмите на элемент, чтобы добавить его на схему. Соединяйте узлы,
              перетаскивая от точки одного элемента к другому.
            </p>
          </div>

          <div className="flex-1 min-w-0">
            <ReactFlow
              nodes={displayNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
              className="bg-slate-950"
            >
              <Background variant="dots" gap={20} size={1} color="#334155" />
              <Controls className="bg-slate-800 border border-slate-700 rounded-lg" />
              <MiniMap
                className="bg-slate-800 border border-slate-700 rounded-lg"
                maskColor="rgba(15,23,42,0.6)"
              />
            </ReactFlow>
          </div>

          {selectedNode && (
            <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Свойства узла
                </p>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <Close sx={{ fontSize: 16 }} />
                </button>
              </div>

              <Input
                label="Название"
                name="node-label"
                value={selectedNode.data.label}
                onChange={(event) =>
                  updateSelectedNode({ label: event.target.value })
                }
              />

              <CustomSelect
                label="Статус"
                options={STATUS_OPTIONS}
                value={selectedNode.data.status}
                onChange={(value) => updateSelectedNode({ status: value })}
                sortOptions={false}
              />

              <CustomSelect
                label="Привязка к тегу"
                options={tagOptions}
                value={selectedNode.data.tagId}
                onChange={(value) =>
                  updateSelectedNode({
                    tagId: value,
                    tagName:
                      tagOptions.find((opt) => opt.value === value)?.label ||
                      null,
                  })
                }
                placeholder="Без привязки"
                sortOptions={false}
              />

              <Button
                onClick={removeSelectedNode}
                fullWidth
                variant="outlined"
                color="error"
                sx={{ textTransform: "none" }}
              >
                Удалить элемент
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
