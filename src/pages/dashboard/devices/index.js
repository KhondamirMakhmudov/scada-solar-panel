import { useEffect, useMemo, useState } from "react";
import { get } from "lodash";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { translateApiError } from "@/lib/apiErrorTranslation";
import ContentLoader from "@/components/loader";
import NoData from "@/components/no-data";
import CustomTable from "@/components/table";
import CustomSelect from "@/components/select";
import ChipSelect from "@/components/chip-select";
import Input from "@/components/input";
import MethodModal from "@/components/modal/method-modal";
import DeleteModal from "@/components/modal/delete-modal";
import {
  ActionButtonGroup,
  DeleteButton,
  EditButton,
  EyeButton,
} from "@/components/button";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import usePostQuery from "@/hooks/all/usePostQuery";
import useDeleteQuery from "@/hooks/all/useDeleteQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { requestPython } from "@/services/api";
import { TableRows, ViewModule } from "@mui/icons-material";
import { Button } from "@mui/material";
import DeviceDetailsModal from "@/features/devices/DeviceDetailsModal";
import { deviceAddressLabel } from "@/features/devices/deviceDisplay";

const STATUS_OPTIONS = [
  { label: "Все", value: "all" },
  { label: "Включено", value: "enabled" },
  { label: "Отключено", value: "disabled" },
];

const ENABLED_OPTIONS = [
  { label: "Включено", value: true },
  { label: "Отключено", value: false },
];

const PROTOCOL_BASE_OPTIONS = [
  { label: "MODBUS_TCP", value: "MODBUS_TCP" },
  { label: "MODBUS_RTU_OVER_TCP", value: "MODBUS_RTU_OVER_TCP" },
];

const DEFAULT_FORM = {
  name: "",
  description: "",
  connectionId: "",
  enabled: true,
  type: "MODBUS_TCP",
  slave_address: "",
  siteId: "",
  ratedPowerKw: "",
};

const NO_SITE_OPTION = { label: "Без станции", value: "" };

const VIEW_MODE_OPTIONS = [
  { label: "Таблица", value: "table", icon: TableRows },
  { label: "Карточки", value: "grid", icon: ViewModule },
];

const getStatusStyles = (enabled) => {
  if (enabled) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30";
  }

  return "bg-rose-500/15 text-rose-300 border border-rose-400/30";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const DeviceCard = ({ device, onView, onEdit, onDelete }) => {
  const protocol = get(device, "params.type", "—");
  const address = deviceAddressLabel(device.params);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2px] border border-surface-border/70 bg-surface-dark/70 p-5 shadow-[0_0_30px_rgba(15,23,42,0.55)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {device.name}
          </h3>
          <p className="mt-1 text-xs text-text-muted">ID: {device.id}</p>
        </div>
        <span
          className={`rounded-[2px] px-2.5 py-1 text-xs font-medium ${getStatusStyles(device.enabled)}`}
        >
          {device.enabled ? "Включено" : "Отключено"}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-[2px] border border-surface-border/50 bg-background-dark/60 px-3 py-2">
          <span className="text-text-muted">Протокол</span>
          <span className="font-medium text-blue-300">{protocol}</span>
        </div>
        <div className="flex items-center justify-between rounded-[2px] border border-surface-border/50 bg-background-dark/60 px-3 py-2">
          <span className="text-text-muted">Адрес</span>
          <span className="font-medium text-text-primary">{address}</span>
        </div>
        <div className="flex items-center justify-between rounded-[2px] border border-surface-border/50 bg-background-dark/60 px-3 py-2">
          <span className="text-text-muted">Connection ID</span>
          <span
            className="max-w-[170px] truncate font-medium text-cyan-300"
            title={device.connectionId}
          >
            {device.connectionId || "—"}
          </span>
        </div>
      </div>

      <div className="mt-4 text-xs text-text-dim">
        Обновлено:{" "}
        <span className="text-text-secondary">
          {formatDate(device.updatedAt)}
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-surface-border/60">
        <ActionButtonGroup>
          <EyeButton onClick={onView} tooltip="Детали устройства" />
          <EditButton onClick={onEdit} tooltip="Изменить устройство" />
          <DeleteButton onClick={onDelete} tooltip="Удалить устройство" />
        </ActionButtonGroup>
      </div>
    </motion.div>
  );
};

const Index = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deletingDevice, setDeletingDevice] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // Отфильтрованный список (поиск/протокол/статус) листается на клиенте по
  // всей выборке — сервер такие фильтры не принимает. Без фильтров сервер
  // отдаёт ровно одну страницу и её же счётчики (см. `pagination` в ответе),
  // так что не приходится тянуть всех 67+ устройств только чтобы пролистать
  // список из 10.
  const hasActiveFilters =
    Boolean(searchValue.trim()) ||
    statusFilter !== "all" ||
    protocolFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, statusFilter, protocolFilter]);

  const {
    data: devices,
    isLoading: isLoadingDevices,
    isFetching: isFetchingDevices,
  } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
    params: hasActiveFilters
      ? { page: 1, pageSize: 100 }
      : { page: currentPage, pageSize },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Протоколы для фильтра и форм собираются с отдельной, заведомо широкой
  // выборки — иначе список протоколов зависел бы от того, какая страница
  // сейчас открыта, и прыгал бы при листании.
  const { data: devicesForOptions } = useGetQuery({
    key: [KEYS.devices, "options"],
    url: URLS.devices,
    params: { page: 1, pageSize: 100 },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const { data: connects } = useGetQuery({
    key: KEYS.connects,
    url: URLS.connects,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Только для колонки «Теги» в таблице ниже. /tags тоже постраничный (то же
  // "pagination" в ответе, что и у /devices) — без pageSize сервер вернул бы
  // только первую страницу тегов, и счётчик занижал бы количество для любого
  // устройства, чьи теги не попали в неё.
  const { data: tagsForCount } = useGetQuery({
    key: [KEYS.tags, "devices-count"],
    url: URLS.tags,
    params: { page: 1, pageSize: 1000 },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Станции (GET /sites) — для выбора привязки устройства и колонки «Станция».
  const { data: sitesData } = useGetQuery({
    key: KEYS.sites,
    url: URLS.sites,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const { mutate: createDevice, isLoading: isCreatingDevice } = usePostQuery({
    listKeyId: KEYS.devices,
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const { mutate: deleteDevice, isPending: isDeletingDevice } = useDeleteQuery({
    listKeyId: KEYS.devices,
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const list = get(devices, "data.data", []);
  const serverPagination = get(devices, "data.pagination", null);
  const optionsList = get(devicesForOptions, "data.data", []);
  const connections = get(connects, "data.data", []);
  const connectionNameById = new Map(
    connections.map((c) => [c.id, c.name || c.id]),
  );

  const tagCountByDevice = new Map();
  get(tagsForCount, "data.data", []).forEach((tag) => {
    const deviceId = tag.deviceId || get(tag, "device.id", "");
    if (!deviceId) return;
    tagCountByDevice.set(deviceId, (tagCountByDevice.get(deviceId) || 0) + 1);
  });

  const protocolOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        optionsList.map((item) => get(item, "params.type", "")).filter(Boolean),
      ),
    );

    return [{ label: "Все протоколы", value: "all" }].concat(
      unique.map((value) => ({ label: value, value })),
    );
  }, [optionsList]);

  const protocolTypeOptions = useMemo(() => {
    const dynamicOptions = Array.from(
      new Set(
        optionsList.map((item) => get(item, "params.type", "")).filter(Boolean),
      ),
    ).map((value) => ({ label: value, value }));

    const merged = [...PROTOCOL_BASE_OPTIONS, ...dynamicOptions];
    const deduplicated = Array.from(
      new Map(merged.map((option) => [option.value, option])).values(),
    );

    return deduplicated;
  }, [optionsList]);

  const connectionOptions = useMemo(
    () =>
      connections.map((item) => ({
        label: `${item.name || "Connection"} (${item.id?.slice(0, 8) || "—"})`,
        value: item.id,
      })),
    [connections],
  );

  const sites = get(sitesData, "data.data", []);
  const siteNameById = new Map(sites.map((s) => [s.id, s.name || s.code]));
  const siteOptions = useMemo(
    () => [
      NO_SITE_OPTION,
      ...sites.map((item) => ({
        label: `${item.name || item.code}${item.code ? ` (${item.code})` : ""}`,
        value: item.id,
      })),
    ],
    [sites],
  );

  const toForm = (device) => ({
    siteId: device?.siteId || "",
    ratedPowerKw:
      device?.ratedPowerKw === null || device?.ratedPowerKw === undefined
        ? ""
        : String(device.ratedPowerKw),
    name: device?.name || "",
    description: device?.description || "",
    connectionId: device?.connectionId || "",
    enabled: Boolean(device?.enabled),
    type: get(device, "params.type", "MODBUS_TCP"),
    slave_address: String(get(device, "params.slave_address", "")),
  });

  const resetCreateForm = () => {
    setCreateForm(DEFAULT_FORM);
    setFormErrors({});
  };

  const validateForm = (form) => {
    const errors = {};

    if (!form.name?.trim()) {
      errors.name = "Введите название устройства";
    } else if (form.name.trim().length > 255) {
      errors.name = "Название должно быть не длиннее 255 символов";
    }

    if (!form.connectionId?.trim()) {
      errors.connectionId = "Выберите подключение";
    }

    if (!form.type?.trim()) {
      errors.type = "Выберите тип протокола";
    }

    const slaveRaw = String(form.slave_address ?? "").trim();
    if (!slaveRaw.length) {
      errors.slave_address = "Введите slave address";
    } else {
      const parsed = Number(slaveRaw);
      if (Number.isNaN(parsed) || parsed < 0) {
        errors.slave_address = "Введите корректное число";
      }
    }

    const ratedRaw = String(form.ratedPowerKw ?? "").trim();
    if (ratedRaw) {
      const rated = Number(ratedRaw);
      if (!Number.isFinite(rated) || rated < 0) {
        errors.ratedPowerKw = "Введите неотрицательное число";
      }
    }

    return errors;
  };

  // siteId/ratedPowerKw: пустое поле уходит как null — для PATCH это
  // «отвязать от станции» / «номинал не указан», а не «не менять».
  const buildPayload = (form) => ({
    name: form.name.trim(),
    description: form.description?.trim() || "",
    connectionId: form.connectionId,
    siteId: form.siteId || null,
    ratedPowerKw: String(form.ratedPowerKw ?? "").trim()
      ? Number(form.ratedPowerKw)
      : null,
    enabled: Boolean(form.enabled),
    params: {
      type: form.type,
      slave_address: Number(form.slave_address),
    },
  });

  const handleCreateDevice = () => {
    const errors = validateForm(createForm);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    createDevice(
      {
        url: URLS.devices,
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
          toast.success("Устройство успешно создано");
          setShowCreateModal(false);
          resetCreateForm();
        },
        onError: (error) => {
          toast.error(
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка при создании устройства",
          );
        },
      },
    );
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice?.id) return;

    const errors = validateForm(editForm);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }

    try {
      setIsUpdating(true);

      await requestPython.patch(
        `${URLS.devices}/${editingDevice.id}`,
        buildPayload(editForm),
        {
          headers: {
            ...(session?.accessToken
              ? { Authorization: `Bearer ${session.accessToken}` }
              : {}),
          },
        },
      );

      toast.success("Устройство успешно обновлено");
      queryClient.invalidateQueries({ queryKey: [KEYS.devices] });
      setShowEditModal(false);
      setEditingDevice(null);
      setEditErrors({});
    } catch (error) {
      toast.error(
        translateApiError(get(error, "response.data.message")) ||
          "Ошибка при обновлении устройства",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDevice = () => {
    if (!deletingDevice?.id) return;

    deleteDevice(
      {
        url: `${URLS.devices}/${deletingDevice.id}`,
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
          toast.success("Устройство удалено");
          if (selectedDevice?.id === deletingDevice.id) {
            setSelectedDevice(null);
            setShowViewModal(false);
          }
          setShowDeleteModal(false);
          setDeletingDevice(null);
        },
        onError: (error) => {
          toast.error(
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка при удалении устройства",
          );
        },
      },
    );
  };

  const openEditModal = (device) => {
    setEditingDevice(device);
    setEditForm(toForm(device));
    setEditErrors({});
    setShowEditModal(true);
  };

  const openViewModal = (device) => {
    setSelectedDevice(device);
    setShowViewModal(true);
  };

  const openDeleteModal = (device) => {
    setDeletingDevice(device);
    setShowDeleteModal(true);
  };

  const handleChangeCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleChangeEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Без активных фильтров `list` — это уже ровно одна страница с сервера
  // (см. hasActiveFilters выше), фильтровать её повторно незачем и нечем:
  // остальные 47 устройств, если они есть, просто не загружены сейчас.
  const filteredDevices = useMemo(() => {
    if (!hasActiveFilters) return list;

    const query = searchValue.trim().toLowerCase();

    return list.filter((item) => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.id?.toLowerCase().includes(query) ||
        item.connectionId?.toLowerCase().includes(query) ||
        deviceAddressLabel(item.params).toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" ? item.enabled : !item.enabled);

      const currentType = get(item, "params.type", "");
      const matchesProtocol =
        protocolFilter === "all" || currentType === protocolFilter;

      return matchesSearch && matchesStatus && matchesProtocol;
    });
  }, [list, hasActiveFilters, searchValue, statusFilter, protocolFilter]);

  // With filters active, `list` holds up to 500 devices fetched in one go
  // (see hasActiveFilters above) and pagination happens on the client, same
  // as before. Without filters, the server already returned exactly one
  // page — its own `pagination` block drives the count/page UI instead of
  // being recomputed from a client-side array that may not hold everything.
  const totalRecords = hasActiveFilters
    ? filteredDevices.length
    : (serverPagination?.total ?? list.length);
  const totalPages = hasActiveFilters
    ? Math.max(1, Math.ceil(filteredDevices.length / pageSize))
    : Math.max(1, serverPagination?.totalPages ?? 1);
  const paginatedDevices = hasActiveFilters
    ? filteredDevices.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      )
    : list;

  const columns = [
    {
      accessorKey: "name",
      header: "Устройство",
      cell: ({ row }) => (
        <span
          style={{ font: "500 13.5px/1.3 'IBM Plex Mono'", color: "#e5e2e1" }}
        >
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "connectionId",
      header: "Подключение",
      cell: ({ row }) => (
        <span
          className="block max-w-[160px] truncate"
          style={{ font: "400 13px/1.3 'IBM Plex Mono'", color: "#bfc7d4" }}
          title={row.original.connectionId}
        >
          {connectionNameById.get(row.original.connectionId) ||
            row.original.connectionId ||
            "—"}
        </span>
      ),
    },
    {
      id: "site",
      header: "Станция",
      cell: ({ row }) => {
        const name = siteNameById.get(row.original.siteId);
        return (
          <span
            className="block max-w-[160px] truncate"
            style={{
              font: "400 13px/1.3 'IBM Plex Mono'",
              color: name ? "#bfc7d4" : "#5c6270",
            }}
            title={name || "Не привязано к станции"}
          >
            {name || "—"}
          </span>
        );
      },
    },
    {
      id: "protocol",
      header: "Протокол",
      cell: ({ row }) => (
        <span
          style={{ font: "400 13px/1.3 'IBM Plex Mono'", color: "#bfc7d4" }}
        >
          {get(row.original, "params.type", "—")}
        </span>
      ),
    },
    {
      id: "address",
      header: "Адрес",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span
          className="block text-right"
          style={{ font: "400 13.5px/1.3 'IBM Plex Mono'", color: "#bfc7d4" }}
        >
          {deviceAddressLabel(row.original.params)}
        </span>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Статус",
      cell: ({ row }) => {
        const color = row.original.enabled ? "#22c55e" : "#ef4444";
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "1px 6px",
              border: `1px solid ${color}`,
              borderRadius: 2,
              font: "600 12px/1.6 'IBM Plex Mono'",
              color,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: color,
              }}
            />
            {row.original.enabled ? "ВКЛЮЧЕНО" : "ОТКЛЮЧЕНО"}
          </span>
        );
      },
    },
    {
      id: "tags",
      header: "Теги",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span
          className="block text-right"
          style={{ font: "400 13.5px/1.3 'IBM Plex Mono'", color: "#bfc7d4" }}
        >
          {tagCountByDevice.get(row.original.id) || 0}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div
          className="text-right"
          style={{ font: "500 12.5px/1.4 'IBM Plex Mono'" }}
        >
          <button
            type="button"
            onClick={() => openViewModal(row.original)}
            style={{ color: "#3b82f6" }}
            className="hover:underline active:opacity-70 rounded-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            ПРОСМОТР
          </button>
          <span style={{ color: "#3b82f6" }}> · </span>
          <button
            type="button"
            onClick={() => openEditModal(row.original)}
            style={{ color: "#3b82f6" }}
            className="hover:underline active:opacity-70 rounded-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            ИЗМЕНИТЬ
          </button>
          <span style={{ color: "#3b82f6" }}> · </span>
          <button
            type="button"
            onClick={() => openDeleteModal(row.original)}
            style={{ color: "#3b82f6" }}
            className="hover:underline active:opacity-70 rounded-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            УДАЛИТЬ
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  // Only the very first load blocks the page — a page-turn now triggers a
  // real network refetch (server-side pagination), and `useGetQuery` already
  // holds the previous page on screen while it's in flight (placeholderData
  // below), so blanking the whole page out on every click would be a
  // regression from when pagination was pure client-side slicing.
  if (isLoadingDevices) {
    return (
      <DashboardLayout headerTitle={"Устройства"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Устройства"}>
      <div className="font-ibmPlexSans space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="поиск устройств…"
            className="transition-colors hover:border-white/25 focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            style={{
              width: 230,
              height: 36,
              padding: "0 12px",
              background: "#2c2c32",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              color: "#e5e2e1",
              font: "400 14px/1.3 'IBM Plex Mono'",
            }}
          />
          <ChipSelect
            value={statusFilter}
            onChange={setStatusFilter}
            label="СТАТУС"
            options={STATUS_OPTIONS}
          />
          <ChipSelect
            value={protocolFilter}
            onChange={setProtocolFilter}
            label="ПРОТОКОЛ"
            options={protocolOptions}
          />
          {isFetchingDevices && (
            <span className="text-[13px] font-ibmPlexMono text-text-faint animate-pulse">
              обновление…
            </span>
          )}

          <div className="flex-1" />

          <div className="flex rounded-lg border border-white/15 overflow-hidden">
            {VIEW_MODE_OPTIONS.map((item, idx) => {
              const isActive = viewMode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setViewMode(item.value)}
                  className="transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-inset"
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    font: "500 12.5px/1.5 'IBM Plex Mono'",
                    borderLeft:
                      idx > 0 ? "1px solid rgba(255,255,255,0.15)" : "none",
                    background: isActive ? "#3b82f6" : "transparent",
                    color: isActive ? "#fff" : "#9aa0ac",
                    textTransform: "uppercase",
                  }}
                >
                  {item.value === "table" ? "ТАБЛИЦА" : "КАРТОЧКИ"}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="transition-colors hover:bg-primary/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            style={{
              padding: "8px 14px",
              border: "1px solid #3b82f6",
              borderRadius: 8,
              font: "600 13px/1.2 'IBM Plex Mono'",
              color: "#3b82f6",
              cursor: "pointer",
            }}
          >
            + УСТРОЙСТВО
          </button>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-surface-dark">
          {paginatedDevices.length === 0 ? (
            <NoData
              title="Устройства не найдены"
              description="Попробуйте изменить параметры фильтрации или добавьте новое устройство."
            />
          ) : viewMode === "table" ? (
            <CustomTable columns={columns} data={paginatedDevices} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {paginatedDevices.map((item) => (
                <DeviceCard
                  key={item.id}
                  device={item}
                  onView={() => openViewModal(item)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => openDeleteModal(item)}
                />
              ))}
            </div>
          )}

          {paginatedDevices.length > 0 && (
            <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-surface-border/60 pt-4 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span>Строк на странице:</span>
                {[10, 20, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`h-8 w-10 rounded-[2px] border text-xs font-medium transition active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 ${
                      pageSize === size
                        ? "border-blue-500/70 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"
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
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition enabled:hover:border-surface-border-hover enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
                  title="Первая"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition enabled:hover:border-surface-border-hover enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
                  title="Назад"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1,
                  )
                  .reduce((acc, page, idx, arr) => {
                    if (idx > 0 && page - arr[idx - 1] > 1) {
                      acc.push("...");
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="flex h-8 w-8 items-center justify-center text-text-dim"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`flex h-8 w-8 items-center justify-center rounded-[2px] border text-xs font-medium transition active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 ${
                          currentPage === item
                            ? "border-blue-500/70 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"
                            : "border-surface-border bg-background-dark text-text-secondary hover:border-surface-border-hover"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition enabled:hover:border-surface-border-hover enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
                  title="Вперёд"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition enabled:hover:border-surface-border-hover enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
                  title="Последняя"
                >
                  »
                </button>
              </div>

              <span className="text-sm text-text-muted">
                Страница{" "}
                <span className="font-semibold text-text-primary">
                  {currentPage}
                </span>{" "}
                из{" "}
                <span className="font-semibold text-text-primary">
                  {totalPages}
                </span>
                {" · "}
                <span className="font-semibold text-text-primary">
                  {totalRecords}
                </span>{" "}
                записей
              </span>
            </div>
          )}
        </div>
      </div>

      <MethodModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        closeClick={() => setShowCreateModal(false)}
        showCloseIcon={true}
        title={"Создать устройство"}
        width={760}
      >
        <div className="space-y-4 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Название"
              required
              name="name"
              value={createForm.name}
              onChange={(event) =>
                handleChangeCreateField("name", event.target.value)
              }
              placeholder="Например, Solar Device 01"
              error={formErrors.name}
            />

            <CustomSelect
              label="Подключение"
              required
              options={connectionOptions}
              value={createForm.connectionId}
              onChange={(value) =>
                handleChangeCreateField("connectionId", value)
              }
              placeholder="Выберите connection"
              error={formErrors.connectionId}
              sortOptions={false}
            />

            <Input
              label="Описание"
              name="description"
              value={createForm.description}
              onChange={(event) =>
                handleChangeCreateField("description", event.target.value)
              }
              placeholder="Описание устройства"
            />

            <CustomSelect
              label="Статус"
              options={ENABLED_OPTIONS}
              value={createForm.enabled}
              onChange={(value) => handleChangeCreateField("enabled", value)}
              placeholder="Выберите статус"
              sortOptions={false}
            />

            <CustomSelect
              label="Тип протокола"
              required
              options={protocolTypeOptions}
              value={createForm.type}
              onChange={(value) => handleChangeCreateField("type", value)}
              placeholder="Выберите протокол"
              error={formErrors.type}
              sortOptions={false}
            />

            <Input
              label="Slave address"
              required
              name="slave_address"
              type="number"
              value={createForm.slave_address}
              onChange={(event) =>
                handleChangeCreateField("slave_address", event.target.value)
              }
              placeholder="Например, 18"
              error={formErrors.slave_address}
            />

            <CustomSelect
              label="Станция"
              options={siteOptions}
              value={createForm.siteId}
              onChange={(value) => handleChangeCreateField("siteId", value)}
              placeholder="Без станции"
              sortOptions={false}
            />

            <Input
              label="Номинальная мощность, кВт"
              name="ratedPowerKw"
              type="number"
              min="0"
              step="any"
              value={createForm.ratedPowerKw}
              onChange={(event) =>
                handleChangeCreateField("ratedPowerKw", event.target.value)
              }
              placeholder="Например, 185"
              error={formErrors.ratedPowerKw}
            />
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
              onClick={handleCreateDevice}
              disabled={isCreatingDevice}
              sx={{
                textTransform: "none",
                background: "#2563eb",
                color: "#eff6ff",
                "&:hover": { background: "#1d4ed8" },
              }}
              variant="contained"
            >
              {isCreatingDevice ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </MethodModal>

      <MethodModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        closeClick={() => setShowEditModal(false)}
        showCloseIcon={true}
        title={"Редактировать устройство"}
        width={760}
      >
        <div className="space-y-4 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Название"
              required
              name="name"
              value={editForm.name}
              onChange={(event) =>
                handleChangeEditField("name", event.target.value)
              }
              placeholder="Название устройства"
              error={editErrors.name}
            />

            <CustomSelect
              label="Подключение"
              required
              options={connectionOptions}
              value={editForm.connectionId}
              onChange={(value) => handleChangeEditField("connectionId", value)}
              placeholder="Выберите connection"
              error={editErrors.connectionId}
              sortOptions={false}
            />

            <Input
              label="Описание"
              name="description"
              value={editForm.description}
              onChange={(event) =>
                handleChangeEditField("description", event.target.value)
              }
              placeholder="Описание устройства"
            />

            <CustomSelect
              label="Статус"
              options={ENABLED_OPTIONS}
              value={editForm.enabled}
              onChange={(value) => handleChangeEditField("enabled", value)}
              placeholder="Выберите статус"
              sortOptions={false}
            />

            <CustomSelect
              label="Тип протокола"
              required
              options={protocolTypeOptions}
              value={editForm.type}
              onChange={(value) => handleChangeEditField("type", value)}
              placeholder="Выберите протокол"
              error={editErrors.type}
              sortOptions={false}
            />

            <Input
              label="Slave address"
              required
              name="slave_address"
              type="number"
              value={editForm.slave_address}
              onChange={(event) =>
                handleChangeEditField("slave_address", event.target.value)
              }
              placeholder="Например, 18"
              error={editErrors.slave_address}
            />

            <CustomSelect
              label="Станция"
              options={siteOptions}
              value={editForm.siteId}
              onChange={(value) => handleChangeEditField("siteId", value)}
              placeholder="Без станции"
              sortOptions={false}
            />

            <Input
              label="Номинальная мощность, кВт"
              name="ratedPowerKw"
              type="number"
              min="0"
              step="any"
              value={editForm.ratedPowerKw}
              onChange={(event) =>
                handleChangeEditField("ratedPowerKw", event.target.value)
              }
              placeholder="Например, 185"
              error={editErrors.ratedPowerKw}
            />
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
              onClick={handleUpdateDevice}
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

      {showViewModal && (
        <DeviceDetailsModal
          device={selectedDevice}
          connectionName={connectionNameById.get(selectedDevice?.connectionId)}
          tagCount={tagCountByDevice.get(selectedDevice?.id) || 0}
          onClose={() => setShowViewModal(false)}
        />
      )}

      <DeleteModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingDevice(null);
        }}
        deleting={handleDeleteDevice}
        title="Вы уверены, что хотите удалить устройство?"
      >
        {deletingDevice?.name
          ? `Устройство «${deletingDevice.name}» будет удалено без возможности восстановления.`
          : "Устройство будет удалено без возможности восстановления."}
        {isDeletingDevice ? " Выполняется удаление..." : ""}
      </DeleteModal>
    </DashboardLayout>
  );
};

export default Index;
