import { useState, useMemo } from "react";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { URLS } from "@/constants/url";
import { KEYS } from "@/constants/key";
import useGetQuery from "@/hooks/java/useGetQuery";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import CustomTable from "@/components/table";
import CustomSelect from "@/components/select";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import { Typography } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const StatCard = ({
  title,
  value,
  unit,
  emoji,
  status,
  statusText,
  quality,
}) => {
  const getStatusColor = () => {
    if (quality === "GOOD") return "bg-blue-500/20 text-blue-400";
    if (quality === "BAD") return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-dark border border-surface-dark rounded-xl p-5 relative overflow-hidden group hover:border-primary/30 transition-all"
    >
      <div className="absolute right-0 top-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
        <span
          className="material-symbols-outlined text-primary"
          style={{
            fontSize: "64px",
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48",
          }}
        >
          {emoji}
        </span>
      </div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold text-white tracking-tight font-mono">
          {value}
        </h3>
        <span className="text-sm text-gray-400 font-medium">{unit}</span>
      </div>
      {quality && (
        <div className="flex items-center gap-1 mt-3">
          <span
            className={`${getStatusColor()} rounded px-1.5 py-0.5 text-xs font-bold flex items-center gap-0.5`}
          >
            {quality}
          </span>
          {statusText && (
            <span className="text-gray-400 text-xs ml-1">{statusText}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

const Index = () => {
  const { data: session } = useSession();
  const [selectedNodeId, setSelectedNodeId] = useState(1);
  const [selectedServerId, setSelectedServerId] = useState(1);
  const [viewMode, setViewMode] = useState("table"); // or chart;

  // servers
  const {
    data: servers,
    isLoading,
    isFetching,
  } = useGetQuery({
    key: KEYS.OPCServers,
    url: URLS.OPCServers,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // nodes
  const {
    data: nodes,
    isLoading: isLoadingNodes,
    isFetching: isFetchingNodes,
  } = useGetQuery({
    key: KEYS.OPCNodes,
    url: URLS.OPCNodes,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const { data: readingsByServerId } = useGetQuery({
    key: KEYS.readingsByServerId,
    url: `${URLS.readingsByServerId}${selectedServerId}/latest`,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const { data: readingsByNodeId } = useGetQuery({
    key: KEYS.readingsByNodeId,
    url: `${URLS.readingsByNodeId}${selectedNodeId}`,
  });

  return <DashboardLayout headerTitle={"Чтение данных"}></DashboardLayout>;
};

export default Index;
