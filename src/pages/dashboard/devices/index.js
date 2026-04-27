import { useMemo, useState } from "react";
import { get } from "lodash";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
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
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { requestPython } from "@/services/api";
import {
  Add,
  DevicesOther,
  Lan,
  Search,
  TableRows,
  ViewModule,
} from "@mui/icons-material";
import { Button } from "@mui/material";

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
};

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
  const slaveAddress = get(device, "params.slave_address", "—");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-[0_0_30px_rgba(15,23,42,0.55)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {device.name}
          </h3>
          <p className="mt-1 text-xs text-slate-400">ID: {device.id}</p>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${getStatusStyles(device.enabled)}`}
        >
          {device.enabled ? "Включено" : "Отключено"}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2">
          <span className="text-slate-400">Протокол</span>
          <span className="font-medium text-blue-300">{protocol}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2">
          <span className="text-slate-400">Slave address</span>
          <span className="font-medium text-slate-100">{slaveAddress}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2">
          <span className="text-slate-400">Connection ID</span>
          <span
            className="max-w-[170px] truncate font-medium text-cyan-300"
            title={device.connectionId}
          >
            {device.connectionId || "—"}
          </span>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Обновлено:{" "}
        <span className="text-slate-300">{formatDate(device.updatedAt)}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/60">
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

  const {
    data: devices,
    isLoading: isLoadingDevices,
    isFetching: isFetchingDevices,
  } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
  });

  const { data: connects } = useGetQuery({
    key: KEYS.connects,
    url: URLS.connects,
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
  const total = get(devices, "data.pagination.total", list.length);
  const connections = get(connects, "data.data", []);

  const protocolOptions = useMemo(() => {
    const unique = Array.from(
      new Set(list.map((item) => get(item, "params.type", "")).filter(Boolean)),
    );

    return [{ label: "Все протоколы", value: "all" }].concat(
      unique.map((value) => ({ label: value, value })),
    );
  }, [list]);

  const protocolTypeOptions = useMemo(() => {
    const dynamicOptions = Array.from(
      new Set(list.map((item) => get(item, "params.type", "")).filter(Boolean)),
    ).map((value) => ({ label: value, value }));

    const merged = [...PROTOCOL_BASE_OPTIONS, ...dynamicOptions];
    const deduplicated = Array.from(
      new Map(merged.map((option) => [option.value, option])).values(),
    );

    return deduplicated;
  }, [list]);

  const connectionOptions = useMemo(
    () =>
      connections.map((item) => ({
        label: `${item.name || "Connection"} (${item.id?.slice(0, 8) || "—"})`,
        value: item.id,
      })),
    [connections],
  );

  const toForm = (device) => ({
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

    return errors;
  };

  const buildPayload = (form) => ({
    name: form.name.trim(),
    description: form.description?.trim() || "",
    connectionId: form.connectionId,
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
            get(
              error,
              "response.data.message",
              "Ошибка при создании устройства",
            ),
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
        get(error, "response.data.message", "Ошибка при обновлении устройства"),
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
            get(
              error,
              "response.data.message",
              "Ошибка при удалении устройства",
            ),
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

  const filteredDevices = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return list.filter((item) => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.id?.toLowerCase().includes(query) ||
        item.connectionId?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" ? item.enabled : !item.enabled);

      const currentType = get(item, "params.type", "");
      const matchesProtocol =
        protocolFilter === "all" || currentType === protocolFilter;

      return matchesSearch && matchesStatus && matchesProtocol;
    });
  }, [list, searchValue, statusFilter, protocolFilter]);

  const stats = useMemo(() => {
    const enabledCount = list.filter((item) => item.enabled).length;
    const disabledCount = list.length - enabledCount;
    const protocolsCount = new Set(
      list.map((item) => get(item, "params.type", "")).filter(Boolean),
    ).size;
    const linkedConnectionsCount = new Set(
      list.map((item) => item.connectionId).filter(Boolean),
    ).size;

    return {
      enabledCount,
      disabledCount,
      protocolsCount,
      linkedConnectionsCount,
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
      header: "Устройство",
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
      accessorKey: "connectionId",
      header: "Connection",
      cell: ({ row }) => (
        <span
          className="inline-flex max-w-[240px] truncate rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200"
          title={row.original.connectionId}
        >
          {row.original.connectionId || "—"}
        </span>
      ),
    },
    {
      id: "protocol",
      header: "Протокол",
      cell: ({ row }) => (
        <span className="inline-flex rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300">
          {get(row.original, "params.type", "—")}
        </span>
      ),
    },
    {
      id: "slaveAddress",
      header: "Slave",
      cell: ({ row }) => (
        <span className="text-sm text-slate-200">
          {get(row.original, "params.slave_address", "—")}
        </span>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Статус",
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${getStatusStyles(row.original.enabled)}`}
        >
          {row.original.enabled ? "Включено" : "Отключено"}
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
            tooltip="Детали устройства"
          />
          <EditButton
            onClick={() => openEditModal(row.original)}
            tooltip="Изменить устройство"
          />
          <DeleteButton
            onClick={() => openDeleteModal(row.original)}
            tooltip="Удалить устройство"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  if (isLoadingDevices || isFetchingDevices) {
    return (
      <DashboardLayout headerTitle={"Устройства"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Устройства"}>
      <div className="font-manrope py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-800 p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                <Lan fontSize="small" />
                SCADA / Connects / Devices
              </p>
              <h2 className="text-2xl font-semibold text-slate-100">
                Управление устройствами
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Страница для мониторинга и визуальной навигации по устройствам,
                связанным с подключениями.
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
              Добавить устройство
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Всего устройств</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">
              {total}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">Включено</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">
              {stats.enabledCount}
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4">
            <p className="text-sm text-rose-300">Отключено</p>
            <p className="mt-1 text-2xl font-semibold text-rose-200">
              {stats.disabledCount}
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-300">Протоколы / Connects</p>
            <p className="mt-1 text-2xl font-semibold text-blue-200">
              {stats.protocolsCount} / {stats.linkedConnectionsCount}
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
                  placeholder="Поиск по имени, ID, description или connectionId"
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

              <div className="w-full md:w-[260px]">
                <CustomSelect
                  value={protocolFilter}
                  onChange={(value) => setProtocolFilter(value)}
                  options={protocolOptions}
                  placeholder="Протокол"
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
              <DevicesOther fontSize="small" />
              Найдено устройств:{" "}
              <span className="font-semibold text-slate-200">
                {filteredDevices.length}
              </span>
            </span>
          </div>

          {filteredDevices.length === 0 ? (
            <NoData
              title="Устройства не найдены"
              description="Попробуйте изменить параметры фильтрации или добавьте новое устройство."
            />
          ) : viewMode === "table" ? (
            <CustomTable columns={columns} data={filteredDevices} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredDevices.map((item) => (
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

      <MethodModal
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        closeClick={() => setShowViewModal(false)}
        showCloseIcon={true}
        title={"Детали устройства"}
        width={640}
      >
        <div className="space-y-3 font-mono text-sm">
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Название</p>
            <p className="text-slate-100 font-semibold">
              {selectedDevice?.name || "—"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Описание</p>
            <p className="text-slate-100">
              {selectedDevice?.description || "—"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Connection ID</p>
              <p className="text-cyan-200 break-all">
                {selectedDevice?.connectionId || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Статус</p>
              <p className="text-slate-100">
                {selectedDevice?.enabled ? "Включено" : "Отключено"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Тип протокола</p>
              <p className="text-blue-200">
                {get(selectedDevice, "params.type", "—")}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Slave address</p>
              <p className="text-slate-100">
                {get(selectedDevice, "params.slave_address", "—")}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">ID</p>
            <p className="text-slate-100 break-all">
              {selectedDevice?.id || "—"}
            </p>
          </div>
        </div>
      </MethodModal>

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
