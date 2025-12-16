import useGetQuery from "@/hooks/java/useGetQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { motion } from "framer-motion";
import CustomTable from "@/components/table";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import {
  EditButton,
  DeleteButton,
  ActionButtonGroup,
} from "@/components/button";

const Index = () => {
  const { data: session } = useSession();
  const {
    data: devices,
    isLoading,
    isFetching,
  } = useGetQuery({
    key: KEYS.MODBUSDevices,
    url: URLS.MODBUSDevices,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
  });

  // Handler functions
  const handleEdit = (device) => {
    console.log("Edit device:", device);
    // Add your edit logic here
  };

  const handleDelete = (device) => {
    console.log("Delete device:", device);
    // Add your delete logic here
  };

  // Helper function to parse and format connection params
  const formatConnectionParams = (paramsString) => {
    try {
      const params = JSON.parse(paramsString);
      return (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-primary/20 text-primary">
            {params.comPort}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-purple-500/20 text-purple-400">
            {params.baudRate}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-orange-500/20 text-orange-400">
            {params.dataBits}/{params.stopBits}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-blue-500/20 text-blue-400">
            {params.parity}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-pink-500/20 text-pink-400">
            Slave: {params.slaveId}
          </span>
        </div>
      );
    } catch (error) {
      return <span className="text-red-400 text-sm">Ошибка парсинга</span>;
    }
  };

  const columns = [
    {
      header: "№",
      cell: ({ row }) => (
        <span className="font-medium text-gray-300">{row.index + 1}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Имя",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-100">{row.original.name}</p>
        </div>
      ),
    },
    {
      accessorKey: "protocolType",
      header: "Тип протокола",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
          {row.original.protocolType}
        </span>
      ),
    },
    {
      accessorKey: "connectionParams",
      header: "Параметры подключения",
      cell: ({ row }) => (
        <div className="min-w-[300px]">
          {formatConnectionParams(row.original.connectionParams)}
        </div>
      ),
    },
    {
      accessorKey: "pollInterval",
      header: "Интервал опроса",
      cell: ({ row }) => (
        <span className="text-sm text-gray-300">
          {row.original.pollInterval} мс
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${
            row.original.status === "CONNECTED"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {row.original.status === "CONNECTED" ? "Подключено" : "Отключено"}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <ActionButtonGroup>
          <EditButton
            onClick={() => handleEdit(row.original)}
            tooltip="Изменить устройство"
          />
          <DeleteButton
            onClick={() => handleDelete(row.original)}
            tooltip="Удалить устройство"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"Устройства"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Устройства"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] rounded-lg my-[20px] manrope border border-surface-dark bg-background-dark"
      >
        <CustomTable
          data={get(devices, "data.content", [])}
          columns={columns}
        />
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
