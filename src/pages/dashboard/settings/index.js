import { useState, useEffect } from "react";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Switch } from "@mui/material";
import toast from "react-hot-toast";
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

const SectionCard = ({ title, children, delay }) => (
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay }}
    style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}
  >
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
      {title}
    </div>
    <div style={{ padding: "4px 10px 8px" }}>{children}</div>
  </motion.section>
);

const SettingsRow = ({ label, hint, children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "6px 0",
      borderBottom: "1px solid #232222",
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ font: "500 11.5px/1.2 'IBM Plex Sans'", color: "#e5e2e1" }}>{label}</span>
      {hint && (
        <span style={{ font: "400 10px/1.3 'IBM Plex Sans'", color: "#7c8290" }}>{hint}</span>
      )}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

const RowValue = ({ children, color }) => (
  <span
    style={{
      display: "inline-block",
      padding: "3px 7px",
      background: "#131313",
      border: "1px solid #2a2a2a",
      font: "500 11px/1.3 'IBM Plex Mono'",
      color: color || "#e5e2e1",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
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
      <div style={{ fontFamily: "'IBM Plex Sans'" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
            gap: 10,
            alignItems: "start",
          }}
        >
          <SectionCard title="Автообновление данных" delay={0.02}>
            <SettingsRow
              label="Обновлять данные автоматически"
              hint="Применяется ко всем таблицам и карточкам сразу"
            >
              <Switch
                checked={settings.autoRefreshEnabled}
                onChange={handleToggleAutoRefresh}
                sx={SWITCH_SX}
                size="small"
              />
            </SettingsRow>

            {settings.autoRefreshEnabled && (
              <div className="py-2">
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

          <SectionCard title="Текущая сессия" delay={0.04}>
            <SettingsRow label="Пользователь">
              <RowValue>{session?.user?.username || session?.user?.name || "—"}</RowValue>
            </SettingsRow>
            <SettingsRow label="Роли">
              <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 4 }}>
                {(session?.user?.roles || []).length ? (
                  session.user.roles.map((role) => (
                    <RowValue key={role} color="#3b82f6">
                      {role}
                    </RowValue>
                  ))
                ) : (
                  <RowValue>—</RowValue>
                )}
              </span>
            </SettingsRow>
            <SettingsRow label="Токен действителен до">
              <RowValue>{tokenExpires}</RowValue>
            </SettingsRow>
          </SectionCard>

          <SectionCard title="Сохранённые входы" delay={0.06}>
            {savedAccounts.length === 0 ? (
              <p style={{ padding: "10px 0", font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic" }}>
                Нет сохранённых входов. Они появятся после успешного входа в систему.
              </p>
            ) : (
              savedAccounts.map((account) => (
                <SettingsRow key={account.username} label={account.username}>
                  <span
                    onClick={() => handleRemoveAccount(account.username)}
                    style={{ font: "500 10px/1.4 'IBM Plex Mono'", color: "#ef4444", cursor: "pointer" }}
                    title="Удалить сохранённый вход"
                  >
                    УДАЛИТЬ
                  </span>
                </SettingsRow>
              ))
            )}
          </SectionCard>

          <SectionCard title="Обслуживание" delay={0.08}>
            <SettingsRow
              label="Обновить все данные"
              hint="Принудительно перезапросить все таблицы и показатели"
            >
              <span
                onClick={handleClearCache}
                style={{
                  padding: "5px 9px",
                  border: "1px solid #3b82f6",
                  color: "#3b82f6",
                  font: "500 10.5px/1.2 'IBM Plex Mono'",
                  cursor: "pointer",
                }}
              >
                ОБНОВИТЬ
              </span>
            </SettingsRow>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
