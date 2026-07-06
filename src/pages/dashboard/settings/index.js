import { useState, useEffect } from "react";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Switch } from "@mui/material";
import toast from "react-hot-toast";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import CachedRoundedIcon from "@mui/icons-material/CachedRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CustomSelect from "@/components/select";
import {
  getAppSettings,
  saveAppSettings,
  applyAppSettings,
} from "@/lib/appSettings";
import { getSavedAccounts, removeSavedAccount } from "@/lib/savedAccounts";

const REFRESH_INTERVAL_OPTIONS = [
  { value: 10, label: "10 секунд" },
  { value: 30, label: "30 секунд" },
  { value: 60, label: "1 минута" },
  { value: 300, label: "5 минут" },
];

const SWITCH_SX = {
  "& .MuiSwitch-switchBase.Mui-checked": {
    color: "#38bdf8",
  },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: "#38bdf8",
  },
};

const SectionCard = ({ icon: Icon, title, description, children, delay }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="rounded-xl border border-slate-700 bg-slate-800/40 p-5"
  >
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
        <Icon fontSize="small" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        {description && (
          <p className="text-xs text-slate-400">{description}</p>
        )}
      </div>
    </div>
    {children}
  </motion.section>
);

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState(null); // null до чтения localStorage
  const [savedAccounts, setSavedAccounts] = useState([]);

  // localStorage доступен только на клиенте
  useEffect(() => {
    setSettings(getAppSettings());
    setSavedAccounts(getSavedAccounts());
  }, []);

  const updateSettings = (patch) => {
    const merged = saveAppSettings(patch);
    setSettings(merged);
    applyAppSettings(queryClient, merged);
  };

  const handleToggleAutoRefresh = (event) => {
    const enabled = event.target.checked;
    updateSettings({ autoRefreshEnabled: enabled });
    toast.success(
      enabled ? "Автообновление включено" : "Автообновление отключено",
    );
  };

  const handleChangeInterval = (value) => {
    updateSettings({ autoRefreshIntervalSec: Number(value) });
    toast.success("Интервал обновления сохранён");
  };

  const handleRemoveAccount = (username) => {
    setSavedAccounts(removeSavedAccount(username));
    toast.success("Сохранённый вход удалён");
  };

  const handleClearCache = () => {
    queryClient.invalidateQueries();
    toast.success("Данные обновляются...");
  };

  const tokenExpires = session?.accessTokenExpires
    ? new Date(session.accessTokenExpires).toLocaleTimeString("ru-RU")
    : "—";

  if (!settings) {
    return <DashboardLayout headerTitle={"Настройки"} />;
  }

  return (
    <DashboardLayout headerTitle={"Настройки"}>
      <div className="font-manrope my-[20px] space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Настройки панели управления
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Настройте ваш опыт мониторинга SCADA экосистемы
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Автообновление данных */}
          <SectionCard
            icon={AutorenewRoundedIcon}
            title="Автообновление данных"
            description="Периодический опрос API без перезагрузки страницы"
            delay={0.05}
          >
            <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3">
              <div>
                <p className="text-sm text-slate-200">
                  Обновлять данные автоматически
                </p>
                <p className="text-xs text-slate-500">
                  Применяется ко всем таблицам и карточкам сразу
                </p>
              </div>
              <Switch
                checked={settings.autoRefreshEnabled}
                onChange={handleToggleAutoRefresh}
                sx={SWITCH_SX}
              />
            </div>

            {settings.autoRefreshEnabled && (
              <div className="mt-3">
                <CustomSelect
                  label="Интервал обновления"
                  options={REFRESH_INTERVAL_OPTIONS}
                  value={settings.autoRefreshIntervalSec}
                  onChange={handleChangeInterval}
                  placeholder="Выберите интервал"
                  sortOptions={false}
                />
              </div>
            )}
          </SectionCard>

          {/* Сессия */}
          <SectionCard
            icon={BadgeRoundedIcon}
            title="Текущая сессия"
            description="Данные активного пользователя"
            delay={0.1}
          >
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3">
                <span className="text-slate-400">Пользователь</span>
                <span className="font-medium text-slate-100">
                  {session?.user?.username || session?.user?.name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3">
                <span className="text-slate-400">Роли</span>
                <span className="flex flex-wrap justify-end gap-1">
                  {(session?.user?.roles || []).length ? (
                    session.user.roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-md border border-blue-400/30 bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-100">—</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3">
                <span className="text-slate-400">Токен действителен до</span>
                <span className="font-medium text-slate-100">
                  {tokenExpires}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Сохранённые входы */}
          <SectionCard
            icon={ManageAccountsRoundedIcon}
            title="Сохранённые входы"
            description="Аккаунты для быстрого входа на странице логина"
            delay={0.15}
          >
            {savedAccounts.length === 0 ? (
              <p className="rounded-lg bg-slate-900/60 p-3 text-sm text-slate-500">
                Нет сохранённых входов. Они появятся после успешного входа в
                систему.
              </p>
            ) : (
              <ul className="space-y-2">
                {savedAccounts.map((account) => (
                  <li
                    key={account.username}
                    className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-200">
                      <PersonRoundedIcon
                        fontSize="small"
                        className="text-blue-300"
                      />
                      {account.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAccount(account.username)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 text-red-300 transition hover:bg-red-500/20"
                      title="Удалить сохранённый вход"
                    >
                      <CloseRoundedIcon sx={{ fontSize: 16 }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Обслуживание */}
          <SectionCard
            icon={CachedRoundedIcon}
            title="Обслуживание"
            description="Действия с кэшем данных панели"
            delay={0.2}
          >
            <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3">
              <div>
                <p className="text-sm text-slate-200">Обновить все данные</p>
                <p className="text-xs text-slate-500">
                  Принудительно перезапросить все таблицы и показатели
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="rounded-lg border border-blue-500/70 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/25"
              >
                Обновить
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
