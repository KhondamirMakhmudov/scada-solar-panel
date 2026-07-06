import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { get } from "lodash";
import { formatTagLabel } from "@/lib/tagNameTranslation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Dashboard,
  Add,
  Search,
  TableRows,
  ViewModule,
  CheckCircle,
  Circle,
  KeyboardArrowDown,
  Sell,
  Cable,
  Memory,
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
  DiagramButton,
  PreviewButton,
} from "@/components/button";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import usePostQuery from "@/hooks/all/usePostQuery";
import useDeleteQuery from "@/hooks/all/useDeleteQuery";
import { requestPython, requestScreens } from "@/services/api";

const STATUS_OPTIONS = [
  { label: "Все статусы", value: "all" },
  { label: "Активные", value: "active" },
  { label: "Неактивные", value: "inactive" },
];

const ACTIVE_OPTIONS = [
  { label: "Активен", value: true },
  { label: "Неактивен", value: false },
];

const VIEW_MODE_OPTIONS = [
  { label: "Таблица", value: "table", icon: TableRows },
  { label: "Карточки", value: "grid", icon: ViewModule },
];

const DEFAULT_FORM = {
  name: "",
  description: "",
  isActive: true,
  tagIds: [],
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

const TagChipList = ({ names, max = 3 }) => {
  if (!names.length) {
    return <span className="text-xs text-slate-600">Нет тегов</span>;
  }

  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;

  return (
    <>
      {visible.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs px-2 py-0.5"
        >
          <Sell sx={{ fontSize: 11 }} />
          {name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-md bg-slate-700/40 border border-slate-600/50 text-slate-400 text-xs px-2 py-0.5">
          +{overflow}
        </span>
      )}
    </>
  );
};

// Дерево выбора тегов: Подключение → Устройство → Тег.
// Встроенная панель (не выпадающий список): поиск сверху, дерево всегда
// видно, выбранные теги — снимаемые чипы над деревом. Чекбокс на
// устройстве выбирает/снимает все его теги разом.
const TagTreeSelect = ({ label, tree = [], value = [], onChange }) => {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  const labelById = useMemo(() => {
    const map = new Map();
    tree.forEach((conn) =>
      conn.devices.forEach((dev) =>
        dev.tags.forEach((tag) => map.set(tag.id, tag.label)),
      ),
    );
    return map;
  }, [tree]);

  const normalizedQuery = query.trim().toLowerCase();

  // При поиске оставляем только ветки с совпадениями (по тегу,
  // устройству или подключению) и раскрываем их автоматически
  const visibleTree = useMemo(() => {
    if (!normalizedQuery) return tree;
    return tree
      .map((conn) => {
        const connMatch = conn.label.toLowerCase().includes(normalizedQuery);
        const devices = conn.devices
          .map((dev) => {
            const devMatch = dev.label.toLowerCase().includes(normalizedQuery);
            const tags =
              connMatch || devMatch
                ? dev.tags
                : dev.tags.filter((tag) =>
                    tag.label.toLowerCase().includes(normalizedQuery),
                  );
            return { ...dev, tags };
          })
          .filter((dev) => dev.tags.length);
        return { ...conn, devices };
      })
      .filter((conn) => conn.devices.length);
  }, [tree, normalizedQuery]);

  const isExpanded = (id) => Boolean(normalizedQuery) || expanded.has(id);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTag = (tagId) => {
    if (value.includes(tagId)) {
      onChange(value.filter((v) => v !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  const toggleDevice = (dev) => {
    const ids = dev.tags.map((tag) => tag.id);
    const allSelected = ids.every((id) => value.includes(id));
    if (allSelected) {
      onChange(value.filter((v) => !ids.includes(v)));
    } else {
      onChange([...new Set([...value, ...ids])]);
    }
  };

  const countSelected = (tags) =>
    tags.reduce((acc, tag) => acc + (value.includes(tag.id) ? 1 : 0), 0);

  return (
    <div className="w-full">
      <div className="mb-[4px] flex items-center justify-between">
        {label && <label className="text-sm text-gray-200">{label}</label>}
        <span className="text-xs text-slate-500">
          Выбрано: {value.length}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="ml-2 text-red-300/80 hover:text-red-300 transition-colors"
            >
              Очистить
            </button>
          )}
        </span>
      </div>

      {/* Выбранные теги — снимаемые чипы */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs px-2 py-0.5"
            >
              {labelById.get(id) || id}
              <button
                type="button"
                onClick={() => toggleTag(id)}
                className="text-blue-300/60 hover:text-red-300 transition-colors leading-none"
                title="Убрать тег"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="rounded-md border border-primary/30 bg-surface-dark text-gray-100">
        <div className="p-2 border-b border-slate-700/60">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: подключение, устройство или тег..."
            className="w-full h-9 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          />
        </div>
        <div className="h-56 overflow-auto py-1">
          {visibleTree.length === 0 && (
            <p className="px-4 py-2 text-sm text-slate-500">
              {tree.length === 0 ? "Теги загружаются..." : "Ничего не найдено"}
            </p>
          )}
          {visibleTree.map((conn) => (
            <div key={conn.id}>
              {/* Уровень 1: подключение */}
              <button
                type="button"
                onClick={() => toggleExpand(conn.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-dark transition-colors"
              >
                <KeyboardArrowDown
                  sx={{ fontSize: 18 }}
                  className={`text-slate-500 transition-transform ${
                    isExpanded(conn.id) ? "" : "-rotate-90"
                  }`}
                />
                <Cable sx={{ fontSize: 15 }} className="text-blue-300" />
                <span className="flex-1 text-left font-medium text-slate-200 truncate">
                  {conn.label}
                </span>
                <span className="text-xs text-slate-500">
                  {conn.devices.reduce(
                    (acc, dev) => acc + countSelected(dev.tags),
                    0,
                  )}
                  /{conn.devices.reduce((acc, dev) => acc + dev.tags.length, 0)}
                </span>
              </button>

              {isExpanded(conn.id) &&
                conn.devices.map((dev) => {
                  const selectedCount = countSelected(dev.tags);
                  const allSelected =
                    dev.tags.length > 0 && selectedCount === dev.tags.length;
                  const someSelected = selectedCount > 0 && !allSelected;
                  return (
                    <div key={dev.id}>
                      {/* Уровень 2: устройство — вся строка раскрывает,
                          чекбокс выбирает все теги устройства */}
                      <div
                        onClick={() => toggleExpand(dev.id)}
                        className="flex items-center gap-2 pl-7 pr-3 py-1.5 text-sm hover:bg-background-dark cursor-pointer transition-colors"
                      >
                        <KeyboardArrowDown
                          sx={{ fontSize: 18 }}
                          className={`text-slate-500 transition-transform ${
                            isExpanded(dev.id) ? "" : "-rotate-90"
                          }`}
                        />
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={() => toggleDevice(dev)}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
                        />
                        <Memory
                          sx={{ fontSize: 15 }}
                          className="text-emerald-300"
                        />
                        <span className="flex-1 text-left text-slate-300 truncate">
                          {dev.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {selectedCount}/{dev.tags.length}
                        </span>
                      </div>

                      {/* Уровень 3: теги */}
                      {isExpanded(dev.id) &&
                        dev.tags.map((tag) => (
                          <label
                            key={tag.id}
                            className="flex items-center gap-2 pl-[60px] pr-3 py-1.5 text-sm hover:bg-background-dark cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={value.includes(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              className="cursor-pointer"
                            />
                            <Sell
                              sx={{ fontSize: 13 }}
                              className="text-cyan-300"
                            />
                            <span className="truncate">{tag.label}</span>
                          </label>
                        ))}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ScreenCard = ({ screen, onOpen, onOpenRuntime, onView, onEdit, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-[0_0_30px_rgba(15,23,42,0.45)]"
  >
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-base font-semibold text-slate-100 truncate">
          {screen.name}
        </p>
        <p className="text-xs text-slate-400 mt-1 truncate">
          {screen.description || "Без описания"}
        </p>
      </div>
      {screen.isActive ? (
        <span className="flex items-center gap-1 text-green-400 text-xs flex-shrink-0">
          <CheckCircle sx={{ fontSize: 12 }} />
          Активен
        </span>
      ) : (
        <span className="flex items-center gap-1 text-gray-500 text-xs flex-shrink-0">
          <Circle sx={{ fontSize: 12 }} />
          Неактивен
        </span>
      )}
    </div>

    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
      <TagChipList names={screen.tagNames} />
    </div>

    <p className="text-gray-600 text-xs mt-3">
      Изм. {formatDate(screen.updatedAt)}
    </p>

    <div className="mt-4 pt-4 border-t border-slate-700/60">
      <ActionButtonGroup>
        <DiagramButton onClick={onOpen} tooltip="Открыть схему" />
        <PreviewButton onClick={onOpenRuntime} tooltip="Открыть просмотр" />
        <EyeButton onClick={onView} tooltip="Детали экрана" />
        <EditButton onClick={onEdit} tooltip="Изменить экран" />
        <DeleteButton onClick={onDelete} tooltip="Удалить экран" />
      </ActionButtonGroup>
    </div>
  </motion.div>
);

const Index = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedScreen, setSelectedScreen] = useState(null);
  const [editingScreen, setEditingScreen] = useState(null);
  const [deletingScreen, setDeletingScreen] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const authHeaders = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

  const {
    data: screensResp,
    isLoading: isLoadingScreens,
    isFetching: isFetchingScreens,
  } = useGetQuery({
    key: KEYS.screens,
    url: URLS.screens,
    apiClient: requestScreens,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
    enabled: !!session?.accessToken,
  });

  const { data: tagsResp } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    apiClient: requestPython,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
    enabled: !!session?.accessToken,
  });

  // Устройства и подключения нужны для дерева выбора тегов в модалках
  const { data: devicesResp } = useGetQuery({
    key: [KEYS.devices, "screens-tree"],
    url: URLS.devices,
    apiClient: requestPython,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
    enabled: !!session?.accessToken,
  });

  const { data: connectsResp } = useGetQuery({
    key: [KEYS.connects, "screens-tree"],
    url: URLS.connects,
    apiClient: requestPython,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
    enabled: !!session?.accessToken,
  });

  const { mutate: createScreen, isLoading: isCreatingScreen } = usePostQuery({
    apiClient: requestScreens,
    listKeyId: KEYS.screens,
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const { mutate: deleteScreen, isPending: isDeletingScreen } = useDeleteQuery({
    apiClient: requestScreens,
    listKeyId: KEYS.screens,
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const rawList = get(screensResp, "data.data", get(screensResp, "data", []));
  const listRaw = Array.isArray(rawList) ? rawList : [];

  const tagsRaw = get(tagsResp, "data.data", get(tagsResp, "data", []));
  const tagsList = Array.isArray(tagsRaw) ? tagsRaw : [];

  const tagMap = useMemo(
    () => new Map(tagsList.map((tag) => [tag.id, tag.name ? formatTagLabel(tag.name) : tag.id])),
    [tagsList],
  );

  const devicesRaw = get(devicesResp, "data.data", get(devicesResp, "data", []));
  const devicesList = Array.isArray(devicesRaw) ? devicesRaw : [];

  const connectsRaw = get(
    connectsResp,
    "data.data",
    get(connectsResp, "data", []),
  );
  const connectsList = Array.isArray(connectsRaw) ? connectsRaw : [];

  // Дерево «Подключение → Устройство → Тег». Теги без устройства и
  // устройства без подключения попадают в служебные ветки, чтобы ни один
  // тег не потерялся из списка выбора.
  const tagTree = useMemo(() => {
    const deviceById = new Map(devicesList.map((dev) => [dev.id, dev]));
    const connNameById = new Map(
      connectsList.map((conn) => [conn.id, conn.name || conn.id]),
    );

    const groups = new Map();

    for (const tag of tagsList) {
      const tagNode = {
        id: tag.id,
        label: tag.name ? formatTagLabel(tag.name) : tag.id,
      };

      const deviceId = tag.deviceId || get(tag, "device.id", "") || null;
      const device = deviceId ? deviceById.get(deviceId) : null;
      const connId = device?.connectionId || null;

      const connKey = connId || "__no_connection__";
      if (!groups.has(connKey)) {
        groups.set(connKey, {
          id: connKey,
          label: connId
            ? connNameById.get(connId) || connId
            : "Без подключения",
          devices: new Map(),
        });
      }

      const group = groups.get(connKey);
      const devKey = deviceId || "__no_device__";
      if (!group.devices.has(devKey)) {
        group.devices.set(devKey, {
          id: `${connKey}/${devKey}`,
          label: device?.name || (deviceId ? deviceId : "Без устройства"),
          tags: [],
        });
      }

      group.devices.get(devKey).tags.push(tagNode);
    }

    return [...groups.values()].map((group) => ({
      ...group,
      devices: [...group.devices.values()],
    }));
  }, [tagsList, devicesList, connectsList]);

  const list = useMemo(
    () =>
      listRaw.map((item, index) => {
        const tagIds = Array.isArray(item?.tagIds) ? item.tagIds : [];
        return {
          id: item?.id || `screen-${index + 1}`,
          name: item?.name || `Экран ${index + 1}`,
          description: item?.description || "",
          isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
          tagIds,
          tagNames: tagIds.map((id) => tagMap.get(id) || id),
          params: item?.params || {},
          createdAt: item?.createdAt || null,
          updatedAt: item?.updatedAt || item?.createdAt || null,
        };
      }),
    [listRaw, tagMap],
  );

  const resetCreateForm = () => {
    setCreateForm(DEFAULT_FORM);
    setCreateErrors({});
  };

  const toForm = (screen) => ({
    name: screen?.name || "",
    description: screen?.description || "",
    isActive: Boolean(screen?.isActive),
    tagIds: screen?.tagIds || [],
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
      errors.name = "Введите название экрана";
    }
    return errors;
  };

  // `params` isn't user-editable here — it holds the mnemonic editor's
  // diagram data (params.mnemonic) and the legacy React Flow prototype
  // (params.canvas), neither of which this modal should ever touch. Create
  // starts with an empty bucket for the editor to fill in later; edit
  // always passes the screen's existing params straight through unchanged.
  const buildPayload = (form, existingParams = {}) => ({
    name: form.name.trim(),
    description: form.description?.trim() || "",
    params: existingParams,
    isActive: Boolean(form.isActive),
    tagIds: form.tagIds,
  });

  const handleCreateScreen = () => {
    const errors = validateForm(createForm);
    if (Object.keys(errors).length) {
      setCreateErrors(errors);
      return;
    }

    createScreen(
      {
        url: URLS.screens,
        attributes: buildPayload(createForm),
        config: { headers: authHeaders },
      },
      {
        onSuccess: () => {
          toast.success("Экран успешно создан");
          setShowCreateModal(false);
          resetCreateForm();
        },
        onError: (error) => {
          toast.error(
            get(error, "response.data.message", "Ошибка создания экрана"),
          );
        },
      },
    );
  };

  const handleUpdateScreen = async () => {
    if (!editingScreen?.id) return;

    const errors = validateForm(editForm);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }

    try {
      setIsUpdating(true);

      await requestScreens.patch(
        `${URLS.screens}/${editingScreen.id}`,
        buildPayload(editForm, editingScreen.params || {}),
        { headers: authHeaders },
      );

      toast.success("Экран успешно обновлён");
      queryClient.invalidateQueries({ queryKey: [KEYS.screens] });
      setShowEditModal(false);
      setEditingScreen(null);
      setEditErrors({});
    } catch (error) {
      toast.error(
        get(error, "response.data.message", "Ошибка обновления экрана"),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteScreen = () => {
    if (!deletingScreen?.id) return;

    deleteScreen(
      {
        url: `${URLS.screens}/${deletingScreen.id}`,
        config: { headers: authHeaders },
      },
      {
        onSuccess: () => {
          toast.success("Экран удалён");
          if (selectedScreen?.id === deletingScreen.id) {
            setSelectedScreen(null);
            setShowViewModal(false);
          }
          setShowDeleteModal(false);
          setDeletingScreen(null);
        },
        onError: (error) => {
          toast.error(
            get(error, "response.data.message", "Ошибка удаления экрана"),
          );
        },
      },
    );
  };

  const openDiagram = (screen) => {
    router.push(`/dashboard/screens/${screen.id}`);
  };

  const openRuntime = (screen) => {
    router.push(`/dashboard/screens/${screen.id}/runtime`);
  };

  const openViewModal = (screen) => {
    setSelectedScreen(screen);
    setShowViewModal(true);
  };

  const openEditModal = (screen) => {
    setEditingScreen(screen);
    setEditForm(toForm(screen));
    setEditErrors({});
    setShowEditModal(true);
  };

  const openDeleteModal = (screen) => {
    setDeletingScreen(screen);
    setShowDeleteModal(true);
  };

  const filteredList = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return list.filter((item) => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tagNames.some((name) => name.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? item.isActive : !item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [list, searchValue, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const stats = useMemo(() => {
    const active = list.filter((item) => item.isActive).length;
    return {
      total: list.length,
      active,
      inactive: list.length - active,
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
      header: "Экран",
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
      accessorKey: "tagNames",
      header: "Теги",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1 max-w-[240px]">
          <TagChipList names={row.original.tagNames} />
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Статус",
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs ${
            row.original.isActive
              ? "bg-green-500/15 text-green-300 border border-green-400/30"
              : "bg-slate-500/20 text-slate-300 border border-slate-400/30"
          }`}
        >
          {row.original.isActive ? "Активен" : "Неактивен"}
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
          <DiagramButton
            onClick={() => openDiagram(row.original)}
            tooltip="Открыть схему"
          />
          <PreviewButton
            onClick={() => openRuntime(row.original)}
            tooltip="Открыть просмотр"
          />
          <EyeButton
            onClick={() => openViewModal(row.original)}
            tooltip="Детали экрана"
          />
          <EditButton
            onClick={() => openEditModal(row.original)}
            tooltip="Изменить экран"
          />
          <DeleteButton
            onClick={() => openDeleteModal(row.original)}
            tooltip="Удалить экран"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  if (isLoadingScreens || isFetchingScreens) {
    return (
      <DashboardLayout headerTitle={"Экраны"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Экраны"}>
      <div className="font-manrope py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-800 p-6"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                <Dashboard fontSize="small" />
                SCADA / Экраны
              </p>
              <h2 className="text-2xl font-semibold text-slate-100 mt-2">
                Экраны мнемосхем
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Управление экранами визуализации: создание, привязка тегов и
                параметров отображения.
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
              Новый экран
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Всего экранов</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-4">
            <p className="text-sm text-green-300">Активных</p>
            <p className="mt-1 text-2xl font-semibold text-green-200">
              {stats.active}
            </p>
          </div>
          <div className="rounded-xl border border-slate-500/25 bg-slate-500/10 p-4">
            <p className="text-sm text-slate-300">Неактивных</p>
            <p className="mt-1 text-2xl font-semibold text-slate-200">
              {stats.inactive}
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
                  placeholder="Поиск по названию, описанию, тегам"
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
              <Dashboard fontSize="small" />
              Найдено экранов:{" "}
              <span className="font-semibold text-slate-200">
                {filteredList.length}
              </span>
            </span>
          </div>

          {filteredList.length === 0 ? (
            <NoData
              title="Экраны не найдены"
              description="Измените фильтры или создайте новый экран."
            />
          ) : viewMode === "table" ? (
            <CustomTable columns={columns} data={paginatedList} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {paginatedList.map((item) => (
                <ScreenCard
                  key={item.id}
                  screen={item}
                  onOpen={() => openDiagram(item)}
                  onOpenRuntime={() => openRuntime(item)}
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
        title={"Создать экран"}
        width={700}
      >
        <div className="space-y-3 font-mono">
          <Input
            label="Название"
            required
            name="name"
            value={createForm.name}
            onChange={(event) =>
              handleChangeCreateField("name", event.target.value)
            }
            placeholder="Например, Главная мнемосхема"
            error={createErrors.name}
          />
          <Input
            label="Описание"
            name="description"
            value={createForm.description}
            onChange={(event) =>
              handleChangeCreateField("description", event.target.value)
            }
            placeholder="Описание экрана"
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              label="Статус"
              options={ACTIVE_OPTIONS}
              value={createForm.isActive}
              onChange={(value) => handleChangeCreateField("isActive", value)}
              placeholder="Выберите статус"
              sortOptions={false}
            />
          </div>

          <TagTreeSelect
            label="Теги"
            tree={tagTree}
            value={createForm.tagIds}
            onChange={(value) => handleChangeCreateField("tagIds", value)}
          />

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
              onClick={handleCreateScreen}
              disabled={isCreatingScreen}
              sx={{
                textTransform: "none",
                background: "#2563eb",
                color: "#eff6ff",
                "&:hover": { background: "#1d4ed8" },
              }}
              variant="contained"
            >
              {isCreatingScreen ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </MethodModal>

      <MethodModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        closeClick={() => setShowEditModal(false)}
        showCloseIcon={true}
        title={"Редактировать экран"}
        width={700}
      >
        <div className="space-y-3 font-mono">
          <Input
            label="Название"
            required
            name="name"
            value={editForm.name}
            onChange={(event) =>
              handleChangeEditField("name", event.target.value)
            }
            placeholder="Например, Главная мнемосхема"
            error={editErrors.name}
          />
          <Input
            label="Описание"
            name="description"
            value={editForm.description}
            onChange={(event) =>
              handleChangeEditField("description", event.target.value)
            }
            placeholder="Описание экрана"
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              label="Статус"
              options={ACTIVE_OPTIONS}
              value={editForm.isActive}
              onChange={(value) => handleChangeEditField("isActive", value)}
              placeholder="Выберите статус"
              sortOptions={false}
            />
          </div>

          <TagTreeSelect
            label="Теги"
            tree={tagTree}
            value={editForm.tagIds}
            onChange={(value) => handleChangeEditField("tagIds", value)}
          />

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
              onClick={handleUpdateScreen}
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
        title={"Детали экрана"}
        width={680}
      >
        <div className="space-y-3 font-mono text-sm">
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Название</p>
            <p className="text-slate-100 font-semibold">
              {selectedScreen?.name || "—"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Описание</p>
            <p className="text-slate-100">
              {selectedScreen?.description || "—"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Статус</p>
              <p className="text-slate-100">
                {selectedScreen?.isActive ? "Активен" : "Неактивен"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-slate-400">Обновлено</p>
              <p className="text-slate-100">
                {formatDate(selectedScreen?.updatedAt)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400 mb-2">Теги</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedScreen?.tagNames?.length ? (
                selectedScreen.tagNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex rounded-md px-2 py-0.5 text-xs border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 overflow-hidden">
            <p className="text-slate-400 mb-2">Параметры</p>
            {selectedScreen?.params &&
            Object.keys(selectedScreen.params).length ? (
              <div className="space-y-2">
                {Object.entries(selectedScreen.params).map(([key, value]) => (
                  <div key={key} className="text-xs min-w-0">
                    <p className="text-slate-500 mb-1">{key}</p>
                    {key === "canvas" && value && typeof value === "object" ? (
                      <p className="text-slate-200">
                        {(value.nodes || []).length} узлов,{" "}
                        {(value.edges || []).length} связей
                      </p>
                    ) : (
                      <pre className="text-slate-200 bg-slate-950/60 rounded-md p-2 whitespace-pre-wrap break-all overflow-y-auto max-h-40">
                        {typeof value === "string"
                          ? value
                          : JSON.stringify(value, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 text-xs">—</span>
            )}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-slate-400">Идентификатор</p>
            <p className="text-slate-100 break-all">
              {selectedScreen?.id || "—"}
            </p>
          </div>
        </div>
      </MethodModal>

      <DeleteModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingScreen(null);
        }}
        deleting={handleDeleteScreen}
        title="Вы уверены, что хотите удалить экран?"
      >
        {deletingScreen?.name
          ? `Экран «${deletingScreen.name}» будет удалён без возможности восстановления.`
          : "Экран будет удалён без возможности восстановления."}
        {isDeletingScreen ? " Выполняется удаление..." : ""}
      </DeleteModal>
    </DashboardLayout>
  );
};

export default Index;
