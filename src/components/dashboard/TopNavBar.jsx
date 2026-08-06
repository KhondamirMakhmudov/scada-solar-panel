import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { get } from "lodash";
import Avatar from "@mui/material/Avatar";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { motion } from "framer-motion";

import ExitModal from "../modal/exit-modal";
import Brand from "@/components/brand";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import storage from "@/services/storage";
import { SAVED_ACCOUNTS_KEY } from "@/lib/savedAccounts";
import { hasRequiredRole } from "@/constants/routeAccess";
import { NAV_GROUPS } from "@/constants/navigation";
import SystemStatusRibbon from "./SystemStatusRibbon";
import GlobalSearch from "./GlobalSearch";

function stringToColor(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i += 1) {
    color += `00${((hash >> (i * 8)) & 0xff).toString(16)}`.slice(-2);
  }
  return color;
}

function stringAvatar(name) {
  if (!name) return { sx: { bgcolor: "#2a2a2a" }, children: "U" };
  const parts = name.split(" ");
  return {
    sx: { bgcolor: stringToColor(name) },
    children: `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`,
  };
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Верхняя панель дашборда в два яруса — заменяет боковое меню, но
 * маршрутизация остаётся прежней: каждая вкладка — это реальный Next.js
 * роут, и ролевая фильтрация (`hasRequiredRole`) не меняется, меняется
 * только её представление (горизонтальная лента вместо списка).
 *
 *   • ярус 1 — идентификация организации, живая сводка по системе, часы,
 *     профиль;
 *   • ярус 2 — вкладки разделов.
 */
export default function TopNavBar() {
  const router = useRouter();
  const { data: session } = useSession();
  const clock = useClock();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [openExitModal, setOpenExitModal] = useState(false);

  const { data: getMe } = useGetPythonQuery({
    key: KEYS.getMe,
    url: URLS.getMe,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  // Счётчики-бейджи у вкладок: тот же ключ запроса, что уже использует
  // «Обзор» (systemOverview) — общий кэш react-query, лишнего сетевого
  // запроса это не добавляет.
  //
  // Только Python-бэкенд (connections/devices/tags) — Modbus/OPC UA раньше
  // намеренно не запрашивались здесь: это Java-бэкенд с отдельной, более
  // строгой моделью прав, и в шапке (в отличие от их собственных страниц)
  // запрос шёл бы на каждой странице для каждого пользователя. Для аккаунта
  // без доступа к этим двум ручкам это давало 401 на глобальном axios-
  // интерцепторе (services/api/index.js), который на любой 401 разлогинивает
  // всё приложение, — то есть один пользователь без прав на Modbus/OPC UA
  // не мог зайти вообще никуда. Бейджи для этих двух вкладок сознательно не
  // показываем, а не чиним подсчётом с проверкой роли: сам интерцептор всё
  // ещё слишком грубый, и полагаться на «эта роль обычно имеет доступ»
  // рискованно.
  const { data: systemOverview } = useGetPythonQuery({
    key: KEYS.systemOverview,
    url: URLS.systemOverview,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const overviewData = get(systemOverview, "data.data", {});
  const badgeCounts = {
    "/dashboard/connects": get(overviewData, "connections.total"),
    "/dashboard/devices": get(overviewData, "devices.total"),
    "/dashboard/tags": get(overviewData, "tags.total"),
  };

  const visibleItems = useMemo(() => {
    const userRoles = session?.user?.roles || [];
    if (!Array.isArray(userRoles) || userRoles.length === 0) return [];
    return NAV_GROUPS.flatMap((group) =>
      group.items.filter(
        (item) =>
          !item.hiddenInSidebar && hasRequiredRole(item.roles, userRoles),
      ),
    );
  }, [session?.user?.roles]);

  const handleLogout = async () => {
    const preservedAccounts = storage.get(SAVED_ACCOUNTS_KEY);
    await signOut({ callbackUrl: "/" });
    localStorage.clear();
    sessionStorage.clear();
    if (preservedAccounts) storage.set(SAVED_ACCOUNTS_KEY, preservedAccounts);
  };

  const firstName = get(getMe, "data.first_name", "");
  const lastName = get(getMe, "data.last_name", "");
  const userFullName = `${firstName} ${lastName}`.trim();
  const username = get(getMe, "data.username", "");

  return (
    <div className="flex-shrink-0 flex flex-col bg-surface-dark border-b border-surface-border font-ibmPlexSans">
      {/* Ярус 1 — организация, живая сводка, часы, профиль */}
      <div className="flex items-center gap-3 h-11 px-3 border-b border-surface-border">
        <Link
          href="/dashboard/main"
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Brand title="" iconSize={22} />
        </Link>

        <div className="w-px h-4 bg-surface-border flex-shrink-0" />

        <SystemStatusRibbon />

        <div className="flex-1" />

        <GlobalSearch />

        <div className="w-px h-4 bg-surface-border flex-shrink-0" />

        <span className="text-[11px] font-ibmPlexMono text-text-secondary tabular-nums flex-shrink-0">
          {clock}
        </span>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-[2px] border border-transparent hover:border-surface-border transition-colors"
          >
            <Avatar
              {...stringAvatar(userFullName)}
              sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 600 }}
            />
            <span className="hidden md:flex flex-col items-start leading-none">
              <span className="text-[11px] font-medium text-text-secondary">
                {userFullName || username || "Пользователь"}
              </span>
            </span>
            <MoreVertIcon sx={{ fontSize: 15, color: "#5c6270" }} />
          </button>

          {isProfileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-1 w-48 z-50"
            >
              <div className="bg-surface-dark border border-surface-border rounded-[2px] shadow-xl shadow-black/50 overflow-hidden">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-text-primary hover:bg-[#242424] border-b border-surface-border transition-colors"
                >
                  <SettingsRoundedIcon
                    sx={{ fontSize: 15, color: "#bfc7d4" }}
                  />
                  Настройки
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setOpenExitModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-text-primary hover:bg-[#242424] text-left transition-colors"
                >
                  <ExitToAppIcon sx={{ fontSize: 15, color: "#bfc7d4" }} />
                  Выйти
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Ярус 2 — вкладки разделов: плоская лента без иконок, с бейджами счётчиков */}
      <div className="flex items-stretch h-9 px-1.5 overflow-x-auto">
        {visibleItems.map((item) => {
          const isActive = router.pathname === item.path;
          const badge = badgeCounts[item.path];
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              title={item.hint}
              className={`flex items-center gap-1.5 px-3 whitespace-nowrap text-[11.5px] font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary bg-primary/[0.06]"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]"
              }`}
            >
              {item.text}
              {badge !== undefined && badge !== null && (
                <span className="px-1 rounded-[2px] bg-background-dark font-ibmPlexMono text-[9.5px] text-text-muted">
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        {visibleItems.length === 0 && (
          <span className="flex items-center text-[11px] text-text-faint italic px-3">
            Нет доступных разделов
          </span>
        )}
      </div>

      <ExitModal
        open={openExitModal}
        onClose={() => setOpenExitModal(false)}
        handleLogout={handleLogout}
      />
    </div>
  );
}
