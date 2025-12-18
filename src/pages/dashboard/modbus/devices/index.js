import { useState } from "react";
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
import usePostQuery from "@/hooks/java/usePostQuery";
import usePutQuery from "@/hooks/java/usePutQuery";
import { config } from "@/config";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import DeleteModal from "@/components/modal/delete-modal";
import { DeviceModal } from "@/components/modal/device-modal";
import { Tooltip } from "@mui/material";
import ToggleButton from "@/components/button/toggle-button";

const Index = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectDeviceId, setSelectDeviceId] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);

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
    enabled: !!session?.accessToken,
  });

  // create device
  const { mutate: createDevice } = usePostQuery({
    listKeyId: KEYS.MODBUSDevices,
  });

  const handleCreate = (deviceData) => {
    if (editingDevice) {
      // Update existing device
      updateDevice(
        {
          url: `${URLS.MODBUSDevices}/${editingDevice.id}`,
          attributes: deviceData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingDevice(null);
            toast.success("Устройство успешно обновлено");
          },
          onError: (error) => {
            console.error("Update error:", error);
            toast.error("Не удалось обновить устройство");
          },
        }
      );
    } else {
      // Create new device
      createDevice(
        {
          url: URLS.MODBUSDevices,
          attributes: deviceData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            toast.success("Устройство успешно создано");
          },
          onError: (error) => {
            console.error("Create error:", error);
            toast.error("Не удалось создать устройство");
          },
        }
      );
    }
  };
  // edit device
  const { mutate: updateDevice } = usePutQuery({
    listKeyId: KEYS.MODBUSDevices,
  });
  const handleEdit = (device) => {
    setEditingDevice(device);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
  };
  // delete device
  const handleDelete = async () => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.MODBUSDevices}/${selectDeviceId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ selectDeviceId }),
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      let result = null;

      if (response.status !== 204) {
        result = await response.json();
        console.log("Deleted:", result);
      }
      setDeleteModal(false);
      setSelectDeviceId(null);
      queryClient.invalidateQueries(KEYS.MODBUSDevices);
      toast.success("Устройство успешно удалено");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось удалить");
    }
  };

  // toggle enabled
  const handleToggleEnabled = async (deviceId) => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.MODBUSDevices}/${deviceId}/toggle`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при переключении статуса");
      }

      queryClient.invalidateQueries(KEYS.MODBUSDevices);
      toast.success("Статус устройства успешно изменен");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось изменить статус устройства");
    }
  };

  const formatConnectionParams = (paramsString) => {
    try {
      const params = JSON.parse(paramsString);
      return (
        <div className="flex flex-wrap gap-2">
          {params.host && (
            <Tooltip title="IP-адрес целевого устройства:сетевой порт для установления соединения">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-primary/20 text-primary">
                {params.host}:{params.port}
              </span>
            </Tooltip>
          )}
          {params.timeout && (
            <Tooltip title="допустимое время ожидания ответа">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-orange-500/20 text-orange-400">
                {params.timeout}
              </span>
            </Tooltip>
          )}
          {params.comPort && (
            <Tooltip title="последовательный интерфейс подключения (COM-порт)">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-primary/20 text-primary">
                {params.comPort}
              </span>
            </Tooltip>
          )}
          {params.baudRate && (
            <Tooltip title="скорость передачи данных ">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-purple-500/20 text-purple-400">
                {params.baudRate}
              </span>
            </Tooltip>
          )}
          {params.dataBits && (
            <Tooltip title="количество информационных бит / количество стоп-битов кадра">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-orange-500/20 text-orange-400">
                {params.dataBits}/{params.stopBits}
              </span>
            </Tooltip>
          )}
          {params.parity && (
            <Tooltip title="тип контроля чётности">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-blue-500/20 text-blue-400">
                {params.parity}
              </span>
            </Tooltip>
          )}
          <Tooltip title="сетевой адрес ведомого устройства (Modbus ID)">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-pink-500/20 text-pink-400">
              Slave: {params.slaveId}
            </span>
          </Tooltip>
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
      accessorKey: "enabled", // Add this column for enabled status
      header: "Активно",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <ToggleButton
            enabled={row.original.enabled}
            onClick={() => handleToggleEnabled(row.original.id)}
            tooltip={
              row.original.enabled
                ? "Отключить устройство"
                : "Включить устройство"
            }
          />
        </div>
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
            onClick={() => {
              setSelectDeviceId(row.original.id);
              setDeleteModal(true);
            }}
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
        <div className="mb-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg h-10 px-5 bg-primary text-background-dark text-sm font-bold font-display hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
          >
            <span>Добавить устройство</span>
          </button>
        </div>
        <CustomTable
          data={get(devices, "data.content", [])}
          columns={columns}
        />
      </motion.div>

      <DeviceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleCreate}
        editDevice={editingDevice}
      />

      <DeleteModal
        open={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setSelectDeviceId(null);
        }}
        deleting={() => {
          handleDelete();
        }}
        title="Вы уверены, что хотите удалить это устройство?"
      />
    </DashboardLayout>
  );
};

export default Index;
