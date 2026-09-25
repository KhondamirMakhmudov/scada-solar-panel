import { useEffect, useMemo, useState } from "react";
import { get } from "lodash";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { translateApiError } from "@/lib/apiErrorTranslation";
import { Button } from "@mui/material";
import {
  KeyboardArrowDown,
  Cable,
  Memory,
  VisibilityRounded,
  EditRounded,
  DeleteRounded,
} from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { Panel, StatTile, SegmentedControl, EmptyState, Reveal } from "@/components/ui";
import { STATUS_COLOR } from "@/constants/statusPalette";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import CustomTable from "@/components/table";
import CustomSelect from "@/components/select";
import ChipSelect from "@/components/chip-select";
import Input from "@/components/input";
import MethodModal from "@/components/modal/method-modal";
import DeleteModal from "@/components/modal/delete-modal";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import useAllPages from "@/hooks/all/useAllPages";
import usePostQuery from "@/hooks/all/usePostQuery";
import useDeleteQuery from "@/hooks/all/useDeleteQuery";
import { requestPython, requestScreens } from "@/services/api";

const ENABLED_OPTIONS = [
  { label: "Включено", value: true },
  { label: "Отключено", value: false },
];

const DATA_TYPE_OPTIONS = [
  { label: "BOOL", value: "BOOL" },
  { label: "INT16", value: "INT16" },
  { label: "UINT16", value: "UINT16" },
  { label: "INT32", value: "INT32" },
  { label: "UINT32", value: "UINT32" },
  { label: "INT64", value: "INT64" },
  { label: "UINT64", value: "UINT64" },
  { label: "FLOAT32", value: "FLOAT32" },
  { label: "FLOAT64", value: "FLOAT64" },
  { label: "STRING", value: "STRING" },
  { label: "DATETIME", value: "DATETIME" },
  { label: "BYTES", value: "BYTES" },
];

const PROTOCOL_OPTIONS_BASE = [
  { label: "MODBUS_TCP", value: "MODBUS_TCP" },
  { label: "MODBUS_RTU_OVER_TCP", value: "MODBUS_RTU_OVER_TCP" },
];

const REGISTER_TYPE_OPTIONS = [
  { label: "COIL", value: "COIL" },
  { label: "DISCRETE_INPUT", value: "DISCRETE_INPUT" },
  { label: "INPUT_REGISTER", value: "INPUT_REGISTER" },
  { label: "HOLDING_REGISTER", value: "HOLDING_REGISTER" },
];

const ENDIAN_OPTIONS = [
  { label: "big", value: "big" },
  { label: "little", value: "little" },
];

const DEFAULT_FORM = {
  name: "",
  description: "",
  dataType: "UINT32",
  scanRateMs: "1000",
  scale: "1",
  offset: "0",
  deadband: "0",
  unit: "",
  enabled: true,
  deviceId: "",
  type: "MODBUS_TCP",
  count: "1",
  address: "",
  byte_order: "big",
  word_order: "big",
  register_type: "HOLDING_REGISTER",
};

const Index = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedTag, setSelectedTag] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [deletingTag, setDeletingTag] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // "Таблица" — обычный список тегов (по умолчанию: раньше единственным
  // способом вообще увидеть теги было сначала развернуть дерево слева и
  // выбрать устройство — списка тегов как такового не было). "Живые
  // значения" — прежнее дерево + текущие значения/спарклайны/статистика,
  // сохранено как отдельный, явно подписанный режим для диагностики, а не
  // единственный вход на страницу.
  const [viewMode, setViewMode] = useState("table");
  const [searchValue, setSearchValue] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, protocolFilter, statusFilter, deviceFilter]);

  // /tags и /devices постраничные, и — как выяснилось — сервер не гарантирует
  // честно отдать ровно тот pageSize, что запрошен (запрос pageSize=1000 тихо
  // возвращал только первую сотню с чем-то, дерево и таблица показывали не
  // все теги). useAllPages читает реальный pagination.totalPages из ответа
  // на первую страницу и, если страниц больше одной, дотягивает остальные —
  // независимо от того, какой лимит сервер на самом деле применяет.
  const {
    data: tags,
    isLoading: isLoadingTags,
    isFetching: isFetchingTags,
  } = useAllPages({
    key: KEYS.tags,
    url: URLS.tags,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
  });

  const { data: devices } = useAllPages({
    key: KEYS.devices,
    url: URLS.devices,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
  });

  // Только для дерева «Подключение → Устройство → Тег» ниже — та же связка,
  // что уже строит TagTreeSelect на странице «Экраны».
  const { data: connectsForTree } = useAllPages({
    key: [KEYS.connects, "tags-tree"],
    url: URLS.connects,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
  });

  const { mutate: createTag, isLoading: isCreatingTag } = usePostQuery({
    listKeyId: KEYS.tags,
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const { mutate: deleteTag, isPending: isDeletingTag } = useDeleteQuery({
    listKeyId: KEYS.tags,
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const listRaw = get(tags, "data.data", []);
  const devicesList = get(devices, "data.data", []);

  const deviceMap = useMemo(
    () =>
      new Map(
        devicesList.map((item) => [item.id, item.name || item.id || "—"]),
      ),
    [devicesList],
  );

  const list = useMemo(
    () =>
      listRaw.map((item, index) => {
        const id = item?.id || item?.tagId || item?.key || `tag-${index + 1}`;
        const name =
          item?.name ||
          item?.tagName ||
          item?.key ||
          item?.title ||
          `Тег ${index + 1}`;
        const deviceId = item?.deviceId || get(item, "device.id", "");

        return {
          id,
          name,
          description: item?.description || item?.note || "",
          dataType: item?.dataType || item?.valueType || item?.datatype || "—",
          scanRateMs: item?.scanRateMs ?? "—",
          scale: item?.scale ?? 1,
          offset: item?.offset ?? 0,
          deadband: item?.deadband ?? 0,
          unit: item?.unit || "",
          enabled:
            typeof item?.enabled === "boolean"
              ? item.enabled
              : typeof item?.active === "boolean"
                ? item.active
                : true,
          deviceId,
          deviceName:
            item?.deviceName ||
            get(item, "device.name", null) ||
            deviceMap.get(deviceId) ||
            item?.source ||
            "—",
          protocolType: get(item, "params.type", "—"),
          registerType: get(item, "params.register_type", "—"),
          address: get(item, "params.address", "—"),
          count: get(item, "params.count", "—"),
          byteOrder: get(item, "params.byte_order", "big"),
          wordOrder: get(item, "params.word_order", "big"),
          updatedAt:
            item?.updatedAt ||
            item?.lastUpdated ||
            item?.timestamp ||
            item?.createdAt ||
            null,
        };
      }),
    [listRaw, deviceMap],
  );

  const deviceOptions = useMemo(
    () =>
      devicesList.map((item) => ({
        label: `${item.name || "Устройство"} (${item.id?.slice(0, 8) || "—"})`,
        value: item.id,
      })),
    [devicesList],
  );

  // ── Обычный список тегов (вкладка «Таблица») ──────────────────────────
  const protocolFilterOptions = useMemo(
    () => [
      { label: "ВСЕ", value: "all" },
      ...Array.from(new Set(list.map((t) => t.protocolType).filter((v) => v && v !== "—"))).map((v) => ({
        label: v,
        value: v,
      })),
    ],
    [list],
  );

  const deviceFilterOptions = useMemo(
    () => [{ label: "Все устройства", value: "all" }, ...deviceOptions.map((o) => ({ label: o.label, value: o.value }))],
    [deviceOptions],
  );

  const filteredList = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return list.filter((item) => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.deviceName?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query);
      const matchesProtocol = protocolFilter === "all" || item.protocolType === protocolFilter;
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "enabled" ? item.enabled : !item.enabled);
      const matchesDevice = deviceFilter === "all" || item.deviceId === deviceFilter;
      return matchesSearch && matchesProtocol && matchesStatus && matchesDevice;
    });
  }, [list, searchValue, protocolFilter, statusFilter, deviceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Сводка по всей выборке, а не по текущей странице: «сколько всего тегов и
  // сколько из них реально опрашивается» — первое, что спрашивают об этом
  // разделе, а по постраничной таблице это было не увидеть.
  const summary = useMemo(() => {
    const enabled = list.filter((t) => t.enabled).length;
    return {
      total: list.length,
      enabled,
      disabled: list.length - enabled,
      devices: new Set(list.map((t) => t.deviceId).filter(Boolean)).size,
      protocols: new Set(list.map((t) => t.protocolType).filter((p) => p && p !== "—")).size,
    };
  }, [list]);

  const hasActiveFilters =
    Boolean(searchValue.trim()) ||
    protocolFilter !== "all" ||
    statusFilter !== "all" ||
    deviceFilter !== "all";

  const resetFilters = () => {
    setSearchValue("");
    setProtocolFilter("all");
    setStatusFilter("all");
    setDeviceFilter("all");
  };

  const tagColumns = [
    {
      accessorKey: "name",
      header: "Тег",
      cell: ({ row }) => (
        <div>
          <p className="font-ibmPlexMono text-[13.5px] text-text-primary truncate max-w-[220px]" title={row.original.name}>
            {row.original.name}
          </p>
          {row.original.description && (
            <p className="font-ibmPlexSans text-[11px] text-text-faint truncate max-w-[220px]">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "deviceName",
      header: "Устройство",
      cell: ({ row }) => (
        <span className="font-ibmPlexMono text-[12.5px] text-text-secondary truncate block max-w-[160px]" title={row.original.deviceName}>
          {row.original.deviceName}
        </span>
      ),
    },
    {
      accessorKey: "dataType",
      header: "Тип данных",
      cell: ({ row }) => (
        <span className="font-ibmPlexMono text-[12px] text-blue-300">{row.original.dataType}</span>
      ),
    },
    {
      id: "register",
      header: "Регистр",
      cell: ({ row }) => (
        <span className="font-ibmPlexMono text-[12px] text-text-secondary">
          {row.original.registerType !== "—" ? `${row.original.registerType} @${row.original.address}` : "—"}
        </span>
      ),
    },
    {
      accessorKey: "scanRateMs",
      header: "Опрос",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="font-ibmPlexMono text-[12.5px] text-text-secondary block text-right">
          {row.original.scanRateMs === "—" ? "—" : `${row.original.scanRateMs} мс`}
        </span>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Статус",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-[8px] border text-[10.5px] font-semibold uppercase tracking-wide ${
            row.original.enabled ? "border-status-ok text-status-ok" : "border-status-warn text-status-warn"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.original.enabled ? "#22c55e" : "#f59e0b" }} />
          {row.original.enabled ? "Включено" : "Отключено"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            title="Просмотр"
            onClick={() => openViewModal(row.original)}
            className="w-7 h-7 flex items-center justify-center rounded-[8px] border border-surface-border text-text-secondary hover:border-primary hover:text-primary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            <VisibilityRounded sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            title="Изменить"
            onClick={() => openEditModal(row.original)}
            className="w-7 h-7 flex items-center justify-center rounded-[8px] border border-surface-border text-text-secondary hover:border-primary hover:text-primary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            <EditRounded sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            title="Удалить"
            onClick={() => openDeleteModal(row.original)}
            className="w-7 h-7 flex items-center justify-center rounded-[8px] border border-surface-border text-status-fault hover:border-status-fault transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/60"
          >
            <DeleteRounded sx={{ fontSize: 15 }} />
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  // ── Живой браузер значений: дерево «Подключение → Устройство → Теги» +
  // текущие значения/агрегаты/статистика по /tag-values/*. Отдельно от
  // CRUD-формы тегов ниже — просмотр значений и управление определением
  // тега решают разные задачи и не должны делить состояние выбора.
  const [browserDeviceId, setBrowserDeviceId] = useState(null);
  const [browserTagId, setBrowserTagId] = useState(null);
  const [expandedConnIds, setExpandedConnIds] = useState(() => new Set());

  const connectsList = get(connectsForTree, "data.data", []);
  const connNameById = useMemo(
    () => new Map(connectsList.map((c) => [c.id, c.name || c.id])),
    [connectsList],
  );
  const connIdByDeviceId = useMemo(
    () => new Map(devicesList.map((d) => [d.id, d.connectionId || null])),
    [devicesList],
  );

  // Дерево «Подключение → Устройство → Теги» — та же группировка, что
  // TagTreeSelect на «Экранах», только для навигации, а не для выбора.
  const connTree = useMemo(() => {
    const deviceGroups = new Map();
    list.forEach((tag) => {
      const deviceKey = tag.deviceId || "__no_device__";
      if (!deviceGroups.has(deviceKey)) {
        deviceGroups.set(deviceKey, { deviceId: tag.deviceId, deviceName: tag.deviceName, tags: [] });
      }
      deviceGroups.get(deviceKey).tags.push(tag);
    });

    const connGroups = new Map();
    for (const device of deviceGroups.values()) {
      const connId = device.deviceId ? connIdByDeviceId.get(device.deviceId) : null;
      const connKey = connId || "__no_connection__";
      if (!connGroups.has(connKey)) {
        connGroups.set(connKey, {
          connId: connKey,
          connName: connId ? connNameById.get(connId) || connId : "Без подключения",
          devices: [],
          tagCount: 0,
        });
      }
      const group = connGroups.get(connKey);
      group.devices.push(device);
      group.tagCount += device.tags.length;
    }

    return [...connGroups.values()];
  }, [list, connIdByDeviceId, connNameById]);

  const toggleConn = (connId) => {
    setExpandedConnIds((prev) => {
      const next = new Set(prev);
      if (next.has(connId)) next.delete(connId);
      else next.add(connId);
      return next;
    });
  };

  const visibleTags = useMemo(() => {
    if (!browserDeviceId) return [];
    for (const connGroup of connTree) {
      const device = connGroup.devices.find((d) => d.deviceId === browserDeviceId);
      if (device) return device.tags;
    }
    return [];
  }, [browserDeviceId, connTree]);
  const visibleTagIds = useMemo(
    () => visibleTags.map((t) => t.id).slice(0, 100).sort().join(","),
    [visibleTags],
  );

  const rangeTo = useMemo(() => new Date(), []);
  const rangeFrom = useMemo(() => new Date(rangeTo.getTime() - 60 * 60 * 1000), [rangeTo]);

  const authHeadersBrowser = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const { data: latestValuesResp } = useGetQuery({
    key: [KEYS.tagValuesLatest, "browser", visibleTagIds],
    url: URLS.tagValuesLatest,
    apiClient: requestScreens,
    params: { tagIds: visibleTagIds },
    headers: authHeadersBrowser,
    enabled: !!session?.accessToken && visibleTagIds.length > 0,
  });

  const { data: aggregatesResp } = useGetQuery({
    key: [KEYS.tagValuesAggregates, "browser", visibleTagIds],
    url: URLS.tagValuesAggregates,
    apiClient: requestScreens,
    params: {
      tagIds: visibleTagIds,
      timeFrom: rangeFrom.toISOString(),
      timeTo: rangeTo.toISOString(),
      interval: "PT5M",
      fill: "locf",
    },
    headers: authHeadersBrowser,
    enabled: !!session?.accessToken && visibleTagIds.length > 0,
  });

  const { data: statisticsResp } = useGetQuery({
    key: [KEYS.tagValuesStatistics, "browser", browserTagId],
    url: URLS.tagValuesStatistics,
    apiClient: requestScreens,
    params: {
      tagIds: browserTagId,
      timeFrom: rangeFrom.toISOString(),
      timeTo: rangeTo.toISOString(),
    },
    headers: authHeadersBrowser,
    enabled: !!session?.accessToken && !!browserTagId,
  });

  const latestByTagId = useMemo(() => {
    const map = new Map();
    (get(latestValuesResp, "data.data", []) || []).forEach((item) => {
      if (item?.tagId) map.set(item.tagId, item);
    });
    return map;
  }, [latestValuesResp]);

  const aggregatesByTagId = useMemo(() => {
    const map = new Map();
    (get(aggregatesResp, "data.data", []) || []).forEach((item) => {
      if (item?.tagId) map.set(item.tagId, item.buckets || []);
    });
    return map;
  }, [aggregatesResp]);

  const statisticsForSelectedTag = get(statisticsResp, "data.data", [])[0] || null;

  const sparklinePoints = (buckets) => {
    const values = buckets.map((b) => b.avg).filter((v) => v !== null && v !== undefined);
    if (values.length < 2) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const w = 72;
    const h = 16;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / span) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const browserRows = visibleTags.map((tag) => {
    const live = latestByTagId.get(tag.id);
    const buckets = aggregatesByTagId.get(tag.id) || [];
    const mins = buckets.map((b) => b.min).filter((v) => v !== null && v !== undefined);
    const maxs = buckets.map((b) => b.max).filter((v) => v !== null && v !== undefined);
    const avgs = buckets.map((b) => b.avg).filter((v) => v !== null && v !== undefined);
    return {
      tag,
      live,
      spark: sparklinePoints(buckets),
      min: mins.length ? Math.min(...mins) : null,
      max: maxs.length ? Math.max(...maxs) : null,
      avg: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null,
    };
  });

  const fmt = (v) => (v === null || v === undefined ? "—" : Number(v).toFixed(2));

  const dataTypeFormOptions = useMemo(() => {
    const dynamic = Array.from(
      new Set(list.map((item) => item.dataType).filter(Boolean)),
    ).map((value) => ({ label: value, value }));

    return Array.from(
      new Map(
        [...DATA_TYPE_OPTIONS, ...dynamic].map((opt) => [opt.value, opt]),
      ).values(),
    );
  }, [list]);

  const protocolFormOptions = useMemo(() => {
    const dynamic = Array.from(
      new Set(list.map((item) => item.protocolType).filter(Boolean)),
    ).map((value) => ({ label: value, value }));

    return Array.from(
      new Map(
        [...PROTOCOL_OPTIONS_BASE, ...dynamic].map((opt) => [opt.value, opt]),
      ).values(),
    );
  }, [list]);

  const resetCreateForm = () => {
    setCreateForm(DEFAULT_FORM);
    setCreateErrors({});
  };

  const toForm = (tag) => ({
    name: tag?.name || "",
    description: tag?.description || "",
    dataType: tag?.dataType || "UINT32",
    scanRateMs: String(tag?.scanRateMs ?? "1000"),
    scale: String(tag?.scale ?? "1"),
    offset: String(tag?.offset ?? "0"),
    deadband: String(tag?.deadband ?? "0"),
    unit: tag?.unit || "",
    enabled: Boolean(tag?.enabled),
    deviceId: tag?.deviceId || "",
    type: tag?.protocolType || "MODBUS_TCP",
    count: String(tag?.count ?? "1"),
    address: String(tag?.address ?? ""),
    byte_order: tag?.byteOrder || "big",
    word_order: tag?.wordOrder || "big",
    register_type: tag?.registerType || "HOLDING_REGISTER",
  });

  const handleChangeCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleChangeEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = (form) => {
    const errors = {};

    if (!form.name?.trim()) {
      errors.name = "Введите имя тега";
    }

    if (!form.deviceId) {
      errors.deviceId = "Выберите устройство";
    }

    if (!form.dataType) {
      errors.dataType = "Выберите тип данных";
    }

    if (!form.type) {
      errors.type = "Выберите протокол";
    }

    if (!form.register_type) {
      errors.register_type = "Выберите тип регистра";
    }

    const numberFields = [
      "scanRateMs",
      "scale",
      "offset",
      "deadband",
      "count",
      "address",
    ];

    numberFields.forEach((field) => {
      const raw = String(form[field] ?? "").trim();
      if (!raw.length) {
        errors[field] = "Обязательное поле";
        return;
      }

      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        errors[field] = "Введите корректное число";
      }
    });

    if (!errors.scanRateMs && Number(form.scanRateMs) < 10) {
      errors.scanRateMs = "Интервал опроса должен быть не менее 10 мс";
    }

    if (!errors.scanRateMs && Number(form.scanRateMs) > 3600000) {
      errors.scanRateMs = "Интервал опроса не может превышать 3 600 000 мс";
    }

    if (!errors.count && Number(form.count) <= 0) {
      errors.count = "Количество должно быть больше 0";
    }

    if (!errors.address && Number(form.address) < 0) {
      errors.address = "Адрес не может быть отрицательным";
    }

    return errors;
  };

  const buildPayload = (form) => ({
    name: form.name.trim(),
    description: form.description?.trim() || "",
    dataType: form.dataType,
    scanRateMs: Number(form.scanRateMs),
    scale: Number(form.scale),
    offset: Number(form.offset),
    deadband: Number(form.deadband),
    unit: form.unit?.trim() || null,
    enabled: Boolean(form.enabled),
    params: {
      type: form.type,
      count: Number(form.count),
      address: Number(form.address),
      byte_order: form.byte_order,
      word_order: form.word_order,
      register_type: form.register_type,
    },
  });

  const handleCreateTag = () => {
    const errors = validateForm(createForm);
    if (Object.keys(errors).length) {
      setCreateErrors(errors);
      return;
    }

    createTag(
      {
        url: `${URLS.devices}/${createForm.deviceId}/tags`,
        attributes: buildPayload(createForm),
        config: {
          headers: {
            ...(session?.accessToken
              ? { Authorization: `Bearer ${session.accessToken}` }
              : {}),
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("Тег успешно создан");
          setShowCreateModal(false);
          resetCreateForm();
        },
        onError: (error) => {
          toast.error(
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка создания тега",
          );
        },
      },
    );
  };

  const handleUpdateTag = async () => {
    if (!editingTag?.id) return;

    const errors = validateForm(editForm);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }

    try {
      setIsUpdating(true);

      await requestPython.patch(
        `${URLS.devices}/${editForm.deviceId}/tags/${editingTag.id}`,
        buildPayload(editForm),
        {
          headers: {
            ...(session?.accessToken
              ? { Authorization: `Bearer ${session.accessToken}` }
              : {}),
          },
        },
      );

      toast.success("Тег успешно обновлён");
      queryClient.invalidateQueries({ queryKey: [KEYS.tags] });
      setShowEditModal(false);
      setEditingTag(null);
      setEditErrors({});
    } catch (error) {
      toast.error(
        translateApiError(get(error, "response.data.message")) ||
          "Ошибка обновления тега",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTag = () => {
    if (!deletingTag?.id) return;

    deleteTag(
      {
        url: `${URLS.devices}/${deletingTag.deviceId}/tags/${deletingTag.id}`,
        config: {
          headers: {
            ...(session?.accessToken
              ? { Authorization: `Bearer ${session.accessToken}` }
              : {}),
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("Тег удалён");
          if (selectedTag?.id === deletingTag.id) {
            setSelectedTag(null);
            setShowViewModal(false);
          }
          setShowDeleteModal(false);
          setDeletingTag(null);
        },
        onError: (error) => {
          toast.error(
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка удаления тега",
          );
        },
      },
    );
  };

  const openViewModal = (tag) => {
    setSelectedTag(tag);
    setShowViewModal(true);
  };

  const openEditModal = (tag) => {
    setEditingTag(tag);
    setEditForm(toForm(tag));
    setEditErrors({});
    setShowEditModal(true);
  };

  const openDeleteModal = (tag) => {
    setDeletingTag(tag);
    setShowDeleteModal(true);
  };

  // Только первая загрузка перекрывает страницу: раньше в условие входил и
  // isFetching, из-за чего любое фоновое обновление списка (возврат фокуса на
  // вкладку, инвалидация после правки тега) подменяло весь раздел загрузчиком.
  if (isLoadingTags) {
    return (
      <DashboardLayout headerTitle={"Теги"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Теги"}>
      <div className="font-ibmPlexSans space-y-2.5">
        {/* Сводка по всей выборке — постраничная таблица ниже её не показывает */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {[
            { label: "Всего тегов", value: summary.total },
            { label: "Опрашивается", value: summary.enabled, status: "ok" },
            {
              label: "Отключено",
              value: summary.disabled,
              status: summary.disabled ? "warn" : undefined,
            },
            { label: "Устройств", value: summary.devices },
            { label: "Протоколов", value: summary.protocols },
          ].map((tile, index) => (
            <Reveal key={tile.label} index={index}>
              <StatTile label={tile.label} value={tile.value} status={tile.status} dense />
            </Reveal>
          ))}
        </div>

        {/* Режим работы с разделом: описание тегов или их живые значения */}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "table", label: "Список", title: "Описание тегов: адреса, масштаб, период опроса" },
              {
                value: "browser",
                label: "Живые значения",
                title: "Дерево «Подключение → Устройство → Тег», текущие значения и статистика",
              },
            ]}
          />
          {isFetchingTags && (
            <span className="text-[13px] font-ibmPlexMono text-[#5c6270] animate-pulse">
              обновление…
            </span>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="h-9 px-4 rounded-[8px] bg-primary text-white text-[13px] font-semibold transition-colors hover:bg-[#2563eb] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            + Тег
          </button>
        </div>

        {viewMode === "table" ? (
          <Panel
            flush
            title="Список тегов"
            description="Описание тега: к какому устройству привязан, какой регистр читает и как часто."
            toolbar={
              <span className="text-[13px] font-ibmPlexMono text-[#6b7280]">
                {filteredList.length === list.length
                  ? `${list.length}`
                  : `${filteredList.length} из ${list.length}`}
              </span>
            }
          >
            {/* Фильтры отдельной полосой внутри панели — их четыре, в шапку они
                не помещаются, а над панелью висели бы в воздухе */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-surface-border">
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="поиск по имени, устройству, описанию"
                className="w-[280px] h-9 px-3 rounded-[8px] border border-surface-border bg-surface-1 text-[14px] text-[#e5e2e1] placeholder:text-[#5c6270] outline-none transition-colors hover:border-[#475569] focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <ChipSelect
                value={protocolFilter}
                onChange={setProtocolFilter}
                label="ПРОТОКОЛ"
                options={protocolFilterOptions}
              />
              <ChipSelect
                value={statusFilter}
                onChange={setStatusFilter}
                label="СТАТУС"
                options={[
                  { label: "ВСЕ", value: "all" },
                  { label: "ВКЛЮЧЕНО", value: "enabled" },
                  { label: "ОТКЛЮЧЕНО", value: "disabled" },
                ]}
              />
              <div className="w-[220px]">
                <CustomSelect
                  value={deviceFilter}
                  onChange={setDeviceFilter}
                  options={deviceFilterOptions}
                  placeholder="Устройство"
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-9 px-3 rounded-[8px] border border-surface-border text-[13px] text-[#bfc7d4] transition-colors hover:border-[#475569] hover:text-[#e5e2e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>

            {filteredList.length === 0 ? (
              <EmptyState
                title={list.length === 0 ? "Тегов пока нет" : "Ничего не найдено"}
                description={
                  list.length === 0
                    ? "Создайте первый тег — он определяет, какой регистр устройства опрашивать и как пересчитывать значение."
                    : "Ни один тег не подходит под текущие фильтры."
                }
                action={
                  hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="h-9 px-4 rounded-[8px] border border-surface-border text-[13px] text-[#bfc7d4] transition-colors hover:border-[#475569] hover:text-[#e5e2e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Сбросить фильтры
                    </button>
                  ) : null
                }
              />
            ) : (
              <>
                <CustomTable columns={tagColumns} data={paginatedList} />

                <div className="flex flex-col items-center justify-between gap-3 border-t border-surface-border px-4 py-3 sm:flex-row">
                  <div className="flex items-center gap-2 text-[13px] text-[#6b7280]">
                    <span>Строк на странице:</span>
                    {[10, 20, 50].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        className={`h-8 w-10 rounded-[8px] border text-[13px] font-ibmPlexMono transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 ${
                          pageSize === size
                            ? "border-primary/60 bg-primary/15 text-[#bfdbfe]"
                            : "border-surface-border bg-surface-1 text-[#bfc7d4] hover:border-[#475569]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-surface-border bg-surface-1 text-[#bfc7d4] transition-colors enabled:hover:border-[#475569] enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                      title="Предыдущая страница"
                    >
                      ‹
                    </button>
                    <span className="px-2 text-[13px] text-[#6b7280]">
                      <span className="font-ibmPlexMono text-[#e5e2e1]">{currentPage}</span> из{" "}
                      <span className="font-ibmPlexMono text-[#e5e2e1]">{totalPages}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-surface-border bg-surface-1 text-[#bfc7d4] transition-colors enabled:hover:border-[#475569] enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                      title="Следующая страница"
                    >
                      ›
                    </button>
                  </div>

                  <span className="text-[13px] text-[#6b7280]">
                    Показано{" "}
                    <span className="font-ibmPlexMono text-[#e5e2e1]">{paginatedList.length}</span>{" "}
                    из{" "}
                    <span className="font-ibmPlexMono text-[#e5e2e1]">{filteredList.length}</span>
                  </span>
                </div>
              </>
            )}
          </Panel>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_340px] gap-2.5 items-start">
            {/* ---- Дерево «Подключение → Устройство» ---- */}
            <Panel flush title="Оборудование" description="Выберите устройство, чтобы увидеть его теги.">
              {connTree.length === 0 ? (
                <EmptyState compact title="Тегов нет" description="Дерево строится по существующим тегам." />
              ) : (
                <div className="max-h-[62vh] overflow-y-auto">
                  {connTree.map((connGroup) => {
                    const isOpen = expandedConnIds.has(connGroup.connId);
                    return (
                      <div key={connGroup.connId}>
                        <button
                          type="button"
                          onClick={() => toggleConn(connGroup.connId)}
                          aria-expanded={isOpen}
                          className="w-full flex items-center gap-1.5 px-3 py-2 border-b border-surface-border/60 hover:bg-surface-3/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:ring-inset"
                        >
                          <KeyboardArrowDown
                            sx={{ fontSize: 16, color: "#5c6270", flexShrink: 0 }}
                            className="transition-transform"
                            style={{ transform: isOpen ? "none" : "rotate(-90deg)" }}
                          />
                          <Cable sx={{ fontSize: 14 }} className="text-primary flex-shrink-0" />
                          <span className="flex-1 min-w-0 text-[13.5px] text-[#bfc7d4] truncate">
                            {connGroup.connName}
                          </span>
                          <span className="flex-shrink-0 text-[12.5px] font-ibmPlexMono text-[#6b7280]">
                            {connGroup.tagCount}
                          </span>
                        </button>

                        {/* Раскрытие — рост высоты, а не мгновенная вставка:
                            при щелчке по подключению список устройств иначе
                            выталкивает всё, что ниже, без объяснения откуда */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key="devices"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              {connGroup.devices.map((device) => {
                            const isSelected = device.deviceId === browserDeviceId;
                            return (
                              <button
                                type="button"
                                key={device.deviceId || "none"}
                                onClick={() => {
                                  setBrowserDeviceId(device.deviceId);
                                  setBrowserTagId(null);
                                }}
                                aria-pressed={isSelected}
                                className={`w-full flex items-center gap-1.5 pl-8 pr-3 py-2 border-b border-surface-border/60 border-l-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:ring-inset ${
                                  isSelected
                                    ? "bg-primary/10 border-l-primary"
                                    : "border-l-transparent hover:bg-surface-3/50"
                                }`}
                              >
                                <Memory
                                  sx={{ fontSize: 14 }}
                                  style={{ color: STATUS_COLOR.ok }}
                                  className="flex-shrink-0"
                                />
                                <span
                                  className={`flex-1 min-w-0 text-[13.5px] truncate ${
                                    isSelected ? "text-[#e5e2e1]" : "text-[#bfc7d4]"
                                  }`}
                                >
                                  {device.deviceName || "Без устройства"}
                                </span>
                                <span className="flex-shrink-0 text-[12.5px] font-ibmPlexMono text-[#6b7280]">
                                  {device.tags.length}
                                </span>
                              </button>
                            );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* ---- Текущие значения выбранного устройства ---- */}
            <Panel
              flush
              title={
                browserDeviceId
                  ? `Значения · ${visibleTags[0]?.deviceName || "устройство"}`
                  : "Текущие значения"
              }
              description={
                browserDeviceId
                  ? `${visibleTags.length} ${plural(visibleTags.length, ["тег", "тега", "тегов"])} · среднее, минимум и максимум за последний час`
                  : "Данные приходят из /tag-values за последний час."
              }
            >
              {!browserDeviceId ? (
                <EmptyState
                  title="Устройство не выбрано"
                  description="Выберите устройство в дереве слева — здесь появятся текущие значения его тегов, тренд и качество данных."
                />
              ) : browserRows.length === 0 ? (
                <EmptyState compact title="У устройства нет тегов" />
              ) : (
                <div className="overflow-auto max-h-[62vh]">
                  <table className="w-full border-collapse text-[14px]">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <TagTh>Тег</TagTh>
                        <TagTh numeric>Значение</TagTh>
                        <TagTh>Тренд</TagTh>
                        <TagTh numeric>Мин</TagTh>
                        <TagTh numeric>Сред</TagTh>
                        <TagTh numeric>Макс</TagTh>
                        <TagTh>Качество</TagTh>
                        <TagTh numeric>Действия</TagTh>
                      </tr>
                    </thead>
                    <tbody>
                      {browserRows.map(({ tag, live, spark, min, max, avg }) => {
                        const hasError = live?.isError;
                        const isSelected = tag.id === browserTagId;
                        return (
                          <tr
                            key={tag.id}
                            onClick={() => setBrowserTagId(tag.id)}
                            className={`border-b border-surface-border/60 last:border-b-0 cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/15" : "hover:bg-surface-3/50"
                            }`}
                          >
                            <td className="px-3 py-1.5 min-w-0">
                              <span
                                className="block truncate max-w-[200px] text-[13.5px] text-[#e5e2e1]"
                                title={tag.name}
                              >
                                {tag.name}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right whitespace-nowrap">
                              <span
                                className="font-ibmPlexMono tabular-nums"
                                style={{ color: hasError ? STATUS_COLOR.alarm : "#e5e2e1" }}
                              >
                                {live ? (hasError ? "ошибка" : fmt(live.value)) : "—"}
                              </span>
                              {(tag.unit || live?.unit) && !hasError && (
                                <span className="ml-1 text-[12.5px] text-[#6b7280]">
                                  {tag.unit || live?.unit}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              {spark ? (
                                <svg width="72" height="18" className="block" aria-hidden="true">
                                  <polyline
                                    fill="none"
                                    stroke={STATUS_COLOR.ok}
                                    strokeWidth="1.2"
                                    points={spark}
                                  />
                                </svg>
                              ) : (
                                <span className="text-[12.5px] text-[#5c6270]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums text-[13px] text-[#6b7280]">
                              {fmt(min)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums text-[13px] text-[#bfc7d4]">
                              {fmt(avg)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-ibmPlexMono tabular-nums text-[13px] text-[#6b7280]">
                              {fmt(max)}
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <span
                                className="inline-flex items-center gap-1.5 text-[13px]"
                                style={{
                                  color: hasError
                                    ? STATUS_COLOR.alarm
                                    : live
                                      ? STATUS_COLOR.ok
                                      : "#5c6270",
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{
                                    background: hasError
                                      ? STATUS_COLOR.alarm
                                      : live
                                        ? STATUS_COLOR.ok
                                        : "#3a3a3a",
                                  }}
                                />
                                {hasError ? "ошибка" : live ? "норма" : "нет данных"}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center justify-end gap-1">
                                <RowAction
                                  title="Просмотр"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openViewModal(tag);
                                  }}
                                >
                                  <VisibilityRounded sx={{ fontSize: 15 }} />
                                </RowAction>
                                <RowAction
                                  title="Изменить"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(tag);
                                  }}
                                >
                                  <EditRounded sx={{ fontSize: 15 }} />
                                </RowAction>
                                <RowAction
                                  title="Удалить"
                                  danger
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(tag);
                                  }}
                                >
                                  <DeleteRounded sx={{ fontSize: 15 }} />
                                </RowAction>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* ---- Разбор выбранного тега ---- */}
            {/* На xl колонок только две — разбор тега встаёт под таблицу во всю ширину */}
            <div className="space-y-2.5 xl:col-span-2 2xl:col-span-1">
              <Panel
                title="Статистика за час"
                description={
                  browserTagId
                    ? visibleTags.find((t) => t.id === browserTagId)?.name
                    : undefined
                }
              >
                {!browserTagId ? (
                  <EmptyState compact title="Тег не выбран" description="Нажмите строку в таблице значений." />
                ) : !statisticsForSelectedTag ? (
                  <p className="py-3 text-[13px] text-[#6b7280]">Загрузка…</p>
                ) : (
                  <div>
                    {[
                      ["Отсчётов", statisticsForSelectedTag.count],
                      ["Среднее", fmt(statisticsForSelectedTag.avg)],
                      ["Минимум", fmt(statisticsForSelectedTag.min)],
                      ["Максимум", fmt(statisticsForSelectedTag.max)],
                      ["Первое значение", fmt(statisticsForSelectedTag.firstValue)],
                      ["Последнее значение", fmt(statisticsForSelectedTag.lastValue)],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-baseline justify-between gap-2 py-1.5 border-b border-surface-border/60 last:border-b-0"
                      >
                        <span className="text-[13px] text-[#6b7280]">{k}</span>
                        <span className="text-[13.5px] font-ibmPlexMono tabular-nums text-[#e5e2e1]">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Тренд" description="Пятиминутные интервалы за последний час.">
                {!browserTagId ? (
                  <EmptyState compact title="Тег не выбран" />
                ) : (
                  (() => {
                    const buckets = aggregatesByTagId.get(browserTagId) || [];
                    const avgs = buckets.map((b) => b.avg).filter((v) => v !== null && v !== undefined);
                    const maxs = buckets.map((b) => b.max).filter((v) => v !== null && v !== undefined);
                    if (avgs.length < 2) {
                      return (
                        <EmptyState
                          compact
                          title="Недостаточно данных"
                          description="Для линии нужно хотя бы два интервала с значениями."
                        />
                      );
                    }
                    const all = [...avgs, ...maxs];
                    const min = Math.min(...all);
                    const max = Math.max(...all);
                    const span = max - min || 1;
                    const w = 220;
                    const h = 88;
                    const toPoints = (values) =>
                      values
                        .map((v, i) => {
                          const x = (i / (values.length - 1)) * w;
                          const y = h - ((v - min) / span) * h;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(" ");
                    return (
                      <div>
                        <svg
                          width="100%"
                          height="96"
                          viewBox="0 0 220 90"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <line x1="0" y1="88" x2="220" y2="88" stroke="#2a2a2a" />
                          <line
                            x1="0"
                            y1="44"
                            x2="220"
                            y2="44"
                            stroke="#242424"
                            strokeDasharray="3 3"
                          />
                          <polyline
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="1.4"
                            points={toPoints(avgs)}
                            vectorEffect="non-scaling-stroke"
                          />
                          <polyline
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                            points={toPoints(maxs)}
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                        <div className="flex items-center justify-between gap-3 mt-2">
                          <span className="flex items-center gap-1.5 text-[12.5px] text-[#6b7280]">
                            <span className="w-3 h-0.5 inline-block bg-[#38bdf8]" />
                            среднее
                          </span>
                          <span className="flex items-center gap-1.5 text-[12.5px] text-[#6b7280]">
                            <span className="w-3 h-0.5 inline-block bg-[#f59e0b]" />
                            максимум
                          </span>
                          <span className="text-[12.5px] font-ibmPlexMono text-[#5c6270]">
                            {fmt(min)} … {fmt(max)}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>

      <MethodModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        closeClick={() => setShowCreateModal(false)}
        showCloseIcon={true}
        title={"Создать тег"}
        width={860}
      >
        <div className="space-y-3 font-mono">
          {/* Row 1: Name | Device | DataType */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Имя"
              required
              name="name"
              value={createForm.name}
              onChange={(event) =>
                handleChangeCreateField("name", event.target.value)
              }
              placeholder="Например, общая_энергия"
              error={createErrors.name}
            />
            <CustomSelect
              label="Устройство"
              required
              options={deviceOptions}
              value={createForm.deviceId}
              onChange={(value) => handleChangeCreateField("deviceId", value)}
              placeholder="Выберите устройство"
              error={createErrors.deviceId}
              sortOptions={false}
            />
            <CustomSelect
              label="Тип данных"
              required
              options={dataTypeFormOptions}
              value={createForm.dataType}
              onChange={(value) => handleChangeCreateField("dataType", value)}
              placeholder="Выберите тип данных"
              error={createErrors.dataType}
              sortOptions={false}
            />
          </div>

          {/* Row 2: Description | Unit | Status */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Описание"
              name="description"
              value={createForm.description}
              onChange={(event) =>
                handleChangeCreateField("description", event.target.value)
              }
              placeholder="Описание тега"
            />
            <Input
              label="Единица измерения"
              name="unit"
              value={createForm.unit}
              onChange={(event) =>
                handleChangeCreateField("unit", event.target.value)
              }
              placeholder="Например, кВт·ч"
            />
            <CustomSelect
              label="Статус"
              options={ENABLED_OPTIONS}
              value={createForm.enabled}
              onChange={(value) => handleChangeCreateField("enabled", value)}
              placeholder="Выберите статус"
              sortOptions={false}
            />
          </div>

          {/* Row 3: ScanRate | Scale | Offset | Deadband */}
          <div className="grid grid-cols-4 gap-3">
            <Input
              label="Интервал опроса (мс)"
              required
              type="number"
              name="scanRateMs"
              value={createForm.scanRateMs}
              onChange={(event) =>
                handleChangeCreateField("scanRateMs", event.target.value)
              }
              error={createErrors.scanRateMs}
            />
            <Input
              label="Scale"
              required
              type="number"
              name="scale"
              value={createForm.scale}
              onChange={(event) =>
                handleChangeCreateField("scale", event.target.value)
              }
              error={createErrors.scale}
            />
            <Input
              label="Offset"
              required
              type="number"
              name="offset"
              value={createForm.offset}
              onChange={(event) =>
                handleChangeCreateField("offset", event.target.value)
              }
              error={createErrors.offset}
            />
            <Input
              label="Deadband"
              required
              type="number"
              name="deadband"
              value={createForm.deadband}
              onChange={(event) =>
                handleChangeCreateField("deadband", event.target.value)
              }
              error={createErrors.deadband}
            />
          </div>

          <div className="rounded-[8px] border border-surface-border p-3 bg-surface-dark/50">
            <p className="text-xs text-text-muted font-semibold mb-2 uppercase tracking-wider">
              Параметры регистра
            </p>
            {/* Row 4: Protocol | RegisterType | Address | Count */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <CustomSelect
                label="Протокол"
                required
                options={protocolFormOptions}
                value={createForm.type}
                onChange={(value) => handleChangeCreateField("type", value)}
                placeholder="Выберите протокол"
                error={createErrors.type}
                sortOptions={false}
              />
              <CustomSelect
                label="Тип регистра"
                required
                options={REGISTER_TYPE_OPTIONS}
                value={createForm.register_type}
                onChange={(value) =>
                  handleChangeCreateField("register_type", value)
                }
                placeholder="Выберите тип регистра"
                error={createErrors.register_type}
                sortOptions={false}
              />
              <Input
                label="Адрес"
                required
                type="number"
                name="address"
                value={createForm.address}
                onChange={(event) =>
                  handleChangeCreateField("address", event.target.value)
                }
                error={createErrors.address}
              />
              <Input
                label="Количество"
                required
                type="number"
                name="count"
                value={createForm.count}
                onChange={(event) =>
                  handleChangeCreateField("count", event.target.value)
                }
                error={createErrors.count}
              />
            </div>
            {/* Row 5: Byte order | Word order */}
            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Порядок байтов"
                options={ENDIAN_OPTIONS}
                value={createForm.byte_order}
                onChange={(value) =>
                  handleChangeCreateField("byte_order", value)
                }
                sortOptions={false}
              />
              <CustomSelect
                label="Порядок слов"
                options={ENDIAN_OPTIONS}
                value={createForm.word_order}
                onChange={(value) =>
                  handleChangeCreateField("word_order", value)
                }
                sortOptions={false}
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              onClick={() => setShowCreateModal(false)}
              sx={{
                textTransform: "none",
                color: "#bfc7d4",
                borderColor: "#383737",
              }}
              variant="outlined"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={isCreatingTag}
              sx={{
                textTransform: "none",
                background: "#2563eb",
                color: "#eff6ff",
                "&:hover": { background: "#1d4ed8" },
              }}
              variant="contained"
            >
              {isCreatingTag ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </MethodModal>

      <MethodModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        closeClick={() => setShowEditModal(false)}
        showCloseIcon={true}
        title={"Редактировать тег"}
        width={860}
      >
        <div className="space-y-3 font-mono">
          {/* Row 1: Name | Device | DataType */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Имя"
              required
              name="name"
              value={editForm.name}
              onChange={(event) =>
                handleChangeEditField("name", event.target.value)
              }
              placeholder="Например, общая_энергия"
              error={editErrors.name}
            />
            <CustomSelect
              label="Устройство"
              required
              options={deviceOptions}
              value={editForm.deviceId}
              onChange={(value) => handleChangeEditField("deviceId", value)}
              placeholder="Выберите устройство"
              error={editErrors.deviceId}
              sortOptions={false}
            />
            <CustomSelect
              label="Тип данных"
              required
              options={dataTypeFormOptions}
              value={editForm.dataType}
              onChange={(value) => handleChangeEditField("dataType", value)}
              placeholder="Выберите тип данных"
              error={editErrors.dataType}
              sortOptions={false}
            />
          </div>

          {/* Row 2: Description | Unit | Status */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Описание"
              name="description"
              value={editForm.description}
              onChange={(event) =>
                handleChangeEditField("description", event.target.value)
              }
              placeholder="Описание тега"
            />
            <Input
              label="Единица измерения"
              name="unit"
              value={editForm.unit}
              onChange={(event) =>
                handleChangeEditField("unit", event.target.value)
              }
              placeholder="Например, кВт·ч"
            />
            <CustomSelect
              label="Статус"
              options={ENABLED_OPTIONS}
              value={editForm.enabled}
              onChange={(value) => handleChangeEditField("enabled", value)}
              placeholder="Выберите статус"
              sortOptions={false}
            />
          </div>

          {/* Row 3: ScanRate | Scale | Offset | Deadband */}
          <div className="grid grid-cols-4 gap-3">
            <Input
              label="Интервал опроса (мс)"
              required
              type="number"
              name="scanRateMs"
              value={editForm.scanRateMs}
              onChange={(event) =>
                handleChangeEditField("scanRateMs", event.target.value)
              }
              error={editErrors.scanRateMs}
            />
            <Input
              label="Scale"
              required
              type="number"
              name="scale"
              value={editForm.scale}
              onChange={(event) =>
                handleChangeEditField("scale", event.target.value)
              }
              error={editErrors.scale}
            />
            <Input
              label="Offset"
              required
              type="number"
              name="offset"
              value={editForm.offset}
              onChange={(event) =>
                handleChangeEditField("offset", event.target.value)
              }
              error={editErrors.offset}
            />
            <Input
              label="Deadband"
              required
              type="number"
              name="deadband"
              value={editForm.deadband}
              onChange={(event) =>
                handleChangeEditField("deadband", event.target.value)
              }
              error={editErrors.deadband}
            />
          </div>

          <div className="rounded-[8px] border border-surface-border p-3 bg-surface-dark/50">
            <p className="text-xs text-text-muted font-semibold mb-2 uppercase tracking-wider">
              Параметры регистра
            </p>
            {/* Row 4: Protocol | RegisterType | Address | Count */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <CustomSelect
                label="Протокол"
                required
                options={protocolFormOptions}
                value={editForm.type}
                onChange={(value) => handleChangeEditField("type", value)}
                placeholder="Выберите протокол"
                error={editErrors.type}
                sortOptions={false}
              />
              <CustomSelect
                label="Тип регистра"
                required
                options={REGISTER_TYPE_OPTIONS}
                value={editForm.register_type}
                onChange={(value) =>
                  handleChangeEditField("register_type", value)
                }
                placeholder="Выберите тип регистра"
                error={editErrors.register_type}
                sortOptions={false}
              />
              <Input
                label="Адрес"
                required
                type="number"
                name="address"
                value={editForm.address}
                onChange={(event) =>
                  handleChangeEditField("address", event.target.value)
                }
                error={editErrors.address}
              />
              <Input
                label="Количество"
                required
                type="number"
                name="count"
                value={editForm.count}
                onChange={(event) =>
                  handleChangeEditField("count", event.target.value)
                }
                error={editErrors.count}
              />
            </div>
            {/* Row 5: Byte order | Word order */}
            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Порядок байтов"
                options={ENDIAN_OPTIONS}
                value={editForm.byte_order}
                onChange={(value) => handleChangeEditField("byte_order", value)}
                sortOptions={false}
              />
              <CustomSelect
                label="Порядок слов"
                options={ENDIAN_OPTIONS}
                value={editForm.word_order}
                onChange={(value) => handleChangeEditField("word_order", value)}
                sortOptions={false}
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              onClick={() => setShowEditModal(false)}
              sx={{
                textTransform: "none",
                color: "#bfc7d4",
                borderColor: "#383737",
              }}
              variant="outlined"
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateTag}
              disabled={isUpdating}
              sx={{
                textTransform: "none",
                background: "#ea580c",
                color: "#fff7ed",
                "&:hover": { background: "#c2410c" },
              }}
              variant="contained"
            >
              {isUpdating ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </MethodModal>

      <MethodModal
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        closeClick={() => setShowViewModal(false)}
        showCloseIcon={true}
        title={"Детали тега"}
        width={680}
      >
        <div className="space-y-3 font-mono text-sm">
          <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Имя</p>
            <p className="text-text-primary font-semibold">
              {selectedTag?.name || "—"}
            </p>
          </div>

          <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Описание</p>
            <p className="text-text-primary">{selectedTag?.description || "—"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Тип данных</p>
              <p className="text-cyan-200">{selectedTag?.dataType || "—"}</p>
            </div>
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Интервал опроса</p>
              <p className="text-text-primary">
                {selectedTag?.scanRateMs || "—"} ms
              </p>
            </div>
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Масштаб / Смещение / Deadband</p>
              <p className="text-text-primary">
                {selectedTag?.scale} / {selectedTag?.offset} /{" "}
                {selectedTag?.deadband}
              </p>
            </div>
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Статус</p>
              <p className="text-text-primary">
                {selectedTag?.enabled ? "Включено" : "Отключено"}
              </p>
            </div>
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Протокол / Регистр</p>
              <p className="text-text-primary">
                {selectedTag?.protocolType} / {selectedTag?.registerType}
              </p>
            </div>
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Адрес / Количество</p>
              <p className="text-text-primary">
                {selectedTag?.address} / {selectedTag?.count}
              </p>
            </div>
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Порядок байтов / Порядок слов</p>
              <p className="text-text-primary">
                {selectedTag?.byteOrder} / {selectedTag?.wordOrder}
              </p>
            </div>
            <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Устройство</p>
              <p className="text-cyan-200 break-all">
                {selectedTag?.deviceName || "—"}
              </p>
            </div>
          </div>

          <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Идентификатор</p>
            <p className="text-text-primary break-all">{selectedTag?.id || "—"}</p>
          </div>
        </div>
      </MethodModal>

      <DeleteModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingTag(null);
        }}
        deleting={handleDeleteTag}
        title="Вы уверены, что хотите удалить тег?"
      >
        {deletingTag?.name
          ? `Тег «${deletingTag.name}» будет удалён без возможности восстановления.`
          : "Тег будет удалён без возможности восстановления."}
        {isDeletingTag ? " Выполняется удаление..." : ""}
      </DeleteModal>
    </DashboardLayout>
  );
};

/** Заголовок столбца — тот же вид, что у DataTable из общего набора. */
function TagTh({ children, numeric }) {
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

function RowAction({ children, title, onClick, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded-[8px] border border-surface-border text-[#7c8290] transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 ${
        danger
          ? "hover:border-[#f87171] hover:text-[#f87171] focus-visible:ring-[#f87171]/60"
          : "hover:border-primary hover:text-primary focus-visible:ring-primary/60"
      }`}
    >
      {children}
    </button>
  );
}

function plural(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export default Index;
