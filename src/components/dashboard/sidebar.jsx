import React, { useState, useMemo } from "react";
import { useRouter } from "next/router";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { SettingsRounded as SettingsRoundedIcon } from "@mui/icons-material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Avatar from "@mui/material/Avatar";
import { motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { get } from "lodash";

import ExitModal from "../modal/exit-modal";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import Brand from "@/components/brand";
import storage from "@/services/storage";
import { SAVED_ACCOUNTS_KEY } from "@/lib/savedAccounts";
import { hasRequiredRole } from "@/constants/routeAccess";
import { NAV_GROUPS } from "@/constants/navigation";

export default function Sidebar({ isOpen = true }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [openExitModal, setOpenExitModal] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const { data: getMe } = useGetPythonQuery({
    key: KEYS.getMe,
    url: URLS.getMe,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Группа скрывается целиком, если роль не даёт доступа ни к одному её пункту
  const visibleGroups = useMemo(() => {
    const userRoles = session?.user?.roles || [];
    if (!Array.isArray(userRoles) || userRoles.length === 0) return [];

    return NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !item.hiddenInSidebar && hasRequiredRole(item.roles, userRoles),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [session?.user?.roles]);

  const hasAnyItem = visibleGroups.length > 0;

  const handleLogout = async () => {
    const preservedAccounts = storage.get(SAVED_ACCOUNTS_KEY);
    await signOut({ callbackUrl: "/" });
    localStorage.clear();
    sessionStorage.clear();
    if (preservedAccounts) {
      storage.set(SAVED_ACCOUNTS_KEY, preservedAccounts);
    }
  };

  function stringToColor(string) {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
  }

  function stringAvatar(name) {
    if (!name) return { sx: { bgcolor: "#374151" }, children: "U" };
    const nameParts = name.split(" ");
    return {
      sx: { bgcolor: stringToColor(name) },
      children: `${nameParts[0]?.[0] || ""}${nameParts[1]?.[0] || ""}`,
    };
  }

  const firstName = get(getMe, "data.first_name", "");
  const lastName = get(getMe, "data.last_name", "");
  const userFullName = `${firstName} ${lastName}`.trim();

  return (
    <aside
      className={`${
        isOpen ? "w-[264px]" : "w-[68px]"
      } h-screen flex-shrink-0 bg-[#131313] border-r border-[#2a2a2a] transition-[width] duration-200 flex flex-col font-manrope`}
    >
      {/* ЛОГОТИП */}
      <div
        className={`flex-shrink-0 min-h-[64px] flex items-center border-b border-[#2a2a2a] ${
          isOpen ? "px-3 py-2" : "justify-center px-2 py-2"
        }`}
      >
        <Link href="/" className="min-w-0">
          {isOpen ? (
            <Brand
              iconSize={30}
              titleClassName="text-[10px] font-semibold leading-[1.25] tracking-tight text-[#bfc7d4]"
            />
          ) : (
            <Brand title="" iconSize={28} />
          )}
        </Link>
      </div>

      {/* МЕНЮ */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {isOpen ? (
              <p className="px-2.5 pb-1.5 text-[10px] uppercase tracking-wider text-[#6b7280]">
                {group.label}
              </p>
            ) : (
              // В свёрнутом виде подпись группы не помещается — её роль
              // разделителя берёт на себя линия
              <div className="mx-2 mb-2 border-t border-[#2a2a2a]" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = router.pathname === item.path;
                const { Icon } = item;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => router.push(item.path)}
                    title={isOpen ? undefined : item.text}
                    className={`w-full flex items-center rounded-lg transition-colors ${
                      isOpen ? "gap-3 px-2.5 py-2" : "justify-center px-0 py-2"
                    } ${
                      isActive
                        ? "bg-[rgba(59,130,246,0.14)] text-[#3b82f6]"
                        : "text-[#bfc7d4] hover:bg-[#1c1b1b] hover:text-[#e5e2e1]"
                    }`}
                  >
                    {/* Полоса слева вместо рамки по контуру: активный пункт
                        читается мгновенно и кнопка не «дёргается» на 1px */}
                    <span
                      className={`w-[3px] h-5 rounded-full flex-shrink-0 ${
                        isActive ? "bg-[#3b82f6]" : "bg-transparent"
                      } ${isOpen ? "" : "hidden"}`}
                    />
                    <span className="flex-shrink-0 flex items-center justify-center">
                      <Icon fontSize="small" />
                    </span>
                    {isOpen && (
                      <span
                        className={`flex-1 text-left text-[13px] truncate ${
                          isActive ? "font-semibold" : "font-normal"
                        }`}
                      >
                        {item.text}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {!hasAnyItem && isOpen && (
          <p className="text-center text-xs text-[#6b7280] italic py-6">
            Нет доступных пунктов меню
          </p>
        )}
      </nav>

      {/* ПРОФИЛЬ И ВЫХОД */}
      <div className="relative flex-shrink-0 border-t border-[#2a2a2a] p-2">
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          className={`w-full flex items-center rounded-lg px-2 py-2 hover:bg-[#1c1b1b] transition-colors ${
            isOpen ? "gap-2.5" : "justify-center"
          }`}
        >
          <Avatar
            {...stringAvatar(userFullName)}
            sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 600 }}
          />
          {isOpen && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[13px] font-medium text-[#e5e2e1] truncate">
                  {userFullName || "Пользователь"}
                </span>
                <span className="block text-[11px] text-[#6b7280] truncate">
                  {get(getMe, "data.username", "")}
                </span>
              </span>
              <MoreVertIcon sx={{ color: "#6b7280", width: 18 }} />
            </>
          )}
        </button>

        {isProfileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-2 right-2 mb-1"
          >
            <div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-lg shadow-xl shadow-black/50 overflow-hidden">
              <Link
                href="/dashboard/settings"
                className={`flex items-center p-2.5 hover:bg-[#242424] text-[#e5e2e1] transition-colors border-b border-[#2a2a2a] ${
                  isOpen ? "gap-2.5" : "justify-center"
                }`}
              >
                <SettingsRoundedIcon sx={{ fontSize: 18, color: "#bfc7d4" }} />
                {isOpen && <span className="text-[13px]">Настройки</span>}
              </Link>
              <button
                type="button"
                onClick={() => setOpenExitModal(true)}
                className={`w-full flex items-center p-2.5 hover:bg-[#242424] text-[#e5e2e1] text-left transition-colors ${
                  isOpen ? "gap-2.5" : "justify-center"
                }`}
              >
                <ExitToAppIcon sx={{ fontSize: 18, color: "#bfc7d4" }} />
                {isOpen && <span className="text-[13px]">Выйти</span>}
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
    </aside>
  );
}
