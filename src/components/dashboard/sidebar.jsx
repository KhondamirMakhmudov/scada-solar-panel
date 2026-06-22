import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { List, ListItemButton, ListItemIcon, Typography } from "@mui/material";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import { motion } from "framer-motion";
import { SettingsRounded as SettingsRoundedIcon } from "@mui/icons-material";
import ExitModal from "../modal/exit-modal";
import { signOut, useSession } from "next-auth/react";
import Avatar from "@mui/material/Avatar";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import Link from "next/link";

import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { get } from "lodash";
import Brand from "@/components/brand";

const menuItems = [
  {
    text: "Главная",
    icon: <HomeRoundedIcon fontSize="medium" />,
    path: "/dashboard/main",
  },
  {
    text: "Подключения",
    icon: <HubRoundedIcon fontSize="medium" />,
    path: "/dashboard/connects",
  },
  {
    text: "Устройства",
    icon: <MemoryRoundedIcon fontSize="medium" />,
    path: "/dashboard/devices",
  },
  {
    text: "Теги",
    icon: <WbSunnyRoundedIcon fontSize="medium" />,
    path: "/dashboard/tags",
  },
  {
    text: "Экраны",
    icon: <HubRoundedIcon fontSize="medium" />,
    path: "/dashboard/screens",
  },
  {
    text: "Тест WebSocket",
    icon: <HubRoundedIcon fontSize="medium" />,
    path: "/dashboard/test/websocket",
  },
];

export default function Sidebar({ isOpen = true }) {
  const [open, setOpen] = useState(false);
  const [openExitModal, setOpenExitModal] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const { data: session } = useSession();
  const router = useRouter();

  const {
    data: getMe,
    isLoading,
    isFetching,
  } = useGetPythonQuery({
    key: KEYS.getMe,
    url: URLS.getMe,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // active submenu bo'lsa parentni ochiq qilib qo'yish
  useEffect(() => {
    menuItems.forEach((item, index) => {
      if (item.submenu?.some((sub) => router.pathname === sub.path)) {
        setOpenSubmenus((prev) => ({
          ...prev,
          [index]: true,
        }));
      }
    });
  }, [router.pathname]);

  const handleToggleSubmenu = (index) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
    localStorage.clear();
    sessionStorage.clear();
  };

  function stringToColor(string) {
    let hash = 0;
    let i;

    for (i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = "#";

    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }

    return color;
  }

  function stringAvatar(name) {
    if (!name) return { sx: { bgcolor: "#374151" }, children: "U" };

    const nameParts = name.split(" ");
    return {
      sx: {
        bgcolor: stringToColor(name),
      },
      children: `${nameParts[0]?.[0] || ""}${nameParts[1]?.[0] || ""}`,
    };
  }

  const userFullName = `${get(getMe, "data.first_name", "")} ${get(
    getMe,
    "data.last_name",
    "",
  )}`.trim();

  return (
    <aside
      className={`${
        isOpen ? "w-[340px]" : "w-[80px]"
      } h-screen bg-[#131313] px-[16px] py-[25px] transition-all duration-300 overflow-y-auto flex flex-col justify-between font-mono border-r border-[#2a2a2a]`}
    >
      <div className="text-white pt-8 pb-8">
        {/* LOGO */}
        <div className="mb-8">
          <Link href="/">
            <div
              className={`flex gap-2 items-center  ${
                !isOpen ? "justify-center" : "justify-start"
              }`}
            >
              {isOpen ? <Brand /> : <Brand title="" />}
            </div>
          </Link>
        </div>

        {/* MENU */}
        <List className="space-y-1">
          {menuItems.map((item, index) => {
            const isActive = router.pathname === item.path;
            const isAnySubmenuActive =
              item.submenu?.some((sub) => router.pathname === sub.path) ||
              false;
            const isOpenSubmenu = openSubmenus[index] || false;

            return (
              <div key={index}>
                {item.text === "Экраны" && (
                  <div className="my-2 border-t border-[#2a2a2a]"></div>
                )}
                {/* Parent item */}
                <ListItemButton
                  onClick={() =>
                    item.submenu
                      ? handleToggleSubmenu(index)
                      : router.push(item.path)
                  }
                  selected={isActive || isAnySubmenuActive}
                  sx={{
                    borderRadius: "10px",
                    my: 0.5,
                    color:
                      isActive || isAnySubmenuActive ? "#3b82f6" : "#bfc7d4",
                    backgroundColor:
                      isActive || isAnySubmenuActive
                        ? "rgba(59, 130, 246, 0.15) !important"
                        : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      color: "#3b82f6",
                    },
                    border:
                      isActive || isAnySubmenuActive
                        ? "1px solid rgba(59, 130, 246, 0.3)"
                        : "1px solid transparent",
                    justifyContent: isOpen ? "flex-start" : "center",
                    px: isOpen ? 2 : 1,
                    py: 1.5,
                    transition: "all 0.2s ease",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: "auto",
                      color:
                        isActive || isAnySubmenuActive ? "#3b82f6" : "#bfc7d4",
                      justifyContent: "center",
                      mr: isOpen ? 2 : 0,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  {isOpen && (
                    <Typography
                      sx={{
                        fontFamily: "Manrope, sans-serif",
                        fontSize: "16px",
                        textTransform: "uppercase",
                        fontWeight: isActive || isAnySubmenuActive ? 600 : 400,
                        flexGrow: 1,
                      }}
                    >
                      {item.text}
                    </Typography>
                  )}

                  {item.submenu && isOpen && (
                    <span className="ml-auto">
                      {isOpenSubmenu ? (
                        <ExpandLessIcon
                          fontSize="small"
                          sx={{
                            color:
                              isActive || isAnySubmenuActive
                                ? "#3b82f6"
                                : "#bfc7d4",
                          }}
                        />
                      ) : (
                        <ExpandMoreIcon
                          fontSize="small"
                          sx={{
                            color:
                              isActive || isAnySubmenuActive
                                ? "#3b82f6"
                                : "#bfc7d4",
                          }}
                        />
                      )}
                    </span>
                  )}
                </ListItemButton>

                {item.text === "Экраны" && (
                  <div className="my-2 border-b border-[#2a2a2a]"></div>
                )}

                {/* Submenu */}
                {item.submenu && isOpenSubmenu && isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-8 pl-4 border-l-2 border-[#393939] mt-1 space-y-1"
                  >
                    {item.submenu.map((sub, subIndex) => {
                      const isSubActive = router.pathname === sub.path;
                      return (
                        <ListItemButton
                          key={subIndex}
                          onClick={() => router.push(sub.path)}
                          selected={isSubActive}
                          sx={{
                            borderRadius: "8px",
                            my: 0.5,
                            color: isSubActive ? "#3b82f6" : "#bfc7d4",
                            backgroundColor: isSubActive
                              ? "rgba(59, 130, 246, 0.1)"
                              : "transparent",
                            "&:hover": {
                              backgroundColor: "rgba(59, 130, 246, 0.05)",
                              color: "#3b82f6",
                            },
                            border: isSubActive
                              ? "1px solid rgba(59, 130, 246, 0.2)"
                              : "1px solid transparent",
                            pl: 3,
                            py: 1,
                          }}
                        >
                          <div className="flex items-center w-full">
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-3 ${
                                isSubActive ? "bg-[#3b82f6]" : "bg-[#393939]"
                              }`}
                            />

                            <Typography
                              sx={{
                                fontSize: "14px",
                                fontFamily: "'Manrope', sans-serif",
                                fontWeight: isSubActive ? 500 : 400,
                              }}
                            >
                              {sub.text}
                            </Typography>
                          </div>
                        </ListItemButton>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </List>
      </div>

      {/* USER PROFILE & LOGOUT */}
      <div className="relative">
        <ListItemButton
          onClick={() => setOpen((prev) => !prev)}
          sx={{
            borderRadius: "12px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            justifyContent: isOpen ? "flex-start" : "center",
            px: isOpen ? 2 : 1,
            py: 1.5,
            "&:hover": {
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              borderColor: "rgba(59, 130, 246, 0.3)",
            },
          }}
        >
          <div
            className={`flex ${
              !isOpen ? "justify-center" : "justify-between"
            } items-center w-full`}
          >
            <div className="flex items-center gap-3">
              <Avatar
                {...stringAvatar(userFullName)}
                sx={{
                  width: "36px",
                  height: "36px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              />

              {isOpen && (
                <div className="text-[#e5e2e1]">
                  <h4 className="text-[15px] font-semibold font-spaceGrotesk">
                    {get(getMe, "data.first_name", "")}{" "}
                    {get(getMe, "data.last_name", "")}
                  </h4>
                  <p className="text-sm text-[#bfc7d4] font-manrope">
                    {get(getMe, "data.username", "")}
                  </p>
                </div>
              )}
            </div>

            {isOpen && (
              <MoreVertIcon
                sx={{
                  color: "#bfc7d4",
                  width: "20px",
                  "&:hover": {
                    color: "#3b82f6",
                  },
                }}
              />
            )}
          </div>
        </ListItemButton>

        {/* Dropdown menu */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2"
          >
            <div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-xl shadow-lg overflow-hidden">
              <Link
                href="/dashboard/settings"
                className={`flex p-3 hover:bg-[#393939] text-[#e5e2e1] items-center ${
                  isOpen ? "gap-3" : "justify-center"
                } transition-all duration-200 border-b border-[#2a2a2a]`}
              >
                <SettingsRoundedIcon
                  sx={{
                    fontSize: "20px",
                    color: "#bfc7d4",
                  }}
                />
                {isOpen && (
                  <span className="font-manrope text-sm font-medium">
                    Настройки
                  </span>
                )}
              </Link>

              <button
                onClick={() => setOpenExitModal(true)}
                className={`flex p-3 hover:bg-[#393939] text-[#e5e2e1] items-center w-full text-left ${
                  isOpen ? "gap-3" : "justify-center"
                } transition-all duration-200`}
              >
                <ExitToAppIcon
                  sx={{
                    fontSize: "20px",
                    color: "#bfc7d4",
                  }}
                />
                {isOpen && (
                  <span className="font-manrope text-sm font-medium">
                    Выйти
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Exit Modal */}
      <ExitModal
        open={openExitModal}
        onClose={() => setOpenExitModal(false)}
        handleLogout={handleLogout}
      />
    </aside>
  );
}
