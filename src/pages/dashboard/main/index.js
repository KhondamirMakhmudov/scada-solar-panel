import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { Typography, IconButton, Button } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MapOfUz from "@/components/map-country";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import { useState, useEffect } from "react";
import usePostPythonQuery from "@/hooks/python/usePostQuery";
import MethodModal from "@/components/modal/method-modal";
import Input from "@/components/input";
import toast from "react-hot-toast";
import PrimaryButton from "@/components/button";
import { useQueryClient } from "@tanstack/react-query";
import DeleteModal from "@/components/modal/delete-modal";
import { config } from "@/config";
import { motion } from "framer-motion";
const Index = () => {
  return (
    <DashboardLayout headerTitle={"Панель управления Modbus/OPC"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] rounded-lg my-[20px] manrope border border-surface-dark bg-background-dark "
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-white">
          <div class="bg-white dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-surface-border flex flex-col gap-3 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-primary">
                <span class="material-symbols-outlined text-[24px]">bolt</span>
              </div>
              <span class="flex items-center text-primary text-sm font-bold bg-green-500/10 px-2 py-0.5 rounded">
                +5%
              </span>
            </div>
            <div>
              <p class="text-gray-500 dark:text-text-secondary text-sm font-medium ">
                Текущая мощность
              </p>
              <p class="text-3xl font-bold tracking-tight mt-1">450 kW</p>
            </div>
          </div>

          <div class="bg-white dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-surface-border flex flex-col gap-3 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                <span class="material-symbols-outlined text-[24px]">
                  grid_view
                </span>
              </div>
              <span class="flex items-center text-gray-400 dark:text-text-secondary text-sm font-bold px-2 py-0.5 rounded">
                0%
              </span>
            </div>
            <div>
              <p class="text-gray-500 dark:text-text-secondary text-sm font-medium">
                Активные инверторы
              </p>
              <p class="text-3xl font-bold tracking-tight mt-1">
                12
                <span class="text-gray-400 dark:text-gray-600 text-xl font-normal">
                  /12
                </span>
              </p>
            </div>
          </div>

          <div class="bg-white dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-surface-border flex flex-col gap-3 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                <span class="material-symbols-outlined text-[24px]">lan</span>
              </div>
              <span class="flex items-center text-primary text-sm font-bold bg-green-500/10 px-2 py-0.5 rounded">
                ONLINE
              </span>
            </div>
            <div>
              <p class="text-gray-500 dark:text-text-secondary text-sm font-medium">
                Modbus статус
              </p>
              <p class="text-3xl font-bold tracking-tight mt-1">Stable</p>
            </div>
          </div>

          <div class="bg-white dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-surface-border flex flex-col gap-3 shadow-sm">
            <div class="flex justify-between items-start">
              <div class="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                <span class="material-symbols-outlined text-[24px]">tag</span>
              </div>
              <span class="flex items-center text-orange-400 text-sm font-bold bg-orange-500/10 px-2 py-0.5 rounded">
                98%
              </span>
            </div>
            <div>
              <p class="text-gray-500 dark:text-text-secondary text-sm font-medium">
                OPC UA теги
              </p>
              <p class="text-3xl font-bold tracking-tight mt-1">850</p>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
