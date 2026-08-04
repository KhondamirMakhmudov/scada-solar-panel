import { useMemo, useState } from "react";
import { get } from "lodash";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { translateApiError } from "@/lib/apiErrorTranslation";
import { Button } from "@mui/material";
import { KeyboardArrowDown, Cable, Memory } from "@mui/icons-material";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import CustomSelect from "@/components/select";
import Input from "@/components/input";
import MethodModal from "@/components/modal/method-modal";
import DeleteModal from "@/components/modal/delete-modal";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
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

  const {
    data: tags,
    isLoading: isLoadingTags,
    isFetching: isFetchingTags,
  } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
  });

  const { data: devices } = useGetQuery({
    key: KEYS.devices,
    url: URLS.devices,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
  });

  // Только для дерева «Подключение → Устройство → Тег» ниже — та же связка,
  // что уже строит TagTreeSelect на странице «Экраны».
  const { data: connectsForTree } = useGetQuery({
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
        <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 250px", gap: 10, alignItems: "start" }}>
          <div style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}>
            <div
              style={{
                padding: "7px 10px",
                borderBottom: "1px solid #2a2a2a",
                font: "600 11px/1 'IBM Plex Sans'",
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "#bfc7d4",
              }}
            >
              Дерево тегов
            </div>
            {connTree.length === 0 ? (
              <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                Теги не найдены
              </p>
            ) : (
              connTree.map((connGroup) => {
                const isOpen = expandedConnIds.has(connGroup.connId);
                return (
                  <div key={connGroup.connId}>
                    <div
                      onClick={() => toggleConn(connGroup.connId)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderBottom: "1px solid #232222",
                        cursor: "pointer",
                      }}
                    >
                      <KeyboardArrowDown
                        sx={{
                          fontSize: 15,
                          color: "#5c6270",
                          flexShrink: 0,
                          transform: isOpen ? "none" : "rotate(-90deg)",
                          transition: "transform 0.15s",
                        }}
                      />
                      <Cable sx={{ fontSize: 13, color: "#3b82f6", flexShrink: 0 }} />
                      <span
                        style={{
                          font: "400 11px/1.4 'IBM Plex Mono'",
                          color: "#bfc7d4",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {connGroup.connName}
                      </span>
                      <span style={{ font: "400 9.5px/1.4 'IBM Plex Mono'", color: "#7c8290" }}>{connGroup.tagCount}</span>
                    </div>

                    {isOpen &&
                      connGroup.devices.map((device) => (
                        <div
                          key={device.deviceId || "none"}
                          onClick={() => {
                            setBrowserDeviceId(device.deviceId);
                            setBrowserTagId(null);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px 4px 28px",
                            borderBottom: "1px solid #232222",
                            cursor: "pointer",
                            background: device.deviceId === browserDeviceId ? "rgba(59,130,246,0.08)" : "transparent",
                          }}
                        >
                          <Memory sx={{ fontSize: 13, color: "#22c55e", flexShrink: 0 }} />
                          <span
                            style={{
                              font: "400 11px/1.4 'IBM Plex Mono'",
                              color: "#bfc7d4",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {device.deviceName || "Без устройства"}
                          </span>
                          <span style={{ font: "400 9.5px/1.4 'IBM Plex Mono'", color: "#7c8290" }}>{device.tags.length}</span>
                        </div>
                      ))}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                borderBottom: "1px solid #2a2a2a",
              }}
            >
              <span
                style={{
                  font: "600 11px/1 'IBM Plex Sans'",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#bfc7d4",
                }}
              >
                {browserDeviceId
                  ? `${visibleTags[0]?.deviceName || ""} · ${visibleTags.length} тегов`
                  : "Выберите устройство слева"}
              </span>
              {browserDeviceId && (
                <span style={{ font: "400 10px/1 'IBM Plex Mono'", color: "#7c8290" }}>/tag-values/latest</span>
              )}
            </div>
            {!browserDeviceId ? (
              <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                Выберите устройство, чтобы увидеть текущие значения его тегов
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Тег", "Значение", "Ед.", "Тренд", "Мин", "Сред", "Макс", "Качество", "Действия"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 10px",
                          textAlign: "left",
                          font: "600 9.5px/1.2 'IBM Plex Sans'",
                          letterSpacing: ".09em",
                          textTransform: "uppercase",
                          color: "#7c8290",
                        }}
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
                    return (
                      <tr
                        key={tag.id}
                        onClick={() => setBrowserTagId(tag.id)}
                        style={{
                          borderBottom: "1px solid #232222",
                          cursor: "pointer",
                          background: tag.id === browserTagId ? "rgba(59,130,246,0.08)" : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "5px 10px",
                            font: "400 11.5px/1.3 'IBM Plex Mono'",
                            color: "#e5e2e1",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 160,
                          }}
                        >
                          {tag.name}
                        </td>
                        <td
                          style={{
                            padding: "5px 10px",
                            textAlign: "right",
                            font: "500 11.5px/1.3 'IBM Plex Mono'",
                            color: hasError ? "#ef4444" : "#e5e2e1",
                          }}
                        >
                          {live ? (hasError ? "ОШБК" : fmt(live.value)) : "—"}
                        </td>
                        <td style={{ padding: "5px 10px", font: "400 10.5px/1.3 'IBM Plex Mono'", color: "#7c8290" }}>
                          {tag.unit || live?.unit || ""}
                        </td>
                        <td style={{ padding: "5px 10px" }}>
                          {spark ? (
                            <svg width="72" height="16" style={{ display: "block" }}>
                              <polyline fill="none" stroke="#3b82f6" strokeWidth="1" points={spark} />
                            </svg>
                          ) : (
                            <span style={{ color: "#5c6270", fontSize: 10 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "5px 10px", textAlign: "right", font: "400 11px/1.3 'IBM Plex Mono'", color: "#7c8290" }}>
                          {fmt(min)}
                        </td>
                        <td style={{ padding: "5px 10px", textAlign: "right", font: "400 11px/1.3 'IBM Plex Mono'", color: "#bfc7d4" }}>
                          {fmt(avg)}
                        </td>
                        <td style={{ padding: "5px 10px", textAlign: "right", font: "400 11px/1.3 'IBM Plex Mono'", color: "#7c8290" }}>
                          {fmt(max)}
                        </td>
                        <td
                          style={{
                            padding: "5px 10px",
                            font: "500 10px/1.3 'IBM Plex Mono'",
                            color: quality === "НОРМА" ? "#22c55e" : quality === "ОШИБКА" ? "#ef4444" : "#7c8290",
                          }}
                        >
                          {quality}
                        </td>
                        <td style={{ padding: "5px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, font: "500 9.5px/1.2 'IBM Plex Mono'" }}>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                openViewModal(tag);
                              }}
                              style={{ color: "#3b82f6", cursor: "pointer" }}
                            >
                              ПРОСМОТР
                            </span>
                            <span style={{ color: "#5c6270" }}>·</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(tag);
                              }}
                              style={{ color: "#3b82f6", cursor: "pointer" }}
                            >
                              ИЗМЕНИТЬ
                            </span>
                            <span style={{ color: "#5c6270" }}>·</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(tag);
                              }}
                              style={{ color: "#ef4444", cursor: "pointer" }}
                            >
                              УДАЛИТЬ
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}>
              <div
                style={{
                  padding: "7px 10px",
                  borderBottom: "1px solid #2a2a2a",
                  font: "600 11px/1 'IBM Plex Sans'",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#bfc7d4",
                }}
              >
                Статистика {browserTagId ? `· ${visibleTags.find((t) => t.id === browserTagId)?.name}` : ""}
              </div>
              {!browserTagId ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                  Выберите тег в таблице
                </p>
              ) : !statisticsForSelectedTag ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#7c8290", padding: "16px 10px" }}>Загрузка…</p>
              ) : (
                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                  {[
                    ["Отсчётов (1ч)", statisticsForSelectedTag.count],
                    ["Среднее", fmt(statisticsForSelectedTag.avg)],
                    ["Минимум", fmt(statisticsForSelectedTag.min)],
                    ["Максимум", fmt(statisticsForSelectedTag.max)],
                    ["Первое значение", fmt(statisticsForSelectedTag.firstValue)],
                    ["Последнее значение", fmt(statisticsForSelectedTag.lastValue)],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "3px 0",
                        borderBottom: "1px solid #232222",
                      }}
                    >
                      <span style={{ font: "400 10.5px/1.3 'IBM Plex Sans'", color: "#7c8290" }}>{k}</span>
                      <span style={{ font: "500 11.5px/1.3 'IBM Plex Mono'", color: "#e5e2e1" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}>
              <div
                style={{
                  padding: "7px 10px",
                  borderBottom: "1px solid #2a2a2a",
                  font: "600 11px/1 'IBM Plex Sans'",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#bfc7d4",
                }}
              >
                Агрегаты · бакеты 5 мин
              </div>
              {!browserTagId ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                  Выберите тег в таблице
                </p>
              ) : (
                (() => {
                  const buckets = aggregatesByTagId.get(browserTagId) || [];
                  const avgs = buckets.map((b) => b.avg).filter((v) => v !== null && v !== undefined);
                  const maxs = buckets.map((b) => b.max).filter((v) => v !== null && v !== undefined);
                  if (avgs.length < 2) {
                    return (
                      <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                        Недостаточно данных
                      </p>
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
                    <div style={{ padding: 10 }}>
                      <svg width="100%" height="90" viewBox="0 0 220 90" preserveAspectRatio="none">
                        <line x1="0" y1="88" x2="220" y2="88" stroke="#2a2a2a" />
                        <line x1="0" y1="44" x2="220" y2="44" stroke="#232222" strokeDasharray="3 3" />
                        <polyline fill="none" stroke="#3b82f6" strokeWidth="1.4" points={toPoints(avgs)} />
                        <polyline fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" points={toPoints(maxs)} />
                      </svg>
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, font: "400 9.5px/1 'IBM Plex Mono'", color: "#7c8290" }}>
                          <span style={{ width: 10, height: 2, background: "#3b82f6", display: "inline-block" }} />
                          сред.
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, font: "400 9.5px/1 'IBM Plex Mono'", color: "#7c8290" }}>
                          <span style={{ width: 10, height: 2, background: "#f59e0b", display: "inline-block" }} />
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

        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
          <span
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "6px 11px",
              border: "1px solid #3b82f6",
              color: "#3b82f6",
              font: "500 10.5px/1.2 'IBM Plex Mono'",
              cursor: "pointer",
            }}
          >
            + ТЕГ
          </span>
          <span style={{ font: "400 10.5px/1.2 'IBM Plex Mono'", color: "#5c6270" }}>
            {list.length} тегов зарегистрировано · нажмите на тег в таблице для статистики
          </span>
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
