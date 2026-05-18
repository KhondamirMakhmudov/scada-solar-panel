import { useEffect, useMemo, useState } from "react";
import { get } from "lodash";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Add,
  ElectricBolt,
  Memory,
  Search,
  TableRows,
  ViewModule,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import NoData from "@/components/no-data";
import CustomTable from "@/components/table";
import CustomSelect from "@/components/select";
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
import { requestPython } from "@/services/api";

const STATUS_OPTIONS = [
  { label: "Все статусы", value: "all" },
  { label: "Включено", value: "enabled" },
  { label: "Отключено", value: "disabled" },
];

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

const VIEW_MODE_OPTIONS = [
  { label: "Таблица", value: "table", icon: TableRows },
  { label: "Карточки", value: "grid", icon: ViewModule },
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

const getEnabledStyles = (enabled) => {
  if (enabled) {
    return "bg-blue-500/15 text-blue-300 border border-blue-400/30";
  }
  return "bg-slate-500/20 text-slate-300 border border-slate-400/30";
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

const TagCard = ({ item, onView, onEdit, onDelete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-[0_0_30px_rgba(15,23,42,0.45)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-100">{item.name}</p>
          <p className="text-xs text-slate-400 mt-1">
            Идентификатор: {item.id}
          </p>
        </div>
        <span className="rounded-md px-2.5 py-1 text-xs border border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
          {item.dataType}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/70 px-3 py-2">
          <span className="text-slate-400">Адрес / Количество</span>
          <span className="font-semibold text-blue-300">
            {item.address} / {item.count}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/70 px-3 py-2">
          <span className="text-slate-400">Протокол</span>
          <span className="text-slate-200">{item.protocolType}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/70 px-3 py-2">
          <span className="text-slate-400">Тип регистра</span>
          <span
            className="max-w-[180px] truncate text-emerald-300"
            title={item.registerType}
          >
            {item.registerType}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/70 px-3 py-2">
          <span className="text-slate-400">Устройство</span>
          <span
            className="max-w-[180px] truncate text-cyan-300"
            title={item.deviceName}
          >
            {item.deviceName}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span
          className={`rounded-md px-2 py-1 ${getEnabledStyles(item.enabled)}`}
        >
          {item.enabled ? "Включено" : "Отключено"}
        </span>
        <span className="text-slate-500">{item.scanRateMs} ms</span>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/60">
        <ActionButtonGroup>
          <EyeButton onClick={onView} tooltip="Детали тега" />
          <EditButton onClick={onEdit} tooltip="Изменить тег" />
          <DeleteButton onClick={onDelete} tooltip="Удалить тег" />
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
  const [dataTypeFilter, setDataTypeFilter] = useState("all");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const {
    data: tags,
    isLoading: isLoadingTags,
    isFetching: isFetchingTags,
  } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
  });

  const { data: devices } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
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

  const protocolFilterOptions = useMemo(() => {
    const dynamic = Array.from(
      new Set(list.map((item) => item.protocolType).filter(Boolean)),
    ).map((value) => ({ label: value, value }));

    return [{ label: "Все протоколы", value: "all" }].concat(dynamic);
  }, [list]);

  const dataTypeFilterOptions = useMemo(() => {
    const dynamic = Array.from(
      new Set(list.map((item) => item.dataType).filter(Boolean)),
    ).map((value) => ({ label: value, value }));

    return [{ label: "Все типы", value: "all" }].concat(dynamic);
  }, [list]);

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
            get(error, "response.data.message", "Ошибка создания тега"),
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
        get(error, "response.data.message", "Ошибка обновления тега"),
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
            get(error, "response.data.message", "Ошибка удаления тега"),
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

  const filteredList = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return list.filter((item) => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.id?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        String(item.registerType || "")
          .toLowerCase()
          .includes(query) ||
        String(item.deviceName || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" ? item.enabled : !item.enabled);

      const matchesDataType =
        dataTypeFilter === "all" || item.dataType === dataTypeFilter;

      const matchesProtocol =
        protocolFilter === "all" || item.protocolType === protocolFilter;

      return (
        matchesSearch && matchesStatus && matchesDataType && matchesProtocol
      );
    });
  }, [list, searchValue, statusFilter, dataTypeFilter, protocolFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, statusFilter, dataTypeFilter, protocolFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const stats = useMemo(() => {
    const enabled = list.filter((item) => item.enabled).length;
    const disabled = list.length - enabled;
    const modbusTcp = list.filter(
      (item) => item.protocolType === "MODBUS_TCP",
    ).length;
    const modbusRtuOverTcp = list.filter(
      (item) => item.protocolType === "MODBUS_RTU_OVER_TCP",
    ).length;

    return {
      enabled,
      disabled,
      modbusTcp,
      modbusRtuOverTcp,
    };
  }, [list]);

  const columns = [
    {
      header: "№",
      cell: ({ row }) => (
        <span className="font-medium text-slate-300">{row.index + 1}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Тег",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-100">{row.original.name}</p>
          <p className="text-xs text-slate-400">
            {row.original.description || "Без описания"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "dataType",
      header: "Тип данных",
      cell: ({ row }) => (
        <span className="text-blue-300 font-semibold">
          {row.original.dataType}
        </span>
      ),
    },
    {
      accessorKey: "protocolType",
      header: "Протокол",
      cell: ({ row }) => (
        <span className="text-slate-200">{row.original.protocolType}</span>
      ),
    },
    {
      accessorKey: "registerType",
      header: "Регистр",
      cell: ({ row }) => (
        <span className="inline-flex rounded-md px-2.5 py-1 text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          {row.original.registerType}
        </span>
      ),
    },
    {
      accessorKey: "address",
      header: "Адрес",
      cell: ({ row }) => (
        <span className="text-slate-200">{row.original.address}</span>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Статус",
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs ${getEnabledStyles(row.original.enabled)}`}
        >
          {row.original.enabled ? "Включено" : "Отключено"}
        </span>
      ),
    },
    {
      accessorKey: "scanRateMs",
      header: "Интервал опроса",
      cell: ({ row }) => (
        <span className="text-slate-300">{row.original.scanRateMs} ms</span>
      ),
    },
    {
      accessorKey: "deviceName",
      header: "Устройство",
      cell: ({ row }) => (
        <span
          className="inline-flex max-w-[220px] truncate text-cyan-300"
          title={row.original.deviceName}
        >
          {row.original.deviceName}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Обновлено",
      cell: ({ row }) => (
        <span className="text-xs text-slate-300">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <ActionButtonGroup>
          <EyeButton
            onClick={() => openViewModal(row.original)}
            tooltip="Детали тега"
          />
          <EditButton
            onClick={() => openEditModal(row.original)}
            tooltip="Изменить тег"
          />
          <DeleteButton
            onClick={() => openDeleteModal(row.original)}
            tooltip="Удалить тег"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  if (isLoadingTags || isFetchingTags) {
    return (
      <DashboardLayout headerTitle={"Теги"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Теги"}>
      <div className="font-manrope py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-800 p-6"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                <Memory fontSize="small" />
                SCADA / Теги
              </p>
              <h2 className="text-2xl font-semibold text-slate-100 mt-2">
                Мониторинг тегов
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Базовая SCADA-витрина для просмотра тегов Modbus: типы данных,
                адреса, регистры, частота опроса и связь с устройствами.
              </p>
            </div>

            <Button
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              startIcon={<Add />}
              sx={{
                height: "44px",
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 700,
                color: "#00111f",
                background: "linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)",
                "&:hover": {
                  opacity: 0.9,
                },
              }}
            >
              Добавить тег
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Всего тегов</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">
              {total}
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-300">Включено</p>
            <p className="mt-1 text-2xl font-semibold text-blue-200">
              {stats.enabled}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">MODBUS_TCP</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">
              {stats.modbusTcp}
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4">
            <p className="text-sm text-rose-300">MODBUS_RTU_OVER_TCP</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">
              {stats.modbusRtuOverTcp}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 md:flex-row">
              <div className="relative w-full md:max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  fontSize="small"
                />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Поиск по имени, идентификатору, описанию, устройству"
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="w-full md:w-[220px]">
                <CustomSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  options={STATUS_OPTIONS}
                  placeholder="Статус"
                  sortOptions={false}
                />
              </div>

              <div className="w-full md:w-[220px]">
                <CustomSelect
                  value={dataTypeFilter}
                  onChange={(value) => setDataTypeFilter(value)}
                  options={dataTypeFilterOptions}
                  placeholder="Тип данных"
                  sortOptions={false}
                />
              </div>

              <div className="w-full md:w-[240px]">
                <CustomSelect
                  value={protocolFilter}
                  onChange={(value) => setProtocolFilter(value)}
                  options={protocolFilterOptions}
                  placeholder="Протокол"
                  sortOptions={false}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {VIEW_MODE_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isActive = viewMode === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setViewMode(item.value)}
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition ${
                      isActive
                        ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <Icon fontSize="small" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
            <span className="inline-flex items-center gap-2">
              <ElectricBolt fontSize="small" />
              Найдено тегов:{" "}
              <span className="font-semibold text-slate-200">
                {filteredList.length}
              </span>
            </span>
          </div>

          {filteredList.length === 0 ? (
            <NoData
              title="Теги не найдены"
              description="Измените фильтры или добавьте новый тег."
            />
          ) : viewMode === "table" ? (
            <CustomTable columns={columns} data={paginatedList} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {paginatedList.map((item) => (
                <TagCard
                  key={item.id}
                  item={item}
                  onView={() => openViewModal(item)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => openDeleteModal(item)}
                />
              ))}
            </div>
          )}

          {filteredList.length > 0 && (
            <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-700/60 pt-4 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Строк на странице:</span>
                {[10, 20, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`h-8 w-10 rounded-md border text-xs font-medium transition ${
                      pageSize === size
                        ? "border-blue-500/70 bg-blue-500/20 text-blue-200"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
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
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Первая"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="flex h-8 w-8 items-center justify-center text-slate-500"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition ${
                          currentPage === item
                            ? "border-blue-500/70 bg-blue-500/20 text-blue-200"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
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
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Вперёд"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Последняя"
                >
                  »
                </button>
              </div>

              <span className="text-sm text-slate-400">
                Страница{" "}
                <span className="font-semibold text-slate-200">
                  {currentPage}
                </span>{" "}
                из{" "}
                <span className="font-semibold text-slate-200">
                  {totalPages}
                </span>
                {" · "}
                <span className="font-semibold text-slate-200">
                  {filteredList.length}
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

          <div className="rounded-xl border border-slate-700 p-3 bg-slate-900/50">
            <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">
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
                color: "#cbd5e1",
                borderColor: "#475569",
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

          <div className="rounded-xl border border-slate-700 p-3 bg-slate-900/50">
            <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">
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
                color: "#cbd5e1",
                borderColor: "#475569",
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
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Имя</p>
            <p className="text-slate-100 font-semibold">
              {selectedTag?.name || "—"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Описание</p>
            <p className="text-slate-100">{selectedTag?.description || "—"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Тип данных</p>
              <p className="text-cyan-200">{selectedTag?.dataType || "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Интервал опроса</p>
              <p className="text-slate-100">
                {selectedTag?.scanRateMs || "—"} ms
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Масштаб / Смещение / Deadband</p>
              <p className="text-slate-100">
                {selectedTag?.scale} / {selectedTag?.offset} /{" "}
                {selectedTag?.deadband}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Статус</p>
              <p className="text-slate-100">
                {selectedTag?.enabled ? "Включено" : "Отключено"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Протокол / Регистр</p>
              <p className="text-slate-100">
                {selectedTag?.protocolType} / {selectedTag?.registerType}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Адрес / Количество</p>
              <p className="text-slate-100">
                {selectedTag?.address} / {selectedTag?.count}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Порядок байтов / Порядок слов</p>
              <p className="text-slate-100">
                {selectedTag?.byteOrder} / {selectedTag?.wordOrder}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Устройство</p>
              <p className="text-cyan-200 break-all">
                {selectedTag?.deviceName || "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Идентификатор</p>
            <p className="text-slate-100 break-all">{selectedTag?.id || "—"}</p>
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
