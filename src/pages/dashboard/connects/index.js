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
import { Button } from "@mui/material";
import {
  Add,
  GridView,
  TableRows,
  VisibilityOutlined,
  EditOutlined,
  DeleteOutline,
  Lan,
  Usb,
  ElectricBoltOutlined,
  Schedule,
} from "@mui/icons-material";
import { ActionButtonGroup, EyeButton, EditButton, DeleteButton } from "@/components/button";
import { toast } from "react-hot-toast";
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
    background: "#0f172a",
    color: "#e2e8f0",
    border: "1px solid #334155",
    fontFamily: "'Manrope', sans-serif",
  },
};

const Index = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("table");
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
  const total = get(connects, "data.pagination.total", connections.length);
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
        translateApiError(get(error, "response.data.message")) || "Ошибка обновления",
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
      header: "№",
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: "name",
      header: "Название",
      cell: ({ row }) => (
        <div className="font-semibold text-white">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Тип",
      cell: ({ row }) => (
        <span className="inline-flex px-2 py-1 rounded-md text-xs border border-primary/60 bg-primary/20 text-blue-200">
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Статус",
      cell: ({ row }) => (
        <span
          className={`inline-flex px-2 py-1 rounded-md text-xs border ${
            row.original.enabled
              ? "border-green-500 bg-green-500/20 text-green-300"
              : "border-slate-500 bg-slate-500/20 text-slate-300"
          }`}
        >
          {row.original.enabled ? "Включен" : "Отключен"}
        </span>
      ),
    },
    {
      accessorKey: "params.host",
      header: "Хост",
      cell: ({ row }) => get(row.original, "params.host", "-") || "-",
    },
    {
      accessorKey: "params.port",
      header: "Порт",
      cell: ({ row }) => get(row.original, "params.port", "-") || "-",
    },
    {
      accessorKey: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <ActionButtonGroup>
          <EyeButton
            onClick={() => setSelectedConnection(row.original)}
            tooltip="Показать детали"
          />
          <EditButton
            onClick={() => handleOpenEditModal(row.original)}
            tooltip="Изменить подключение"
          />
          <DeleteButton
            onClick={() => handleOpenDeleteModal(row.original)}
            tooltip="Удалить подключение"
          />
        </ActionButtonGroup>
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
      <div className="flex items-center justify-between my-[15px] gap-3 flex-wrap font-manrope">
        <div>
          <h2 className="text-lg font-semibold">Обзор подключений</h2>
          <p className="text-sm text-slate-400">
            Всего подключений:{" "}
            <span className="text-white font-medium">{total}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleOpenCreateModal}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)",
              color: "#00111f",
              borderRadius: "10px",
              height: "44px",
              px: 2,
              "&:hover": { opacity: 0.9 },
            }}
          >
            Создать подключение
          </Button>

          <div className="relative flex items-center bg-[#1f2a37] border border-[#304156] p-[6px] rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab("table")}
              className={`z-10 flex items-center justify-center w-12 h-10 rounded-xl transition-all ${
                activeTab === "table"
                  ? "text-white bg-primary/25 border border-primary/50 rounded-xl"
                  : "text-white/60 hover:text-white/80"
              }`}
              title="Табличный вид"
            >
              <TableRows fontSize="small" />
            </button>

            <button
              onClick={() => setActiveTab("card")}
              className={`z-10 flex items-center justify-center w-12 h-10 rounded-xl transition-all ${
                activeTab === "card"
                  ? "text-white bg-primary/25 border border-primary/50 rounded-xl"
                  : "text-white/60 hover:text-white/80"
              }`}
              title="Карточный вид"
            >
              <GridView fontSize="small" />
            </button>
          </div>
        </div>
      </div>

      {!connections.length ? (
        <NoData
          title="Подключения не найдены"
          description="Пока нет SCADA-подключений. Добавьте подключение, чтобы начать мониторинг."
        />
      ) : (
        <>
          {activeTab === "table" && (
            <CustomTable columns={columns} data={connections} />
          )}

          {activeTab === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 font-manrope">
              {connections.map((connection) => {
                const isTcp = connection?.type?.includes("TCP");
                return (
                  <div
                    key={connection.id}
                    className="rounded-2xl bg-[#171b22] border border-[#2d3848] p-4 shadow-sm hover:shadow-lg hover:border-[#3f5f84] transition-all duration-200"
                  >
                    <div className="h-1 w-full rounded-full bg-primary/50 mb-4" />

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-semibold tracking-wide">
                          {connection.name}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 rounded-md text-xs border ${
                          connection.enabled
                            ? "border-green-500 bg-green-500/20 text-green-300"
                            : "border-slate-500 bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {connection.enabled ? "Включен" : "Отключен"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-8 h-8 rounded-lg bg-[#253347] border border-[#334c68] flex items-center justify-center text-[#9EC5FF]">
                        {isTcp ? (
                          <Lan fontSize="small" />
                        ) : (
                          <Usb fontSize="small" />
                        )}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-md bg-primary/20 text-blue-200 border border-primary/60">
                        {connection.type}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-md bg-slate-700/40 text-slate-200 border border-slate-600">
                        ID: {connection.id?.slice(0, 8)}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-slate-300">
                      <p>
                        Хост:{" "}
                        <span className="text-white">
                          {get(connection, "params.host", "-")}
                        </span>
                      </p>
                      <p>
                        Порт:{" "}
                        <span className="text-white">
                          {get(connection, "params.port", "-")}
                        </span>
                      </p>
                      <p>
                        Таймаут:{" "}
                        <span className="text-white">
                          {get(connection, "params.timeout_ms", "-")} ms
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        onClick={() => setSelectedConnection(connection)}
                        sx={{
                          textTransform: "none",
                          color: "#bfdbfe",
                          borderColor: "#426080",
                          background: "#1b2633",
                          "&:hover": {
                            background: "#223246",
                            borderColor: "#5a82b0",
                          },
                        }}
                        variant="outlined"
                        startIcon={<VisibilityOutlined fontSize="small" />}
                      >
                        Показать детали
                      </Button>
                      <Button
                        onClick={() => handleOpenEditModal(connection)}
                        sx={{
                          textTransform: "none",
                          color: "#fdba74",
                          borderColor: "#7a5a2c",
                          background: "#2f2418",
                          "&:hover": {
                            background: "#3b2d1e",
                            borderColor: "#9a6d30",
                          },
                        }}
                        variant="outlined"
                        startIcon={<EditOutlined fontSize="small" />}
                      >
                        Изменить
                      </Button>
                      <Button
                        onClick={() => handleOpenDeleteModal(connection)}
                        sx={{
                          textTransform: "none",
                          color: "#fca5a5",
                          borderColor: "#7f1d1d",
                          background: "#2a1717",
                          "&:hover": {
                            background: "#351b1b",
                            borderColor: "#991b1b",
                          },
                        }}
                        variant="outlined"
                        startIcon={<DeleteOutline fontSize="small" />}
                      >
                        Удалить
                      </Button>
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
        <div className="space-y-4 font-manrope">
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

          <div className="rounded-xl border border-[#334155] bg-[#111827] p-4">
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

            <p className="text-xs text-slate-400 mb-3">
              {PARAM_HINTS[createForm.type]}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentParamFields.map((field) => {
                if (field.type === "select") {
                  return (
                    <CustomSelect
                      key={field.name}
                      label={field.label}
                      required={field.required}
                      options={field.options || []}
                      value={paramsForm[field.name]}
                      onChange={(value) => handleChangeParam(field.name, value)}
                      placeholder={
                        field.placeholder || `Выберите ${field.label}`
                      }
                      error={paramsErrors[field.name]}
                      sortOptions={false}
                    />
                  );
                }

                return (
                  <Input
                    key={field.name}
                    label={field.label}
                    required={field.required}
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={paramsForm[field.name] ?? ""}
                    onChange={(event) =>
                      handleChangeParam(field.name, event.target.value)
                    }
                    error={paramsErrors[field.name]}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 ">
            <Button
              onClick={handleCloseCreateModal}
              variant="outlined"
              sx={{
                textTransform: "none",
                color: "#cbd5e1",
                borderColor: "#475569",
                fontFamily: "'Manrope', sans-serif",
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
                fontFamily: "'Manrope', sans-serif",
                "&:hover": {
                  background: "#1d4ed8",
                },
                "&.Mui-disabled": {
                  background: "#334155",
                  color: "#94a3b8",
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
        <div className="space-y-4 font-manrope">
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

          <div className="rounded-xl border border-[#334155] bg-[#111827] p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <p className="text-white font-semibold">
                  Параметры подключения
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Верхнеуровневый тип будет автоматически добавлен в
                  <span className="text-slate-200"> params.type</span> при
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
                  fontFamily: "'Manrope', sans-serif",
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

            <p className="text-xs text-slate-400 mb-3">
              {PARAM_HINTS[editForm.type]}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentEditParamFields.map((field) => {
                if (field.type === "select") {
                  return (
                    <CustomSelect
                      key={field.name}
                      label={field.label}
                      required={field.required}
                      options={field.options || []}
                      value={editParamsForm[field.name]}
                      onChange={(value) =>
                        handleChangeEditParam(field.name, value)
                      }
                      placeholder={
                        field.placeholder || `Выберите ${field.label}`
                      }
                      error={editParamsErrors[field.name]}
                      sortOptions={false}
                    />
                  );
                }

                return (
                  <Input
                    key={field.name}
                    label={field.label}
                    required={field.required}
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={editParamsForm[field.name] ?? ""}
                    onChange={(event) =>
                      handleChangeEditParam(field.name, event.target.value)
                    }
                    error={editParamsErrors[field.name]}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={handleCloseEditModal}
              variant="outlined"
              sx={{
                textTransform: "none",
                color: "#cbd5e1",
                borderColor: "#475569",
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
                "&:hover": {
                  background: "#b45309",
                },
                "&.Mui-disabled": {
                  background: "#334155",
                  color: "#94a3b8",
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
            <span className="block text-xs text-slate-400 mt-2">
              Удаление...
            </span>
          )}
        </DeleteModal>
      )}

      {selectedConnection && (
        <MethodModal
          open={!!selectedConnection}
          onClose={() => setSelectedConnection(null)}
          closeClick={() => setSelectedConnection(null)}
          showCloseIcon={true}
          title={"Детали подключения"}
          width={700}
        >
          <div className="mb-4 p-4 rounded-xl border border-[#334155] bg-[#111827]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center text-blue-200">
                  {selectedConnection?.type?.includes("TCP") ? (
                    <Lan fontSize="small" />
                  ) : (
                    <Usb fontSize="small" />
                  )}
                </span>
                <div>
                  <p className="text-white text-base font-semibold">
                    {selectedConnection.name}
                  </p>
                  <p className="text-slate-400 text-xs">
                    ID: {selectedConnection.id}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs border ${
                  selectedConnection.enabled
                    ? "border-green-500 bg-green-500/20 text-green-300"
                    : "border-slate-500 bg-slate-500/20 text-slate-300"
                }`}
              >
                {selectedConnection.enabled ? "Включен" : "Отключен"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Название</p>
              <p className="text-white font-medium">
                {selectedConnection.name}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Тип</p>
              <p className="text-white font-medium">
                {selectedConnection.type}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Статус</p>
              <p className="text-white font-medium">
                {selectedConnection.enabled ? "Включен" : "Отключен"}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Хост</p>
              <p className="text-white font-medium">
                {get(selectedConnection, "params.host", "-")}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Порт</p>
              <p className="text-white font-medium">
                {get(selectedConnection, "params.port", "-")}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Таймаут</p>
              <p className="text-white font-medium flex items-center gap-2">
                <Schedule fontSize="inherit" className="text-slate-400" />
                {get(selectedConnection, "params.timeout_ms", "-")} ms
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Протокол</p>
              <p className="text-white font-medium flex items-center gap-2">
                <ElectricBoltOutlined
                  fontSize="inherit"
                  className="text-amber-300"
                />
                {get(selectedConnection, "params.type", "-")}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Создано</p>
              <p className="text-white font-medium">
                {selectedConnection.createdAt
                  ? new Date(selectedConnection.createdAt).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </MethodModal>
      )}
    </DashboardLayout>
  );
};

export default Index;
