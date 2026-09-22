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
  TableRows,
  AccountTree,
  VisibilityRounded,
  EditRounded,
  DeleteRounded,
} from "@mui/icons-material";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import NoData from "@/components/no-data";
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
  const total = get(tags, "data.pagination.total", listRaw.length);
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
          className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] border text-[10.5px] font-semibold uppercase tracking-wide ${
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
            className="w-7 h-7 flex items-center justify-center rounded-[2px] border border-surface-border text-text-secondary hover:border-primary hover:text-primary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            <VisibilityRounded sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            title="Изменить"
            onClick={() => openEditModal(row.original)}
            className="w-7 h-7 flex items-center justify-center rounded-[2px] border border-surface-border text-text-secondary hover:border-primary hover:text-primary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            <EditRounded sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            title="Удалить"
            onClick={() => openDeleteModal(row.original)}
            className="w-7 h-7 flex items-center justify-center rounded-[2px] border border-surface-border text-status-fault hover:border-status-fault transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/60"
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

  if (isLoadingTags || isFetchingTags) {
    return (
      <DashboardLayout headerTitle={"Теги"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Теги"}>
      <div style={{ fontFamily: "'IBM Plex Sans'" }} className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="поиск тегов…"
            className="w-[230px] h-9 px-3 rounded-lg border border-white/15 bg-[#2c2c32] text-[13px] font-ibmPlexSans text-text-primary placeholder:text-text-faint outline-none hover:border-white/25 focus:border-primary focus:ring-2 focus:ring-primary transition-colors"
          />
          <ChipSelect value={protocolFilter} onChange={setProtocolFilter} label="ПРОТОКОЛ" options={protocolFilterOptions} />
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
          <div className="w-[200px]">
            <CustomSelect value={deviceFilter} onChange={setDeviceFilter} options={deviceFilterOptions} placeholder="Устройство" />
          </div>

          <div className="flex-1" />

          <div className="flex rounded-lg border border-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 h-9 px-3 text-[11px] font-ibmPlexMono uppercase tracking-wide transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-inset ${
                viewMode === "table" ? "bg-primary text-white hover:bg-primary/90" : "text-text-muted hover:bg-white/[0.04]"
              }`}
            >
              <TableRows sx={{ fontSize: 15 }} />
              Таблица
            </button>
            <button
              type="button"
              onClick={() => setViewMode("browser")}
              className={`flex items-center gap-1.5 h-9 px-3 text-[11px] font-ibmPlexMono uppercase tracking-wide border-l border-white/15 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-inset ${
                viewMode === "browser" ? "bg-primary text-white hover:bg-primary/90" : "text-text-muted hover:bg-white/[0.04]"
              }`}
              title="Дерево «Подключение → Устройство → Тег» + текущие значения, спарклайны и статистика"
            >
              <AccountTree sx={{ fontSize: 15 }} />
              Живые значения
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="h-9 px-4 rounded-lg border border-primary text-primary text-[11px] font-ibmPlexMono font-semibold hover:bg-primary hover:text-white active:scale-[0.96] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background-dark"
          >
            + ТЕГ
          </button>
        </div>

        {viewMode === "table" ? (
          <div className="rounded-xl border border-white/[0.08] bg-surface-dark">
            {filteredList.length === 0 ? (
              <NoData title="Теги не найдены" description="Измените фильтры или создайте новый тег." />
            ) : (
              <CustomTable columns={tagColumns} data={paginatedList} />
            )}

            {filteredList.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-3 sm:flex-row">
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span>Строк на странице:</span>
                  {[10, 20, 50].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      className={`h-7 w-9 rounded-[2px] border text-[10.5px] font-ibmPlexMono transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 ${
                        pageSize === size
                          ? "border-primary/70 bg-primary/20 text-primary hover:bg-primary/30"
                          : "border-surface-border bg-background-dark text-text-secondary hover:border-surface-border-hover"
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
                    className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition-colors enabled:hover:border-surface-border-hover enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                  >
                    ‹
                  </button>
                  <span className="text-[11px] text-text-muted px-1">
                    <span className="font-semibold text-text-primary">{currentPage}</span> из{" "}
                    <span className="font-semibold text-text-primary">{totalPages}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition-colors enabled:hover:border-surface-border-hover enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                  >
                    ›
                  </button>
                </div>
                <span className="text-[11px] text-text-muted">
                  <span className="font-semibold text-text-primary">{filteredList.length}</span> из{" "}
                  <span className="font-semibold text-text-primary">{list.length}</span> тегов
                </span>
              </div>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_260px] gap-3 items-start">
          {/* Дерево тегов */}
          <div className="rounded-xl border border-white/[0.08] bg-surface-dark overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/[0.08] text-[11px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-secondary">
              Дерево тегов
            </div>
            {connTree.length === 0 ? (
              <p className="px-3 py-4 text-[12.5px] text-text-faint italic">Теги не найдены</p>
            ) : (
              <div className="max-h-[480px] overflow-y-auto">
                {connTree.map((connGroup) => {
                  const isOpen = expandedConnIds.has(connGroup.connId);
                  return (
                    <div key={connGroup.connId}>
                      <button
                        type="button"
                        onClick={() => toggleConn(connGroup.connId)}
                        className="w-full flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:ring-inset"
                      >
                        <KeyboardArrowDown
                          sx={{ fontSize: 15, color: "#5c6270", flexShrink: 0 }}
                          className="transition-transform"
                          style={{ transform: isOpen ? "none" : "rotate(-90deg)" }}
                        />
                        <Cable sx={{ fontSize: 13 }} className="text-primary flex-shrink-0" />
                        <span className="flex-1 min-w-0 font-ibmPlexMono text-[12.5px] text-text-secondary truncate">
                          {connGroup.connName}
                        </span>
                        <span className="font-ibmPlexMono text-[10.5px] px-1.5 py-0.5 rounded-full bg-white/5 text-text-faint">
                          {connGroup.tagCount}
                        </span>
                      </button>

                      {isOpen &&
                        connGroup.devices.map((device) => {
                          const isSelected = device.deviceId === browserDeviceId;
                          return (
                            <button
                              type="button"
                              key={device.deviceId || "none"}
                              onClick={() => {
                                setBrowserDeviceId(device.deviceId);
                                setBrowserTagId(null);
                              }}
                              className={`w-full flex items-center gap-1.5 pl-8 pr-3 py-1.5 border-b border-white/[0.05] text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:ring-inset ${
                                isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-white/[0.03] border-l-2 border-l-transparent"
                              }`}
                            >
                              <Memory sx={{ fontSize: 13 }} className="text-status-ok flex-shrink-0" />
                              <span
                                className={`flex-1 min-w-0 font-ibmPlexMono text-[12.5px] truncate ${
                                  isSelected ? "text-text-primary" : "text-text-secondary"
                                }`}
                              >
                                {device.deviceName || "Без устройства"}
                              </span>
                              <span className="font-ibmPlexMono text-[10.5px] px-1.5 py-0.5 rounded-full bg-white/5 text-text-faint">
                                {device.tags.length}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Текущие значения выбранного устройства */}
          <div className="rounded-xl border border-white/[0.08] bg-surface-dark overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/[0.08]">
              <span className="text-[11px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-secondary truncate">
                {browserDeviceId
                  ? `${visibleTags[0]?.deviceName || ""} · ${visibleTags.length} тегов`
                  : "Выберите устройство слева"}
              </span>
              {browserDeviceId && (
                <span className="flex-shrink-0 font-ibmPlexMono text-[10.5px] text-text-faint">/tag-values/latest</span>
              )}
            </div>
            {!browserDeviceId ? (
              <p className="px-3 py-4 text-[12.5px] text-text-faint italic">
                Выберите устройство, чтобы увидеть текущие значения его тегов
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background-dark/40 border-b border-white/[0.08]">
                      {["Тег", "Значение", "Ед.", "Тренд", "Мин", "Сред", "Макс", "Качество", "Действия"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-[10px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-faint whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {browserRows.map(({ tag, live, spark, min, max, avg }) => {
                      const hasError = live?.isError;
                      const quality = hasError ? "ОШИБКА" : live ? "НОРМА" : "—";
                      const isSelected = tag.id === browserTagId;
                      return (
                        <tr
                          key={tag.id}
                          onClick={() => setBrowserTagId(tag.id)}
                          className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <td className="px-3 py-1.5 font-ibmPlexMono text-[13px] text-text-primary truncate max-w-[160px]">
                            {tag.name}
                          </td>
                          <td
                            className={`px-3 py-1.5 text-right font-ibmPlexMono text-[13px] font-medium ${
                              hasError ? "text-status-fault" : "text-text-primary"
                            }`}
                          >
                            {live ? (hasError ? "ОШБК" : fmt(live.value)) : "—"}
                          </td>
                          <td className="px-3 py-1.5 font-ibmPlexMono text-[12px] text-text-faint">
                            {tag.unit || live?.unit || ""}
                          </td>
                          <td className="px-3 py-1.5">
                            {spark ? (
                              <svg width="72" height="16" className="block">
                                <polyline fill="none" stroke="#3987e5" strokeWidth="1" points={spark} />
                              </svg>
                            ) : (
                              <span className="text-text-faint text-[12px]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-right font-ibmPlexMono text-[12px] text-text-faint">{fmt(min)}</td>
                          <td className="px-3 py-1.5 text-right font-ibmPlexMono text-[12px] text-text-secondary">{fmt(avg)}</td>
                          <td className="px-3 py-1.5 text-right font-ibmPlexMono text-[12px] text-text-faint">{fmt(max)}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-ibmPlexMono font-semibold uppercase ${
                                quality === "НОРМА"
                                  ? "text-status-ok bg-status-ok/10"
                                  : quality === "ОШИБКА"
                                    ? "text-status-fault bg-status-fault/10"
                                    : "text-text-faint bg-white/5"
                              }`}
                            >
                              {quality}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Просмотр"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openViewModal(tag);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-[2px] text-text-faint hover:text-primary hover:bg-white/[0.06] transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                              >
                                <VisibilityRounded sx={{ fontSize: 14 }} />
                              </button>
                              <button
                                type="button"
                                title="Изменить"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(tag);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-[2px] text-text-faint hover:text-primary hover:bg-white/[0.06] transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                              >
                                <EditRounded sx={{ fontSize: 14 }} />
                              </button>
                              <button
                                type="button"
                                title="Удалить"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteModal(tag);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-[2px] text-text-faint hover:text-status-fault hover:bg-white/[0.06] transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/60"
                              >
                                <DeleteRounded sx={{ fontSize: 14 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Статистика + агрегаты выбранного тега */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-surface-dark overflow-hidden">
              <div className="px-3 py-2.5 border-b border-white/[0.08] text-[11px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-secondary truncate">
                Статистика {browserTagId ? `· ${visibleTags.find((t) => t.id === browserTagId)?.name}` : ""}
              </div>
              {!browserTagId ? (
                <p className="px-3 py-4 text-[12.5px] text-text-faint italic">Выберите тег в таблице</p>
              ) : !statisticsForSelectedTag ? (
                <p className="px-3 py-4 text-[12.5px] text-text-muted">Загрузка…</p>
              ) : (
                <div className="px-3 py-2 space-y-0.5">
                  {[
                    ["Отсчётов (1ч)", statisticsForSelectedTag.count],
                    ["Среднее", fmt(statisticsForSelectedTag.avg)],
                    ["Минимум", fmt(statisticsForSelectedTag.min)],
                    ["Максимум", fmt(statisticsForSelectedTag.max)],
                    ["Первое значение", fmt(statisticsForSelectedTag.firstValue)],
                    ["Последнее значение", fmt(statisticsForSelectedTag.lastValue)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.05] last:border-b-0">
                      <span className="text-[12px] font-ibmPlexSans text-text-faint">{k}</span>
                      <span className="font-ibmPlexMono text-[13px] font-medium text-text-primary">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-surface-dark overflow-hidden">
              <div className="px-3 py-2.5 border-b border-white/[0.08] text-[11px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-secondary">
                Агрегаты · бакеты 5 мин
              </div>
              {!browserTagId ? (
                <p className="px-3 py-4 text-[12.5px] text-text-faint italic">Выберите тег в таблице</p>
              ) : (
                (() => {
                  const buckets = aggregatesByTagId.get(browserTagId) || [];
                  const avgs = buckets.map((b) => b.avg).filter((v) => v !== null && v !== undefined);
                  const maxs = buckets.map((b) => b.max).filter((v) => v !== null && v !== undefined);
                  if (avgs.length < 2) {
                    return <p className="px-3 py-4 text-[12.5px] text-text-faint italic">Недостаточно данных</p>;
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
                    <div className="p-3">
                      <svg width="100%" height="90" viewBox="0 0 220 90" preserveAspectRatio="none">
                        <line x1="0" y1="88" x2="220" y2="88" stroke="#2a2a2a" />
                        <line x1="0" y1="44" x2="220" y2="44" stroke="#232222" strokeDasharray="3 3" />
                        <polyline fill="none" stroke="#3987e5" strokeWidth="1.4" points={toPoints(avgs)} />
                        <polyline fill="none" stroke="#c98500" strokeWidth="1" strokeDasharray="3 2" points={toPoints(maxs)} />
                      </svg>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1.5 font-ibmPlexMono text-[11px] text-text-faint">
                          <span className="w-2.5 h-0.5 inline-block bg-[#3987e5]" />
                          сред.
                        </span>
                        <span className="flex items-center gap-1.5 font-ibmPlexMono text-[11px] text-text-faint">
                          <span className="w-2.5 h-0.5 inline-block bg-[#c98500]" />
                          макс.
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
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

          <div className="rounded-[2px] border border-surface-border p-3 bg-surface-dark/50">
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

          <div className="rounded-[2px] border border-surface-border p-3 bg-surface-dark/50">
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
          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Имя</p>
            <p className="text-text-primary font-semibold">
              {selectedTag?.name || "—"}
            </p>
          </div>

          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Описание</p>
            <p className="text-text-primary">{selectedTag?.description || "—"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Тип данных</p>
              <p className="text-cyan-200">{selectedTag?.dataType || "—"}</p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Интервал опроса</p>
              <p className="text-text-primary">
                {selectedTag?.scanRateMs || "—"} ms
              </p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Масштаб / Смещение / Deadband</p>
              <p className="text-text-primary">
                {selectedTag?.scale} / {selectedTag?.offset} /{" "}
                {selectedTag?.deadband}
              </p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Статус</p>
              <p className="text-text-primary">
                {selectedTag?.enabled ? "Включено" : "Отключено"}
              </p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Протокол / Регистр</p>
              <p className="text-text-primary">
                {selectedTag?.protocolType} / {selectedTag?.registerType}
              </p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Адрес / Количество</p>
              <p className="text-text-primary">
                {selectedTag?.address} / {selectedTag?.count}
              </p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Порядок байтов / Порядок слов</p>
              <p className="text-text-primary">
                {selectedTag?.byteOrder} / {selectedTag?.wordOrder}
              </p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Устройство</p>
              <p className="text-cyan-200 break-all">
                {selectedTag?.deviceName || "—"}
              </p>
            </div>
          </div>

          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
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

export default Index;
