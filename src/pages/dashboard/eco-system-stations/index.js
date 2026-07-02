// src/pages/dashboard/eco-system-stations/index.js

"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import {
  ECOLOGY_PARAMS,
  getDangerLevel,
  getColorByDanger,
} from "@/constants/eco";
import ReportGmailerrorredIcon from "@mui/icons-material/ReportGmailerrorred";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ContentLoader from "@/components/loader";

const EcologyPage = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const socket = new WebSocket("ws://10.20.6.64/ws");

    socket.onopen = () => console.log("WebSocket connected");

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (!parsed.name) return;

        setData((prev) => {
          const idx = prev.findIndex(
            (item) => item.unique_key === parsed.unique_key,
          );

          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = parsed;
            return updated;
          }
          return [...prev, parsed];
        });
      } catch {
        console.warn("Invalid JSON:", event.data);
      }
    };

    socket.onclose = () => console.log("WebSocket disconnected");
    return () => socket.close();
  }, []);

  // Get unique station names
  const stationNames = [...new Set(data.map((item) => item.name))].filter(
    Boolean,
  );

  // Sort items by parameter order
  const getSortedItems = (stationName) => {
    const items = data.filter((d) => d.name === stationName);
    return items.sort((a, b) => {
      const orderA = ECOLOGY_PARAMS[a.node_name]?.order || 999;
      const orderB = ECOLOGY_PARAMS[b.node_name]?.order || 999;
      return orderA - orderB;
    });
  };

  const formatValue = (value) => {
    const num = Number(value) || 0;
    if (Math.abs(num) >= 1000) return num.toFixed(0);
    if (Math.abs(num) >= 10) return num.toFixed(1);
    return num.toFixed(2);
  };

  const formatTime = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return (
      d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      ", " +
      d.toLocaleDateString("ru-RU")
    );
  };

  return (
    <DashboardLayout headerTitle="Экологические показатели станций">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6 font-manrope">
        {stationNames.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {stationNames.map((stationName) => {
              const items = getSortedItems(stationName);
              const ip = items[0]?.ip || "—";
              const lastUpdate = items[0]?.date_app_timestamp;

              // Count danger levels
              const dangerCount = items.filter((item) => {
                const cfg = ECOLOGY_PARAMS[item.node_name];
                if (!cfg) return false;
                return getDangerLevel(Number(item.value), cfg) === "danger";
              }).length;

              return (
                <motion.div
                  key={stationName}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300"
                >
                  {/* Station Header */}
                  <div className="mb-5 pb-4 border-b border-white/20">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-2xl font-bold text-white">
                        {stationName}
                      </h2>
                      {dangerCount > 0 && (
                        <div className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse flex gap-1 items-center">
                          <span>{dangerCount}</span>
                          <ReportGmailerrorredIcon />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-sm text-purple-200">
                      <span className="font-mono">IP: {ip}</span>
                      <span>{items.length} параметров</span>
                    </div>

                    {lastUpdate && (
                      <div className="text-xs text-purple-300 mt-2">
                        Обновлено: {formatTime(lastUpdate)}
                      </div>
                    )}
                  </div>

                  {/* Parameters */}
                  <div className="space-y-4">
                    {items.map((item) => {
                      const cfg = ECOLOGY_PARAMS[item.node_name] || {};
                      const value = Number(item.value) || 0;
                      const title = cfg.title || item.node_name;
                      const unit = cfg.unit || item.unit || "";
                      const max = cfg.max || item.max_value || 100;

                      const percentage = Math.min(
                        Math.abs(value / max) * 100,
                        100,
                      );
                      const dangerLevel = getDangerLevel(value, cfg);
                      const colorClass = getColorByDanger(dangerLevel);

                      const isPhysical = cfg.type === "physical";

                      return (
                        <div
                          key={item.unique_key || item.node_name}
                          className={`p-3 rounded-lg ${
                            dangerLevel === "danger"
                              ? "bg-red-500/20 border border-red-500/50"
                              : "bg-white/5"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white text-sm font-medium flex items-center gap-2">
                              {!isPhysical && dangerLevel === "danger" && (
                                <WarningAmberIcon fontSize="small" />
                              )}
                              {title}
                            </span>
                            <span className="text-white font-bold text-lg">
                              {formatValue(value)}{" "}
                              <span className="text-sm text-purple-300">
                                {unit}
                              </span>
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className={`h-full ${colorClass} rounded-full`}
                            />
                          </div>

                          {/* Danger threshold indicator */}
                          {cfg.danger && !isPhysical && (
                            <div className="flex justify-between text-xs text-purple-300 mt-1">
                              <span>
                                Норма: {cfg.danger.green} {unit}
                              </span>
                              <span>
                                Макс: {max} {unit}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <ContentLoader />
        )}
      </div>
    </DashboardLayout>
  );
};

export default EcologyPage;
