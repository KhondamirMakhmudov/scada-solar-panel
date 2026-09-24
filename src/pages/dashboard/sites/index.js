import { useMemo, useState } from "react";
import { get } from "lodash";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@mui/material";
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
import useAllPages from "@/hooks/all/useAllPages";
import usePostQuery from "@/hooks/all/usePostQuery";
import useDeleteQuery from "@/hooks/all/useDeleteQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { requestPython } from "@/services/api";
import SiteDetailsModal from "@/features/sites/SiteDetailsModal";
import {
  SITE_CODE_PATTERN,
  SITE_TYPE_OPTIONS,
  apiErrorText,
  formatDateTime,
  formatInstalledPower,
  parsePassportText,
  passportSummary,
  passportToText,
  pluralize,
  siteTypeLabel,
} from "@/features/sites/siteDisplay";

const DEFAULT_FORM = {
  code: "",
  name: "",
  groupName: "",
  type: "solar",
  installedPowerKw: "",
  passport: "{}",
};

const PASSPORT_PLACEHOLDER = `{
  "installations": [
    {
      "name": "Блок 1",
      "panels": { "model": "JA Solar JAM72", "count": 4200, "powerW": 545 },
      "inverters": [{ "model": "Huawei SUN2000-185KTL", "count": 12 }]
    }
  ]
}`;

const VIEW_MODE_OPTIONS = [
  { label: "ТАБЛИЦА", value: "table" },
  { label: "КАРТОЧКИ", value: "grid" },
];

const cardRowClass =
  "flex items-center justify-between rounded-[2px] border border-surface-border/50 bg-background-dark/60 px-3 py-2";

const SiteCard = ({ site, deviceCount, onView, onEdit, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-[2px] border border-surface-border/70 bg-surface-dark/70 p-5 shadow-[0_0_30px_rgba(15,23,42,0.55)]"
  >
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-text-primary">
          {site.name}
        </h3>
        <p className="mt-1 text-xs font-ibmPlexMono text-text-muted">
          {site.code}
        </p>
      </div>
      <span className="flex-shrink-0 rounded-[2px] border border-blue-400/30 bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-300">
        {siteTypeLabel(site.type)}
      </span>
    </div>

    <div className="space-y-2 text-sm">
      <div className={cardRowClass}>
        <span className="text-text-muted">Организация</span>
        <span className="max-w-[170px] truncate font-medium text-text-primary">
          {site.groupName || "—"}
        </span>
      </div>
      <div className={cardRowClass}>
        <span className="text-text-muted">Мощность</span>
        <span className="font-medium text-text-primary font-ibmPlexMono">
          {formatInstalledPower(site.installedPowerKw)}
        </span>
      </div>
      <div className={cardRowClass}>
        <span className="text-text-muted">Устройства</span>
        <span className="font-medium text-cyan-300 font-ibmPlexMono">
          {deviceCount}
        </span>
      </div>
      <div className={cardRowClass}>
        <span className="text-text-muted">Паспорт</span>
        <span className="font-medium text-text-secondary">
          {passportSummary(site.passport)}
        </span>
      </div>
    </div>

    <div className="mt-4 text-xs text-text-dim">
      Обновлено:{" "}
      <span className="text-text-secondary">
        {formatDateTime(site.updatedAt)}
      </span>
    </div>

    <div className="mt-4 pt-4 border-t border-surface-border/60">
      <ActionButtonGroup>
        <EyeButton onClick={onView} tooltip="Паспорт станции" />
        <EditButton onClick={onEdit} tooltip="Изменить станцию" />
        <DeleteButton onClick={onDelete} tooltip="Удалить станцию" />
      </ActionButtonGroup>
    </div>
  </motion.div>
);

const SiteFormFields = ({ form, errors, onChange }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Название"
        required
        name="name"
        value={form.name}
        onChange={(event) => onChange("name", event.target.value)}
        placeholder="Например, Ферганская ТЭС"
        error={errors.name}
      />
      <Input
        label="Код"
        required
        name="code"
        value={form.code}
        onChange={(event) => onChange("code", event.target.value)}
        placeholder="fergana_tpc"
        error={errors.code}
      />
      <Input
        label="Организация"
        name="groupName"
        value={form.groupName}
        onChange={(event) => onChange("groupName", event.target.value)}
        placeholder="Кому принадлежит станция"
        error={errors.groupName}
      />
      <Input
        label="Установленная мощность, кВт"
        name="installedPowerKw"
        type="number"
        min="0"
        step="any"
        value={form.installedPowerKw}
        onChange={(event) => onChange("installedPowerKw", event.target.value)}
        placeholder="Например, 5000"
        error={errors.installedPowerKw}
      />
      <CustomSelect
        label="Тип станции"
        required
        options={SITE_TYPE_OPTIONS}
        value={form.type}
        onChange={(value) => onChange("type", value)}
        placeholder="Выберите тип"
        error={errors.type}
        sortOptions={false}
      />
    </div>

    <div>
      <label
        htmlFor="passport"
        className="block mb-2 text-[14.5px] font-semibold uppercase tracking-wide text-[#d1d5db]"
      >
        Паспорт (JSON)
      </label>
      <textarea
        id="passport"
        name="passport"
        value={form.passport}
        onChange={(event) => onChange("passport", event.target.value)}
        placeholder={PASSPORT_PLACEHOLDER}
        spellCheck={false}
        rows={10}
        className={`w-full resize-y rounded-lg border bg-[#2c2c32] px-3.5 py-3 text-[13.5px] leading-relaxed text-text-primary placeholder:text-text-faint font-ibmPlexMono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary transition-colors hover:border-white/25 ${
          errors.passport ? "border-status-fault" : "border-white/15"
        }`}
      />
      {errors.passport ? (
        <p className="text-status-fault text-[13px] mt-1">{errors.passport}</p>
      ) : (
        <p className="text-text-faint text-[13px] mt-1">
          Свободные данные об оборудовании: установки, панели, модели
          инверторов. Пустое поле — пустой паспорт.
        </p>
      )}
    </div>
  </div>
);

const ModalActions = ({ onCancel, onSubmit, busy, submitLabel, busyLabel, color }) => (
  <div className="pt-2 flex items-center justify-end gap-2">
    <Button
      onClick={onCancel}
      sx={{ textTransform: "none", color: "#bfc7d4", borderColor: "#383737" }}
      variant="outlined"
    >
      Отмена
    </Button>
    <Button
      onClick={onSubmit}
      disabled={busy}
      sx={{
        textTransform: "none",
        background: color.base,
        color: "#fff",
        "&:hover": { background: color.hover },
      }}
      variant="contained"
    >
      {busy ? busyLabel : submitLabel}
    </Button>
  </div>
);

const Index = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedSite, setSelectedSite] = useState(null);
  const [editingSite, setEditingSite] = useState(null);
  const [deletingSite, setDeletingSite] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const {
    data: sitesResponse,
    isLoading: isLoadingSites,
    isFetching: isFetchingSites,
    isError: isSitesError,
  } = useGetQuery({
    key: KEYS.sites,
    url: URLS.sites,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  // Только ради счётчика «Устройства» — у GET /sites числа привязанных
  // устройств нет. /devices постраничный (страница по умолчанию — 20,
  // pageSize ограничен сотней), поэтому читаем все страницы: иначе счётчик
  // занижался бы для станций, чьи устройства не попали на первую.
  const { data: devicesResponse } = useAllPages({
    key: KEYS.devices,
    url: URLS.devices,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const { mutate: createSite, isLoading: isCreating } = usePostQuery({
    listKeyId: KEYS.sites,
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const { mutate: deleteSite, isPending: isDeleting } = useDeleteQuery({
    listKeyId: [KEYS.sites, KEYS.devices],
    hideErrorToast: true,
    hideSuccessToast: true,
  });

  const sites = useMemo(() => get(sitesResponse, "data.data", []), [sitesResponse]);

  const deviceCountBySite = useMemo(() => {
    const map = new Map();
    get(devicesResponse, "data.data", []).forEach((device) => {
      if (!device.siteId) return;
      map.set(device.siteId, (map.get(device.siteId) || 0) + 1);
    });
    return map;
  }, [devicesResponse]);

  const groupOptions = useMemo(() => {
    const unique = Array.from(
      new Set(sites.map((site) => site.groupName).filter(Boolean)),
    );
    return [{ label: "Все организации", value: "all" }].concat(
      unique.map((value) => ({ label: value, value })),
    );
  }, [sites]);

  const filteredSites = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesGroup = groupFilter === "all" || site.groupName === groupFilter;
      const matchesSearch =
        !query ||
        site.name?.toLowerCase().includes(query) ||
        site.code?.toLowerCase().includes(query) ||
        site.groupName?.toLowerCase().includes(query) ||
        site.id?.toLowerCase().includes(query);

      return matchesGroup && matchesSearch;
    });
  }, [sites, searchValue, groupFilter]);

  const totalInstalledKw = useMemo(
    () => sites.reduce((sum, site) => sum + (Number(site.installedPowerKw) || 0), 0),
    [sites],
  );

  const toForm = (site) => ({
    code: site?.code || "",
    name: site?.name || "",
    groupName: site?.groupName || "",
    type: site?.type || "solar",
    installedPowerKw:
      site?.installedPowerKw === null || site?.installedPowerKw === undefined
        ? ""
        : String(site.installedPowerKw),
    passport: passportToText(site?.passport),
  });

  const validateForm = (form) => {
    const errors = {};
    const name = form.name?.trim() || "";
    const code = form.code?.trim() || "";

    if (!name) errors.name = "Введите название станции";
    else if (name.length > 255) errors.name = "Не длиннее 255 символов";

    if (!code) errors.code = "Введите код станции";
    else if (code.length > 64) errors.code = "Не длиннее 64 символов";
    else if (!SITE_CODE_PATTERN.test(code)) {
      errors.code = "Только латиница, цифры, «_», «-» и «.» — без пробелов";
    }

    if ((form.groupName?.trim() || "").length > 255) {
      errors.groupName = "Не длиннее 255 символов";
    }

    if (!form.type) errors.type = "Выберите тип станции";

    const powerRaw = String(form.installedPowerKw ?? "").trim();
    if (powerRaw) {
      const power = Number(powerRaw);
      if (!Number.isFinite(power) || power < 0) {
        errors.installedPowerKw = "Введите неотрицательное число";
      }
    }

    const passport = parsePassportText(form.passport);
    if (passport.error) errors.passport = passport.error;

    return errors;
  };

  // Пустые необязательные поля уходят как null, а не как "" / 0: для
  // groupName и installedPowerKw «не указано» и «пустая строка/ноль» —
  // разные вещи (ноль кВт — это уже утверждение о станции).
  const buildPayload = (form) => {
    const powerRaw = String(form.installedPowerKw ?? "").trim();

    return {
      code: form.code.trim(),
      name: form.name.trim(),
      groupName: form.groupName?.trim() || null,
      type: form.type,
      installedPowerKw: powerRaw ? Number(powerRaw) : null,
      passport: parsePassportText(form.passport).value,
    };
  };

  const authConfig = {
    headers: session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {},
  };

  const handleCreateSite = () => {
    const errors = validateForm(createForm);
    if (Object.keys(errors).length) {
      setCreateErrors(errors);
      return;
    }

    createSite(
      { url: URLS.sites, attributes: buildPayload(createForm), config: authConfig },
      {
        onSuccess: () => {
          toast.success("Станция создана");
          setShowCreateModal(false);
          setCreateForm(DEFAULT_FORM);
          setCreateErrors({});
        },
        onError: (error) => {
          toast.error(apiErrorText(error, "Ошибка при создании станции"));
        },
      },
    );
  };

  const handleUpdateSite = async () => {
    if (!editingSite?.id) return;

    const errors = validateForm(editForm);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }

    try {
      setIsUpdating(true);
      await requestPython.patch(
        `${URLS.sites}/${editingSite.id}`,
        buildPayload(editForm),
        authConfig,
      );

      toast.success("Станция обновлена");
      queryClient.invalidateQueries({ queryKey: [KEYS.sites] });
      setShowEditModal(false);
      setEditingSite(null);
      setEditErrors({});
    } catch (error) {
      toast.error(apiErrorText(error, "Ошибка при обновлении станции"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSite = () => {
    if (!deletingSite?.id) return;

    deleteSite(
      { url: `${URLS.sites}/${deletingSite.id}`, config: authConfig },
      {
        onSuccess: () => {
          toast.success("Станция удалена, устройства отвязаны");
          if (selectedSite?.id === deletingSite.id) {
            setSelectedSite(null);
            setShowViewModal(false);
          }
          setShowDeleteModal(false);
          setDeletingSite(null);
        },
        onError: (error) => {
          toast.error(apiErrorText(error, "Ошибка при удалении станции"));
        },
      },
    );
  };

  const openCreateModal = () => {
    setCreateForm(DEFAULT_FORM);
    setCreateErrors({});
    setShowCreateModal(true);
  };

  const openEditModal = (site) => {
    setEditingSite(site);
    setEditForm(toForm(site));
    setEditErrors({});
    setShowEditModal(true);
  };

  const openViewModal = (site) => {
    setSelectedSite(site);
    setShowViewModal(true);
  };

  const openDeleteModal = (site) => {
    setDeletingSite(site);
    setShowDeleteModal(true);
  };

  const changeField = (setForm, setErrors) => (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const monoCell = (color = "#bfc7d4", size = 13) => ({
    font: `400 ${size}px/1.3 'IBM Plex Mono'`,
    color,
  });

  const actionButtonClass =
    "hover:underline active:opacity-70 rounded-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60";

  const columns = [
    {
      accessorKey: "name",
      header: "Станция",
      cell: ({ row }) => (
        <div>
          <span style={{ font: "500 13.5px/1.3 'IBM Plex Mono'", color: "#e5e2e1" }}>
            {row.original.name}
          </span>
          <span className="block" style={monoCell("#7c8290", 12)}>
            {row.original.code}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "groupName",
      header: "Организация",
      cell: ({ row }) => (
        <span className="block max-w-[200px] truncate" style={monoCell()}>
          {row.original.groupName || "—"}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Тип",
      cell: ({ row }) => (
        <span style={monoCell()}>{siteTypeLabel(row.original.type)}</span>
      ),
    },
    {
      accessorKey: "installedPowerKw",
      header: "Мощность",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="block text-right" style={monoCell("#bfc7d4", 13.5)}>
          {formatInstalledPower(row.original.installedPowerKw)}
        </span>
      ),
    },
    {
      id: "devices",
      header: "Устройства",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="block text-right" style={monoCell("#bfc7d4", 13.5)}>
          {deviceCountBySite.get(row.original.id) || 0}
        </span>
      ),
    },
    {
      id: "passport",
      header: "Паспорт",
      cell: ({ row }) => (
        <span style={monoCell(row.original.passport && Object.keys(row.original.passport).length ? "#bfc7d4" : "#5c6270")}>
          {passportSummary(row.original.passport)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      meta: { align: "right" },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right" style={{ font: "500 12.5px/1.4 'IBM Plex Mono'" }}>
          <button
            type="button"
            onClick={() => openViewModal(row.original)}
            style={{ color: "#3b82f6" }}
            className={actionButtonClass}
          >
            ПАСПОРТ
          </button>
          <span style={{ color: "#3b82f6" }}> · </span>
          <button
            type="button"
            onClick={() => openEditModal(row.original)}
            style={{ color: "#3b82f6" }}
            className={actionButtonClass}
          >
            ИЗМЕНИТЬ
          </button>
          <span style={{ color: "#3b82f6" }}> · </span>
          <button
            type="button"
            onClick={() => openDeleteModal(row.original)}
            style={{ color: "#3b82f6" }}
            className={actionButtonClass}
          >
            УДАЛИТЬ
          </button>
        </div>
      ),
    },
  ];

  if (isLoadingSites) {
    return (
      <DashboardLayout headerTitle={"Станции"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  if (isSitesError && !sitesResponse) {
    return (
      <DashboardLayout headerTitle={"Станции"}>
        <div className="rounded-xl border border-white/[0.08] bg-surface-dark">
          <NoData
            title="Не удалось загрузить станции"
            description="GET /api/v1/sites не ответил — проверьте, что сервис конфигурации (8100) доступен."
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Станции"}>
      <div className="font-ibmPlexSans space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="поиск станций…"
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
          {groupOptions.length > 2 && (
            <ChipSelect
              value={groupFilter}
              onChange={setGroupFilter}
              label="ОРГАНИЗАЦИЯ"
              options={groupOptions}
            />
          )}
          {isFetchingSites && (
            <span className="text-[13px] font-ibmPlexMono text-text-faint animate-pulse">
              обновление…
            </span>
          )}

          <div className="flex-1" />

          <span className="hidden md:inline text-[13px] font-ibmPlexMono text-text-faint">
            {sites.length}{" "}
            {pluralize(sites.length, ["станция", "станции", "станций"])} ·{" "}
            {formatInstalledPower(totalInstalledKw)}
          </span>

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
                    borderLeft: idx > 0 ? "1px solid rgba(255,255,255,0.15)" : "none",
                    background: isActive ? "#3b82f6" : "transparent",
                    color: isActive ? "#fff" : "#9aa0ac",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
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
            + СТАНЦИЯ
          </button>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-surface-dark">
          {filteredSites.length === 0 ? (
            <NoData
              title={sites.length === 0 ? "Станций пока нет" : "Станции не найдены"}
              description={
                sites.length === 0
                  ? "Создайте первую станцию — затем привяжите к ней устройства на странице «Устройства»."
                  : "Попробуйте изменить поиск или фильтр организации."
              }
            />
          ) : viewMode === "table" ? (
            <CustomTable columns={columns} data={filteredSites} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 p-4">
              {filteredSites.map((site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  deviceCount={deviceCountBySite.get(site.id) || 0}
                  onView={() => openViewModal(site)}
                  onEdit={() => openEditModal(site)}
                  onDelete={() => openDeleteModal(site)}
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
        showCloseIcon
        title={"Создать станцию"}
        width={760}
      >
        <div className="space-y-4 font-mono max-h-[78vh] overflow-y-auto pr-1">
          <SiteFormFields
            form={createForm}
            errors={createErrors}
            onChange={changeField(setCreateForm, setCreateErrors)}
          />
          <ModalActions
            onCancel={() => setShowCreateModal(false)}
            onSubmit={handleCreateSite}
            busy={isCreating}
            submitLabel="Создать"
            busyLabel="Создание..."
            color={{ base: "#2563eb", hover: "#1d4ed8" }}
          />
        </div>
      </MethodModal>

      <MethodModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        closeClick={() => setShowEditModal(false)}
        showCloseIcon
        title={"Редактировать станцию"}
        width={760}
      >
        <div className="space-y-4 font-mono max-h-[78vh] overflow-y-auto pr-1">
          <SiteFormFields
            form={editForm}
            errors={editErrors}
            onChange={changeField(setEditForm, setEditErrors)}
          />
          <ModalActions
            onCancel={() => setShowEditModal(false)}
            onSubmit={handleUpdateSite}
            busy={isUpdating}
            submitLabel="Сохранить"
            busyLabel="Сохранение..."
            color={{ base: "#ea580c", hover: "#c2410c" }}
          />
        </div>
      </MethodModal>

      {showViewModal && (
        <SiteDetailsModal
          site={selectedSite}
          deviceCount={deviceCountBySite.get(selectedSite?.id) || 0}
          onClose={() => setShowViewModal(false)}
        />
      )}

      <DeleteModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingSite(null);
        }}
        deleting={handleDeleteSite}
        title="Удалить станцию?"
      >
        {deletingSite?.name
          ? `Станция «${deletingSite.name}» будет удалена. `
          : "Станция будет удалена. "}
        {(deviceCountBySite.get(deletingSite?.id) || 0) > 0
          ? `Привязанные устройства (${deviceCountBySite.get(deletingSite.id)}) не удаляются — они останутся без станции.`
          : "Устройства не затрагиваются."}
        {isDeleting ? " Выполняется удаление..." : ""}
      </DeleteModal>
    </DashboardLayout>
  );
};

export default Index;
