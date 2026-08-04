import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { get } from "lodash";
import { formatTagLabel } from "@/lib/tagNameTranslation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  TableRows,
  ViewModule,
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
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { hasPermission } from "@/constants/permissions";
import { translateApiError } from "@/lib/apiErrorTranslation";
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
    return <span className="text-xs text-text-faint">Нет тегов</span>;
  }

  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;

  return (
    <>
      {visible.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 rounded-[2px] bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs px-2 py-0.5"
        >
          <Sell sx={{ fontSize: 11 }} />
          {name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-[2px] bg-surface-border/40 border border-surface-border-hover/50 text-text-muted text-xs px-2 py-0.5">
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
        {label && <label className="text-sm text-text-primary">{label}</label>}
        <span className="text-xs text-text-dim">
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
              className="inline-flex items-center gap-1 rounded-[2px] bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs px-2 py-0.5"
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

      <div className="rounded-[2px] border border-primary/30 bg-surface-dark text-text-primary">
        <div className="p-2 border-b border-surface-border/60">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: подключение, устройство или тег..."
            className="w-full h-9 rounded-[2px] bg-background-dark border border-surface-border px-2 text-sm text-text-primary outline-none focus:border-blue-500"
          />
        </div>
        <div className="h-56 overflow-auto py-1">
          {visibleTree.length === 0 && (
            <p className="px-4 py-2 text-sm text-text-dim">
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
                  className={`text-text-dim transition-transform ${
                    isExpanded(conn.id) ? "" : "-rotate-90"
                  }`}
                />
                <Cable sx={{ fontSize: 15 }} className="text-blue-300" />
                <span className="flex-1 text-left font-medium text-text-primary truncate">
                  {conn.label}
                </span>
                <span className="text-xs text-text-dim">
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
                          className={`text-text-dim transition-transform ${
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
                        <span className="flex-1 text-left text-text-secondary truncate">
                          {dev.label}
                        </span>
                        <span className="text-xs text-text-dim">
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

// Декоративная заглушка вместо превью мнемосхемы: реального рендера схемы
// в миниатюре у нас нет (это потребовало бы серверного снапшота canvas),
// поэтому рисуем условный «трубопровод» из типовых фигур — одинаковый для
// всех карточек и заведомо нечитаемый как «настоящие данные», а не
// вводящий в заблуждение фейковый превью конкретного экрана. Разметка и
// точные значения — из макета (dash_decoded.html, блок isGallery).
const ScreenThumbnail = () => (
  <div
    className="relative"
    style={{
      height: 112,
      borderBottom: "1px solid #2a2a2a",
      background: "#141414",
      backgroundImage:
        "linear-gradient(#1b1b1b 1px,transparent 1px),linear-gradient(90deg,#1b1b1b 1px,transparent 1px)",
      backgroundSize: "14px 14px",
      padding: 10,
    }}
  >
    <div style={{ position: "absolute", left: 14, top: 22, width: 44, height: 26, border: "1px solid #3a5a7a", background: "#182430" }} />
    <div style={{ position: "absolute", left: 78, top: 34, width: 34, height: 34, borderRadius: "50%", border: "1px solid #2f6f45", background: "#14251b" }} />
    <div style={{ position: "absolute", left: 130, top: 20, width: 30, height: 52, border: "1px solid #3a3a3a", background: "#1a1a1a" }} />
    <div style={{ position: "absolute", left: 176, top: 38, width: 38, height: 22, border: "1px solid #6b5a2a", background: "#241f14" }} />
    <div style={{ position: "absolute", left: 58, top: 46, width: 20, height: 2, background: "#3a3a3a" }} />
    <div style={{ position: "absolute", left: 112, top: 46, width: 18, height: 2, background: "#3a3a3a" }} />
    <div style={{ position: "absolute", left: 160, top: 46, width: 16, height: 2, background: "#3a3a3a" }} />
  </div>
);

const ScreenCard = ({
  screen,
  isSelected,
  onSelect,
  onOpen,
  onOpenRuntime,
  onEditDetails,
  onOpenDetails,
  onClone,
  onDelete,
  canUpdate,
  canDelete,
}) => {
  const stateColor = screen.isActive ? "#22c55e" : "#f59e0b";
  const actionBtnStyle = "flex-1 text-center py-[3px] border font-ibmPlexMono text-[9.5px] font-medium transition-colors";

  return (
    <div
      onClick={onSelect}
      className="cursor-pointer"
      style={{ background: "#131313", border: `1px solid ${isSelected ? "#3b82f6" : "#2a2a2a"}` }}
    >
      <ScreenThumbnail />
      <div style={{ padding: "7px 9px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="flex items-center justify-between">
          <span
            onClick={(e) => {
              if (!canUpdate) return;
              e.stopPropagation();
              onEditDetails();
            }}
            title={canUpdate ? "Изменить название, описание, теги" : undefined}
            className={`font-ibmPlexSans text-[11.5px] font-semibold text-[#e5e2e1] truncate ${canUpdate ? "hover:underline" : ""}`}
          >
            {screen.name}
          </span>
          <span
            className="flex-shrink-0 font-ibmPlexMono font-semibold uppercase"
            style={{ padding: "1px 5px", border: `1px solid ${stateColor}`, borderRadius: 2, fontSize: 9, color: stateColor, marginLeft: 6 }}
          >
            {screen.isActive ? "АКТИВЕН" : "ЧЕРНОВИК"}
          </span>
        </div>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          className="font-ibmPlexMono truncate hover:text-[#bfc7d4]"
          style={{ fontSize: 10, color: "#7c8290" }}
          title="Показать детали экрана"
        >
          {screen.id.slice(0, 8)} · {screen.tagNames.length} тегов · {formatDate(screen.updatedAt)}
        </span>
        <div className="flex gap-1 mt-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRuntime();
            }}
            className={`${actionBtnStyle} text-[#bfc7d4] hover:!border-primary hover:!text-primary`}
            style={{ borderColor: "#2a2a2a" }}
          >
            ПРОСМОТР
          </button>
          <button
            type="button"
            disabled={!canUpdate}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className={`${actionBtnStyle} text-[#bfc7d4] hover:!border-primary hover:!text-primary disabled:opacity-30 disabled:cursor-not-allowed`}
            style={{ borderColor: "#2a2a2a" }}
          >
            ИЗМЕНИТЬ
          </button>
          <button
            type="button"
            disabled={!canUpdate}
            onClick={(e) => {
              e.stopPropagation();
              onClone();
            }}
            className={`${actionBtnStyle} text-[#bfc7d4] hover:!border-primary hover:!text-primary disabled:opacity-30 disabled:cursor-not-allowed`}
            style={{ borderColor: "#2a2a2a" }}
          >
            КЛОН
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`${actionBtnStyle} text-status-fault hover:!border-status-fault`}
              style={{ borderColor: "#2a2a2a", flex: "0 0 auto", padding: "3px 8px" }}
            >
              УДАЛИТЬ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [screenTab, setScreenTab] = useState("gallery"); // "runtime" | "gallery"
  const [selectedScreenId, setSelectedScreenId] = useState(null);
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

  // Мелкогранулярный доступ к действиям на этой странице (см.
  // constants/permissions.js) — отдельно от доступа к самой странице
  // (тот проверяется по ролям в Layout через routeAccess.js).
  const permissions = session?.user?.permissions || [];
  const canCreateScreen = hasPermission(permissions, "scada_storage", "create");
  const canUpdateScreen = hasPermission(permissions, "scada_storage", "update");
  const canDeleteScreen = hasPermission(permissions, "scada_storage", "delete");
  const canReadScreen = hasPermission(permissions, "scada_storage", ["read", "all-read"]);

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

  // Экран для просмотра «вживую» по умолчанию — первый активный, иначе
  // первый в списке; не переопределяем выбор, если пользователь уже кликнул
  // по карточке.
  useEffect(() => {
    if (selectedScreenId || list.length === 0) return;
    setSelectedScreenId((list.find((s) => s.isActive) || list[0]).id);
  }, [list, selectedScreenId]);

  const activeScreen = list.find((s) => s.id === selectedScreenId) || null;

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
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка создания экрана",
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
        translateApiError(get(error, "response.data.message")) ||
          "Ошибка обновления экрана",
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
            translateApiError(get(error, "response.data.message")) ||
              "Ошибка удаления экрана",
          );
        },
      },
    );
  };

  const handleCloneScreen = (screen) => {
    createScreen(
      {
        url: URLS.screens,
        attributes: {
          name: `${screen.name} (копия)`,
          description: screen.description,
          params: screen.params,
          isActive: false,
          tagIds: screen.tagIds,
        },
        config: { headers: authHeaders },
      },
      {
        onSuccess: () => toast.success("Экран склонирован"),
        onError: (error) =>
          toast.error(
            translateApiError(get(error, "response.data.message")) ||
              "Не удалось клонировать экран",
          ),
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

  const columns = [
    {
      accessorKey: "name",
      header: "Экран",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-text-primary">{row.original.name}</p>
          <p className="font-ibmPlexMono text-[10px] text-text-muted">
            {row.original.id.slice(0, 8)}
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
          className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] border text-[9.5px] font-semibold uppercase tracking-wide ${
            row.original.isActive
              ? "border-status-ok text-status-ok"
              : "border-status-warn text-status-warn"
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
        <span className="text-text-secondary">{formatDate(row.original.updatedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5 font-ibmPlexMono text-[10px] font-medium">
          {canReadScreen && (
            <button
              type="button"
              onClick={() => openRuntime(row.original)}
              className="text-primary hover:underline"
            >
              ПРОСМОТР
            </button>
          )}
          {canUpdateScreen && (
            <>
              <span className="text-text-faint">·</span>
              <button
                type="button"
                onClick={() => openDiagram(row.original)}
                className="text-primary hover:underline"
              >
                ИЗМЕНИТЬ
              </button>
              <span className="text-text-faint">·</span>
              <button
                type="button"
                onClick={() => handleCloneScreen(row.original)}
                className="text-primary hover:underline"
              >
                КЛОН
              </button>
            </>
          )}
          {canDeleteScreen && (
            <>
              <span className="text-text-faint">·</span>
              <button
                type="button"
                onClick={() => openDeleteModal(row.original)}
                className="text-status-fault hover:underline"
              >
                УДАЛИТЬ
              </button>
            </>
          )}
        </div>
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
      <div className="font-ibmPlexSans space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-surface-border rounded-[2px] overflow-hidden">
            <button
              type="button"
              onClick={() => setScreenTab("runtime")}
              className={`h-8 px-3 text-[11px] font-ibmPlexSans font-medium transition-colors ${
                screenTab === "runtime"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-background-dark"
              }`}
            >
              Просмотр
            </button>
            <button
              type="button"
              onClick={() => setScreenTab("gallery")}
              className={`h-8 px-3 text-[11px] font-ibmPlexSans font-medium border-l border-surface-border transition-colors ${
                screenTab === "gallery"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-background-dark"
              }`}
            >
              Список экранов
            </button>
          </div>

          <div className="flex-1" />

          {canUpdateScreen && activeScreen && (
            <button
              type="button"
              onClick={() => openDiagram(activeScreen)}
              className="h-8 px-3 rounded-[2px] border border-surface-border text-text-secondary text-[10.5px] font-ibmPlexMono hover:border-surface-border-hover transition-colors"
            >
              ОТКРЫТЬ РЕДАКТОР
            </button>
          )}
          {canCreateScreen && (
            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="h-8 px-3 rounded-[2px] border border-primary bg-primary text-white text-[10.5px] font-ibmPlexMono font-medium hover:bg-primary/90 transition-colors"
            >
              + ЭКРАН
            </button>
          )}
        </div>

        {screenTab === "runtime" ? (
          <div className="rounded-[2px] border border-surface-border bg-surface-dark">
            {!activeScreen ? (
              <NoData title="Нет экранов" description="Создайте первый экран, чтобы увидеть просмотр." />
            ) : (
              <>
                <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-surface-border">
                  <span className="font-ibmPlexSans text-[12px] font-semibold text-text-primary">
                    {activeScreen.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-[2px] border text-[9px] font-ibmPlexMono font-semibold uppercase tracking-wide ${
                      activeScreen.isActive
                        ? "border-status-ok text-status-ok"
                        : "border-status-warn text-status-warn"
                    }`}
                  >
                    {activeScreen.isActive ? "Активен" : "Неактивен"}
                  </span>
                  <div className="flex-1" />
                  <span className="font-ibmPlexMono text-[10px] text-text-muted">
                    {activeScreen.tagNames.length} тегов привязано
                  </span>
                </div>
                <iframe
                  key={activeScreen.id}
                  src={`/dashboard/screens/${activeScreen.id}/runtime`}
                  title={`Просмотр: ${activeScreen.name}`}
                  className="w-full h-[560px] border-0 bg-background-dark"
                />
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="поиск экранов…"
                className="w-[230px] h-8 px-2.5 rounded-[2px] border border-surface-border bg-surface-dark text-[11.5px] font-ibmPlexMono text-text-primary placeholder:text-text-faint outline-none focus:border-primary/60 transition-colors"
              />
              <div className="w-[160px]">
                <CustomSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  options={STATUS_OPTIONS}
                  placeholder="Статус"
                  sortOptions={false}
                />
              </div>
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
                  className="font-ibmPlexSans uppercase"
                  style={{ fontWeight: 600, fontSize: 11, letterSpacing: ".06em", color: "#bfc7d4" }}
                >
                  Экраны · {filteredList.length}
                </span>
                <div style={{ display: "flex", border: "1px solid #2a2a2a", borderRadius: 2, overflow: "hidden" }}>
                  {VIEW_MODE_OPTIONS.map((item, idx) => {
                    const isActive = viewMode === item.value;
                    return (
                      <div
                        key={item.value}
                        onClick={() => setViewMode(item.value)}
                        className="font-ibmPlexMono"
                        style={{
                          padding: "3px 9px",
                          cursor: "pointer",
                          fontSize: 10,
                          fontWeight: 500,
                          borderLeft: idx > 0 ? "1px solid #2a2a2a" : "none",
                          background: isActive ? "#3b82f6" : "#1c1b1b",
                          color: isActive ? "#fff" : "#8b9099",
                        }}
                      >
                        {item.value === "grid" ? "ПЛИТКА" : "ТАБЛИЦА"}
                      </div>
                    );
                  })}
                </div>
              </div>

              {filteredList.length === 0 ? (
                <NoData
                  title="Экраны не найдены"
                  description="Измените фильтры или создайте новый экран."
                />
              ) : viewMode === "table" ? (
                <CustomTable columns={columns} data={paginatedList} />
              ) : (
                <div
                  style={{
                    padding: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))",
                    gap: 10,
                  }}
                >
                  {paginatedList.map((item) => (
                    <ScreenCard
                      key={item.id}
                      screen={item}
                      isSelected={item.id === selectedScreenId}
                      onSelect={() => setSelectedScreenId(item.id)}
                      onOpen={() => openDiagram(item)}
                      onOpenRuntime={() => openRuntime(item)}
                      onEditDetails={() => openEditModal(item)}
                      onOpenDetails={() => openViewModal(item)}
                      onClone={() => handleCloneScreen(item)}
                      onDelete={() => openDeleteModal(item)}
                      canUpdate={canUpdateScreen}
                      canDelete={canDeleteScreen}
                    />
                  ))}
                </div>
              )}
            </div>

            {filteredList.length > 0 && (
              <div className="mt-2.5 flex flex-col items-center justify-between gap-3 border-t border-surface-border pt-3 sm:flex-row">
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
                      className={`h-7 w-9 rounded-[2px] border text-[10.5px] font-ibmPlexMono transition-colors ${
                        pageSize === size
                          ? "border-primary/70 bg-primary/20 text-primary"
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
                    className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition-colors hover:border-surface-border-hover disabled:cursor-not-allowed disabled:opacity-40"
                    title="Первая"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition-colors hover:border-surface-border-hover disabled:cursor-not-allowed disabled:opacity-40"
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
                          className="flex h-7 w-7 items-center justify-center text-text-dim"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className={`flex h-7 w-7 items-center justify-center rounded-[2px] border text-[10.5px] font-ibmPlexMono transition-colors ${
                            currentPage === item
                              ? "border-primary/70 bg-primary/20 text-primary"
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
                    className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition-colors hover:border-surface-border-hover disabled:cursor-not-allowed disabled:opacity-40"
                    title="Вперёд"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-surface-border bg-background-dark text-text-secondary transition-colors hover:border-surface-border-hover disabled:cursor-not-allowed disabled:opacity-40"
                    title="Последняя"
                  >
                    »
                  </button>
                </div>

                <span className="text-[11px] text-text-muted">
                  Страница{" "}
                  <span className="font-semibold text-text-primary">{currentPage}</span>{" "}
                  из <span className="font-semibold text-text-primary">{totalPages}</span>
                  {" · "}
                  <span className="font-semibold text-text-primary">
                    {filteredList.length}
                  </span>{" "}
                  записей
                </span>
              </div>
            )}
          </>
        )}
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
          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Название</p>
            <p className="text-text-primary font-semibold">
              {selectedScreen?.name || "—"}
            </p>
          </div>

          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Описание</p>
            <p className="text-text-primary">
              {selectedScreen?.description || "—"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Статус</p>
              <p className="text-text-primary">
                {selectedScreen?.isActive ? "Активен" : "Неактивен"}
              </p>
            </div>
            <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
              <p className="text-text-muted">Обновлено</p>
              <p className="text-text-primary">
                {formatDate(selectedScreen?.updatedAt)}
              </p>
            </div>
          </div>

          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted mb-2">Теги</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedScreen?.tagNames?.length ? (
                selectedScreen.tagNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex rounded-[2px] px-2 py-0.5 text-xs border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-text-dim">—</span>
              )}
            </div>
          </div>

          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3 overflow-hidden">
            <p className="text-text-muted mb-2">Параметры</p>
            {selectedScreen?.params &&
            Object.keys(selectedScreen.params).length ? (
              <div className="space-y-2">
                {Object.entries(selectedScreen.params).map(([key, value]) => (
                  <div key={key} className="text-xs min-w-0">
                    <p className="text-text-dim mb-1">{key}</p>
                    {key === "canvas" && value && typeof value === "object" ? (
                      <p className="text-text-primary">
                        {(value.nodes || []).length} узлов,{" "}
                        {(value.edges || []).length} связей
                      </p>
                    ) : (
                      <pre className="text-text-primary bg-background-dark/60 rounded-[2px] p-2 whitespace-pre-wrap break-all overflow-y-auto max-h-40">
                        {typeof value === "string"
                          ? value
                          : JSON.stringify(value, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-text-dim text-xs">—</span>
            )}
          </div>

          <div className="rounded-[2px] border border-surface-border bg-surface-dark/70 p-3">
            <p className="text-text-muted">Идентификатор</p>
            <p className="text-text-primary break-all">
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
