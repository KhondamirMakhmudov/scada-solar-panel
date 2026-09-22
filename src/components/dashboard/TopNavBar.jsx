import { useEffect, useState } from "react";
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
 * Верхняя идентификационная панель дашборда: логотип, живая сводка по
 * системе, поиск, часы, профиль. Навигация по разделам живёт в
 * `Sidebar.jsx` (слева, под этой панелью) — раньше вкладки были здесь же,
 * второй горизонтальной лентой, но список разделов вернули в боковое меню.
 */
export default function TopNavBar() {
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
    <div className="flex-shrink-0 flex items-center gap-3 h-11 px-3 bg-surface-dark border-b border-surface-border font-ibmPlexSans">
      <Link href="/dashboard/main" className="flex items-center gap-2 flex-shrink-0">
        <Brand title="" iconSize={22} />
      </Link>

      <div className="w-px h-4 bg-surface-border flex-shrink-0" />

      <SystemStatusRibbon />

      <div className="flex-1" />

      <GlobalSearch />

      <div className="w-px h-4 bg-surface-border flex-shrink-0" />

      <span className="text-[13px] font-ibmPlexMono text-text-secondary tabular-nums flex-shrink-0">
        {clock}
      </span>

      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-[2px] border border-transparent hover:border-surface-border hover:bg-white/[0.02] active:scale-[0.97] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
        >
          <Avatar
            {...stringAvatar(userFullName)}
            sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 600 }}
          />
          <span className="hidden md:flex flex-col items-start leading-none">
            <span className="text-[13px] font-medium text-text-secondary">
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
                className="flex items-center gap-2.5 px-3 py-2 text-[14px] text-text-primary hover:bg-[#242424] active:bg-[#2e2e2e] border-b border-surface-border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-inset"
              >
                <SettingsRoundedIcon sx={{ fontSize: 15, color: "#bfc7d4" }} />
                Настройки
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setOpenExitModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-text-primary hover:bg-[#242424] active:bg-[#2e2e2e] text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-inset"
              >
                <ExitToAppIcon sx={{ fontSize: 15, color: "#bfc7d4" }} />
                Выйти
              </button>
            </div>
          </motion.div>
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
