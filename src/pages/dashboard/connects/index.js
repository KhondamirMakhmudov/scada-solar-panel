import { useState } from "react";
import { get } from "lodash";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import usePostQuery from "@/hooks/all/usePostQuery";
import useDeleteQuery from "@/hooks/all/useDeleteQuery";
import { requestPython } from "@/services/api";
import { translateApiError } from "@/lib/apiErrorTranslation";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import NoData from "@/components/no-data";
import CustomTable from "@/components/table";
import MethodModal from "@/components/modal/method-modal";
import DeleteModal from "@/components/modal/delete-modal";
import Input from "@/components/input";
import CustomSelect from "@/components/select";
import ChipSelect from "@/components/chip-select";
import { Button } from "@mui/material";
import { Add, GridView, TableRows } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import ConnectionDetailsModal, {
  connectionIcon,
} from "@/features/connections/ConnectionDetailsModal";
import ConnectionParamFields from "@/features/connections/ConnectionParamFields";
import {
  connectionAddressLabel,
  connectionTimeoutMs,
} from "@/features/connections/connectionDisplay";
import {
  CONNECTION_TYPE_OPTIONS,
  DEFAULT_FORM,
  ENABLED_OPTIONS,
  PARAM_FIELDS,
  PARAM_HINTS,
  getDefaultParamsByType,
} from "@/constants/connection";

const STATIC_DRIVER_ID = "12313";

const DARK_TOAST_OPTIONS = {
  style: {
    background: "#131313",
    color: "#e5e2e1",
    border: "1px solid #2a2a2a",
    fontFamily: "'Manrope', sans-serif",
  },
};

const Index = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("table");
  const [searchValue, setSearchValue] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [deletingConnection, setDeletingConnection] = useState(null);
  const [isUpdatingConnection, setIsUpdatingConnection] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_FORM);
  const [paramsForm, setParamsForm] = useState(
    getDefaultParamsByType(DEFAULT_FORM.type),
  );
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [editParamsForm, setEditParamsForm] = useState(
    getDefaultParamsByType(DEFAULT_FORM.type),
  );
  const [formErrors, setFormErrors] = useState({});
  const [paramsErrors, setParamsErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editParamsErrors, setEditParamsErrors] = useState({});

  const { data: connects, isLoading: isLoadingConnects } = useGetQuery({
    key: KEYS.connects,
    url: URLS.connects,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Только для колонки «Устройства» в таблице ниже — реального счётчика
  // на бэкенде подключений нет, считаем на клиенте по connectionId.
  // /devices — постраничный (см. deviceDisplay.js): без явного pageSize
  // сервер отдаёт только первую страницу (обычно 20 записей), из-за чего
  // счётчик молча считал бы устройства только по первым ~20 из всех — берём
  // заведомо широкую страницу, чтобы посчитать реально все.
  const { data: devicesForCount } = useGetQuery({
    key: [KEYS.devices, "connects-count"],
    url: URLS.devices,
    params: { page: 1, pageSize: 100 },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const { mutate: createConnection, isLoading: isCreatingConnection } =
    usePostQuery({
      listKeyId: KEYS.connects,
      hideSuccessToast: true,
      hideErrorToast: true,
    });

  const { mutate: deleteConnection, isPending: isDeletingConnection } =
    useDeleteQuery({
      listKeyId: KEYS.connects,
      hideSuccessToast: true,
      hideErrorToast: true,
    });

  const connections = get(connects, "data.data", []);

  const deviceCountByConnection = new Map();
  get(devicesForCount, "data.data", []).forEach((device) => {
    const connId = device.connectionId;
    if (!connId) return;
    deviceCountByConnection.set(
      connId,
      (deviceCountByConnection.get(connId) || 0) + 1,
    );
  });

  const filteredConnections = connections.filter((item) => {
    const query = searchValue.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.name?.toLowerCase().includes(query) ||
      connectionAddressLabel(item.params).toLowerCase().includes(query);
    const matchesProtocol =
      protocolFilter === "all" || item.type === protocolFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "enabled" ? item.enabled : !item.enabled);
    return matchesSearch && matchesProtocol && matchesStatus;
  });

  const currentParamFields = PARAM_FIELDS[createForm.type] || [];
  const currentEditParamFields = PARAM_FIELDS[editForm.type] || [];

  const resetCreateForm = () => {
    setCreateForm(DEFAULT_FORM);
    setParamsForm(getDefaultParamsByType(DEFAULT_FORM.type));
    setFormErrors({});
    setParamsErrors({});
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormErrors({});
    setParamsErrors({});
  };

  const setEditDataFromConnection = (connection) => {
    const nextType = connection?.type || DEFAULT_FORM.type;
    const nextFields = PARAM_FIELDS[nextType] || [];
    const nextParams = nextFields.reduce((accumulator, field) => {
      const value = get(connection, `params.${field.name}`, "");
      accumulator[field.name] = value ?? "";
      return accumulator;
    }, {});

    setEditingConnection(connection);
    setEditForm({
      name: connection?.name || "",
      type: nextType,
      enabled: Boolean(connection?.enabled),
    });
    setEditParamsForm(nextParams);
    setEditFormErrors({});
    setEditParamsErrors({});
  };

  const handleOpenEditModal = (connection) => {
    setEditDataFromConnection(connection);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingConnection(null);
    setEditForm(DEFAULT_FORM);
    setEditParamsForm(getDefaultParamsByType(DEFAULT_FORM.type));
    setEditFormErrors({});
    setEditParamsErrors({});
  };

  const handleOpenDeleteModal = (connection) => {
    if (!connection?.id) return;
    setDeletingConnection(connection);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingConnection(null);
  };

  const handleChangeCreateForm = (event) => {
    const { name, value } = event.target;

    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleChangeType = (value) => {
    setCreateForm((prev) => ({
      ...prev,
      type: value,
    }));
    setParamsForm(getDefaultParamsByType(value));
    setFormErrors((prev) => ({
      ...prev,
      type: "",
    }));
    setParamsErrors({});
  };

  const handleChangeEnabled = (value) => {
    setCreateForm((prev) => ({
      ...prev,
      enabled: value,
    }));
  };

  const handleChangeParam = (name, value) => {
    setParamsForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setParamsErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleChangeEditForm = (event) => {
    const { name, value } = event.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setEditFormErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleChangeEditType = (value) => {
    setEditForm((prev) => ({
      ...prev,
      type: value,
    }));
    setEditParamsForm(getDefaultParamsByType(value));
    setEditFormErrors((prev) => ({
      ...prev,
      type: "",
    }));
    setEditParamsErrors({});
  };

  const handleChangeEditEnabled = (value) => {
    setEditForm((prev) => ({
      ...prev,
      enabled: value,
    }));
  };

  const handleChangeEditParam = (name, value) => {
    setEditParamsForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setEditParamsErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const getParamsPayload = () => {
    return currentParamFields.reduce((accumulator, field) => {
      const rawValue = paramsForm[field.name];

      if (field.type === "number") {
        accumulator[field.name] = Number(rawValue);
        return accumulator;
      }

      if (rawValue !== "" && rawValue !== undefined && rawValue !== null) {
        accumulator[field.name] =
          typeof rawValue === "string" ? rawValue.trim() : rawValue;
      }

      return accumulator;
    }, {});
  };

  const getEditParamsPayload = () => {
    return currentEditParamFields.reduce((accumulator, field) => {
      const rawValue = editParamsForm[field.name];

      if (field.type === "number") {
        accumulator[field.name] = Number(rawValue);
        return accumulator;
      }

      if (rawValue !== "" && rawValue !== undefined && rawValue !== null) {
        accumulator[field.name] =
          typeof rawValue === "string" ? rawValue.trim() : rawValue;
      }

      return accumulator;
    }, {});
  };

  const handleCreateConnection = () => {
    const nextErrors = {};
    const nextParamErrors = {};
    const trimmedName = createForm.name.trim();

    if (!trimmedName) {
      nextErrors.name = "Введите уникальное название подключения";
    } else if (trimmedName.length > 255) {
      nextErrors.name = "Название должно содержать не более 255 символов";
    }

    if (!createForm.type) {
      nextErrors.type = "Выберите тип подключения";
    }

    currentParamFields.forEach((field) => {
      const rawValue = paramsForm[field.name];
      const normalizedValue =
        typeof rawValue === "string" ? rawValue.trim() : rawValue;

      if (
        field.required &&
        (normalizedValue === "" ||
          normalizedValue === undefined ||
          normalizedValue === null)
      ) {
        nextParamErrors[field.name] = "Обязательное поле";
        return;
      }

      if (field.type === "number" && rawValue !== "") {
        const parsedValue = Number(rawValue);
        if (Number.isNaN(parsedValue)) {
          nextParamErrors[field.name] = "Введите корректное число";
        }
      }
    });

    if (Object.keys(nextErrors).length || Object.keys(nextParamErrors).length) {
      setFormErrors(nextErrors);
      setParamsErrors(nextParamErrors);
      return;
    }

    const builtParams = getParamsPayload();

    const payload = {
      name: trimmedName,
      type: createForm.type,
      driverId: STATIC_DRIVER_ID,
      enabled: Boolean(createForm.enabled),
      params: {
        ...builtParams,
        type: createForm.type,
      },
    };

    createConnection(
      {
        url: URLS.connects,
        attributes: payload,
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
          toast.success("Подключение успешно создано", DARK_TOAST_OPTIONS);
          handleCloseCreateModal();
          resetCreateForm();
        },
        onError: (error) => {
          toast.error(
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка при создании подключения",
            DARK_TOAST_OPTIONS,
          );
        },
      },
    );
  };

  const handleUpdateConnection = async () => {
    if (!editingConnection?.id) return;

    const nextErrors = {};
    const nextParamErrors = {};
    const trimmedName = editForm.name.trim();

    if (!trimmedName) {
      nextErrors.name = "Введите уникальное название подключения";
    } else if (trimmedName.length > 255) {
      nextErrors.name = "Название должно содержать не более 255 символов";
    }

    if (!editForm.type) {
      nextErrors.type = "Выберите тип подключения";
    }

    currentEditParamFields.forEach((field) => {
      const rawValue = editParamsForm[field.name];
      const normalizedValue =
        typeof rawValue === "string" ? rawValue.trim() : rawValue;

      if (
        field.required &&
        (normalizedValue === "" ||
          normalizedValue === undefined ||
          normalizedValue === null)
      ) {
        nextParamErrors[field.name] = "Обязательное поле";
        return;
      }

      if (field.type === "number" && rawValue !== "") {
        const parsedValue = Number(rawValue);
        if (Number.isNaN(parsedValue)) {
          nextParamErrors[field.name] = "Введите корректное число";
        }
      }
    });

    if (Object.keys(nextErrors).length || Object.keys(nextParamErrors).length) {
      setEditFormErrors(nextErrors);
      setEditParamsErrors(nextParamErrors);
      return;
    }

    const builtParams = getEditParamsPayload();
    const payload = {
      name: trimmedName,
      type: editForm.type,
      driverId: editingConnection?.driverId || STATIC_DRIVER_ID,
      enabled: Boolean(editForm.enabled),
      params: {
        ...builtParams,
        type: editForm.type,
      },
    };

    try {
      setIsUpdatingConnection(true);
      await requestPython.patch(
        `${URLS.connects}${editingConnection.id}`,
        payload,
        {
          headers: {
            ...(session?.accessToken
              ? { Authorization: `Bearer ${session.accessToken}` }
              : {}),
          },
        },
      );

      toast.success("Подключение обновлено", DARK_TOAST_OPTIONS);
      queryClient.invalidateQueries({ queryKey: [KEYS.connects] });
      handleCloseEditModal();
    } catch (error) {
      toast.error(
        translateApiError(get(error, "response.data.message")) ||
          "Ошибка обновления",
        DARK_TOAST_OPTIONS,
      );
    } finally {
      setIsUpdatingConnection(false);
    }
  };

  const handleDeleteConnection = () => {
    if (!deletingConnection?.id) return;

    deleteConnection(
      {
        url: `${URLS.connects}/${deletingConnection.id}`,
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
          toast.success("Подключение удалено", DARK_TOAST_OPTIONS);
          if (selectedConnection?.id === deletingConnection.id) {
            setSelectedConnection(null);
          }
          handleCloseDeleteModal();
        },
        onError: (error) => {
          toast.error(
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка при удалении подключения",
            DARK_TOAST_OPTIONS,
          );
        },
      },
    );
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Название",
      cell: ({ row }) => (
        <span
          style={{ font: "500 13.5px/1.3 'IBM Plex Mono'", color: "#e5e2e1" }}
        >
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Протокол",
      cell: ({ row }) => (
        <span
          style={{ font: "400 13px/1.3 'IBM Plex Mono'", color: "#bfc7d4" }}
        >
          {row.original.type}
        </span>
      ),
    },
    {
      id: "endpoint",
      header: "Адрес",
      cell: ({ row }) => (
        <span
          className="block max-w-[220px] truncate"
          style={{ font: "400 13px/1.3 'IBM Plex Mono'", color: "#7c8290" }}
          title={connectionAddressLabel(row.original.params)}
        >
          {connectionAddressLabel(row.original.params)}
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
              borderRadius: 8,
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
      id: "devices",
      header: "Устройства",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span
          className="block text-right"
          style={{ font: "400 13.5px/1.3 'IBM Plex Mono'", color: "#bfc7d4" }}
        >
          {deviceCountByConnection.get(row.original.id) || 0}
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
            onClick={() => setSelectedConnection(row.original)}
            style={{ color: "#3b82f6" }}
            className="hover:underline active:opacity-70 rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            ПРОСМОТР
          </button>
          <span style={{ color: "#3b82f6" }}> · </span>
          <button
            type="button"
            onClick={() => handleOpenEditModal(row.original)}
            style={{ color: "#3b82f6" }}
            className="hover:underline active:opacity-70 rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            ИЗМЕНИТЬ
          </button>
          <span style={{ color: "#3b82f6" }}> · </span>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(row.original)}
            style={{ color: "#3b82f6" }}
            className="hover:underline active:opacity-70 rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            УДАЛИТЬ
          </button>
        </div>
      ),
    },
  ];

  if (isLoadingConnects) {
    return (
      <DashboardLayout headerTitle={"Подключения"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Подключения"}>
      <div className="flex flex-wrap items-center gap-2 mb-2.5 font-ibmPlexSans">
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="поиск подключений…"
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
          value={protocolFilter}
          onChange={setProtocolFilter}
          label="ПРОТОКОЛ"
          options={[
            { label: "ВСЕ", value: "all" },
            ...CONNECTION_TYPE_OPTIONS.map((o) => ({
              label: o.label,
              value: o.value,
            })),
          ]}
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

        <div className="flex-1" />

        <div className="flex border border-white/15 rounded-[8px] overflow-hidden">
          <button
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-1.5 h-8 px-2.5 text-[13px] font-ibmPlexMono uppercase tracking-wide transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-inset ${
              activeTab === "table"
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
            }`}
          >
            <TableRows sx={{ fontSize: 14 }} />
            Таблица
          </button>
          <button
            onClick={() => setActiveTab("card")}
            className={`flex items-center gap-1.5 h-8 px-2.5 text-[13px] font-ibmPlexMono uppercase tracking-wide border-l border-white/15 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-inset ${
              activeTab === "card"
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "text-text-muted hover:text-text-secondary hover:bg-white/[0.04]"
            }`}
          >
            <GridView sx={{ fontSize: 14 }} />
            Карточки
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="h-9 px-4 rounded-[8px] border border-primary text-primary text-[13px] font-ibmPlexMono font-semibold hover:bg-primary hover:text-white active:scale-[0.96] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background-dark"
        >
          + ПОДКЛЮЧЕНИЕ
        </button>
      </div>

      {!filteredConnections.length ? (
        <NoData
          title="Подключения не найдены"
          description="Пока нет SCADA-подключений. Добавьте подключение, чтобы начать мониторинг."
        />
      ) : (
        <>
          {activeTab === "table" && (
            <div className="rounded-[8px] border border-white/[0.08] bg-surface-dark">
              <CustomTable columns={columns} data={filteredConnections} />
            </div>
          )}

          {activeTab === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 font-ibmPlexSans">
              {filteredConnections.map((connection) => {
                const ProtocolIcon = connectionIcon(connection.type);
                return (
                  <div
                    key={connection.id}
                    className="rounded-[8px] bg-surface-dark border border-white/[0.08] p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <span className="font-ibmPlexMono text-[14.5px] font-semibold text-text-primary">
                        {connection.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-[8px] border text-[12px] font-semibold uppercase tracking-wide ${
                          connection.enabled
                            ? "border-status-ok text-status-ok"
                            : "border-status-fault text-status-fault"
                        }`}
                      >
                        {connection.enabled ? "ВКЛЮЧЕНО" : "ОТКЛЮЧЕНО"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-7 h-7 rounded-[8px] bg-background-dark border border-surface-border flex items-center justify-center text-primary">
                        <ProtocolIcon sx={{ fontSize: 15 }} />
                      </span>
                      <span className="text-[13px] font-ibmPlexMono text-text-secondary">
                        {connection.type}
                      </span>
                    </div>

                    <div className="space-y-1 text-[13px] font-ibmPlexMono text-text-muted">
                      <p className="truncate">
                        Адрес:{" "}
                        <span
                          className="text-text-primary"
                          title={connectionAddressLabel(connection.params)}
                        >
                          {connectionAddressLabel(connection.params)}
                        </span>
                      </p>
                      {connectionTimeoutMs(connection.params) !== null && (
                        <p>
                          Таймаут:{" "}
                          <span className="text-text-primary">
                            {connectionTimeoutMs(connection.params)} ms
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-surface-border flex justify-end gap-1.5 font-ibmPlexMono text-[12.5px] font-medium">
                      <button
                        type="button"
                        onClick={() => setSelectedConnection(connection)}
                        className="text-primary hover:underline active:opacity-70 rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                      >
                        ПРОСМОТР
                      </button>
                      <span className="text-text-faint">·</span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(connection)}
                        className="text-primary hover:underline active:opacity-70 rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                      >
                        ИЗМЕНИТЬ
                      </button>
                      <span className="text-text-faint">·</span>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(connection)}
                        className="text-status-fault hover:underline active:opacity-70 rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/60"
                      >
                        УДАЛИТЬ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <MethodModal
        open={showCreateModal}
        onClose={handleCloseCreateModal}
        closeClick={handleCloseCreateModal}
        showCloseIcon={true}
        title={"Создать подключение"}
        width={780}
      >
        <div className="space-y-4 font-ibmPlexSans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Название"
              required
              name="name"
              placeholder="Например, Main Modbus TCP"
              value={createForm.name}
              onChange={handleChangeCreateForm}
              error={formErrors.name}
            />

            <CustomSelect
              label="Тип подключения"
              required
              options={CONNECTION_TYPE_OPTIONS}
              value={createForm.type}
              onChange={handleChangeType}
              placeholder="Выберите тип подключения"
              error={formErrors.type}
              sortOptions={false}
            />

            <CustomSelect
              label="Статус"
              options={ENABLED_OPTIONS}
              value={createForm.enabled}
              onChange={handleChangeEnabled}
              placeholder="Выберите статус"
              sortOptions={false}
            />
          </div>

          <div className="rounded-[8px] border border-white/[0.08] bg-[#18181c] p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <p className="text-white font-semibold">
                  Параметры подключения
                </p>
              </div>

              <Button
                variant="outlined"
                onClick={() => {
                  setParamsForm(getDefaultParamsByType(createForm.type));
                  setParamsErrors({});
                }}
                sx={{
                  textTransform: "none",
                  color: "#bfdbfe",
                  borderColor: "#426080",
                  background: "#1b2633",
                  borderRadius: "8px",
                  fontWeight: 600,
                  py: 0.9,
                  px: 2,
                  "&:hover": {
                    background: "#223246",
                    borderColor: "#5a82b0",
                  },
                }}
                startIcon={<Add fontSize="small" />}
              >
                Сбросить шаблон
              </Button>
            </div>

            <p className="text-xs text-text-muted mb-3">
              {PARAM_HINTS[createForm.type]}
            </p>

            <ConnectionParamFields
              fields={currentParamFields}
              values={paramsForm}
              errors={paramsErrors}
              onChange={handleChangeParam}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 ">
            <Button
              onClick={handleCloseCreateModal}
              variant="outlined"
              sx={{
                textTransform: "none",
                color: "#bfc7d4",
                borderColor: "rgba(255,255,255,0.15)",
                borderRadius: "8px",
                fontWeight: 600,
                fontFamily: "'Manrope', sans-serif",
                py: 1.1,
                px: 3,
                "&:hover": {
                  borderColor: "#3b82f6",
                  background: "rgba(59,130,246,0.08)",
                },
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateConnection}
              variant="contained"
              disabled={isCreatingConnection}
              sx={{
                textTransform: "none",
                background: "#2563eb",
                color: "#eff6ff",
                borderRadius: "8px",
                fontWeight: 600,
                fontFamily: "'Manrope', sans-serif",
                py: 1.1,
                px: 3,
                "&:hover": {
                  background: "#1d4ed8",
                },
                "&.Mui-disabled": {
                  background: "#2a2a2a",
                  color: "#7c8290",
                },
              }}
            >
              {isCreatingConnection ? "Создание..." : "Создать подключение"}
            </Button>
          </div>
        </div>
      </MethodModal>

      <MethodModal
        open={showEditModal}
        onClose={handleCloseEditModal}
        closeClick={handleCloseEditModal}
        showCloseIcon={true}
        title={"Изменить подключение"}
        width={780}
      >
        <div className="space-y-4 font-ibmPlexSans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Название"
              required
              name="name"
              placeholder="Например, Main Modbus TCP"
              value={editForm.name}
              onChange={handleChangeEditForm}
              error={editFormErrors.name}
            />

            <CustomSelect
              label="Тип подключения"
              required
              options={CONNECTION_TYPE_OPTIONS}
              value={editForm.type}
              onChange={handleChangeEditType}
              placeholder="Выберите тип подключения"
              error={editFormErrors.type}
              sortOptions={false}
            />

            <CustomSelect
              label="Статус"
              options={ENABLED_OPTIONS}
              value={editForm.enabled}
              onChange={handleChangeEditEnabled}
              placeholder="Выберите статус"
              sortOptions={false}
            />
          </div>

          <div className="rounded-[8px] border border-white/[0.08] bg-[#18181c] p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <p className="text-white font-semibold">
                  Параметры подключения
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Верхнеуровневый тип будет автоматически добавлен в
                  <span className="text-text-primary"> params.type</span> при
                  отправке.
                </p>
              </div>

              <Button
                variant="outlined"
                onClick={() => {
                  setEditParamsForm(getDefaultParamsByType(editForm.type));
                  setEditParamsErrors({});
                }}
                sx={{
                  textTransform: "none",
                  color: "#bfdbfe",
                  borderColor: "#426080",
                  background: "#1b2633",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontFamily: "'Manrope', sans-serif",
                  py: 0.9,
                  px: 2,
                  "&:hover": {
                    background: "#223246",
                    borderColor: "#5a82b0",
                  },
                }}
                startIcon={<Add fontSize="small" />}
              >
                Сбросить шаблон
              </Button>
            </div>

            <p className="text-xs text-text-muted mb-3">
              {PARAM_HINTS[editForm.type]}
            </p>

            <ConnectionParamFields
              fields={currentEditParamFields}
              values={editParamsForm}
              errors={editParamsErrors}
              onChange={handleChangeEditParam}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={handleCloseEditModal}
              variant="outlined"
              sx={{
                textTransform: "none",
                color: "#bfc7d4",
                borderColor: "rgba(255,255,255,0.15)",
                borderRadius: "8px",
                fontWeight: 600,
                py: 1.1,
                px: 3,
                "&:hover": {
                  borderColor: "#3b82f6",
                  background: "rgba(59,130,246,0.08)",
                },
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateConnection}
              variant="contained"
              disabled={isUpdatingConnection}
              sx={{
                textTransform: "none",
                background: "#d97706",
                color: "#fffbeb",
                borderRadius: "8px",
                fontWeight: 600,
                py: 1.1,
                px: 3,
                "&:hover": {
                  background: "#b45309",
                },
                "&.Mui-disabled": {
                  background: "#2a2a2a",
                  color: "#7c8290",
                },
              }}
            >
              {isUpdatingConnection ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </MethodModal>

      {showDeleteModal && (
        <DeleteModal
          open={showDeleteModal}
          onClose={handleCloseDeleteModal}
          deleting={handleDeleteConnection}
          title="Удалить подключение"
        >
          Вы уверены, что хотите удалить подключение
          <span className="text-white font-semibold">
            {" "}
            {deletingConnection?.name}
          </span>
          ?
          {isDeletingConnection && (
            <span className="block text-xs text-text-muted mt-2">
              Удаление...
            </span>
          )}
        </DeleteModal>
      )}

      <ConnectionDetailsModal
        connection={selectedConnection}
        onClose={() => setSelectedConnection(null)}
      />
    </DashboardLayout>
  );
};

export default Index;
