"use client";
import { useTheme } from "next-themes";
import { Switch, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration muammosini oldini olish
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleThemeToggle = (e) => {
    setTheme(e.target.checked ? "dark" : "light");
  };

  return (
    <DashboardLayout headerTitle={"Настройки"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] border border-[#E7E7F4] bg-white rounded-lg bg-[--color-bg-light] text-[--color-text-light] my-[20px] manrope"
      >
        <Typography variant="h6">Настройки панели управления</Typography>

        <p className="my-[5px] text-gray-400">
          Настройте ваш опыт мониторинга SCADA экосистемы
        </p>

        <div className="p-[12px] rounded-lg my-[15px] flex items-center justify-between bg-gray-100 dark:bg-[#333347]">
          <div>
            <h3 className="text-lg ">Темная тема</h3>
            <p className="text-gray-500">
              Переключение между светлой и темной темами
            </p>
          </div>

          <div>
            <Switch
              checked={theme === "dark"}
              onChange={handleThemeToggle}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: "#A877FD",
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "#A877FD",
                },
              }}
            />
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
