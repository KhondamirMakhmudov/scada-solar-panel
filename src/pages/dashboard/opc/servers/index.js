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
import ToggleButton from "@/components/button/toggle-button";
import { OPCUAServerModal } from "@/components/modal/opcua-server-modal";
import Link from "next/link";

const Index = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectServerId, setSelectServerId] = useState(null);
  const [editingServer, setEditingServer] = useState(null);

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

  // Получить активные серверы (дополнительный запрос)
  const { data: enabledServers } = useGetQuery({
    key: [KEYS.OPCServers, "enabled"],
    url: `${URLS.OPCServers}/enabled`,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Создать OPC UA сервер
  const { mutate: createServer } = usePostQuery({
    listKeyId: KEYS.OPCServers,
  });

  const handleCreate = (serverData) => {
    if (editingServer) {
      // Обновить существующий сервер
      updateServer(
        {
          url: `${URLS.OPCServers}/${editingServer.id}`,
          attributes: serverData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingServer(null);
            toast.success("OPC UA сервер успешно обновлен");
          },
          onError: (error) => {
            console.error("Update error:", error);
            toast.error("Не удалось обновить OPC UA сервер");
          },
        }
      );
    } else {
      // Создать новый сервер
      createServer(
        {
          url: URLS.OPCServers,
          attributes: serverData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            toast.success("OPC UA сервер успешно создан");
          },
          onError: (error) => {
            console.error("Create error:", error);
            toast.error("Не удалось создать OPC UA сервер");
          },
        }
      );
    }
  };

  const handleSyncronize = () => {
    syncDevices(
      {
        url: URLS.syncDevices,
        config: {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("Данные успешно синхронизированы");
        },
        onError: () => {
          toast.error("Синхронизация устройства не удалась");
        },
      }
    );
  };

  // Редактировать сервер
  const { mutate: updateServer } = usePutQuery({
    listKeyId: KEYS.OPCServers,
  });

  const handleEdit = (server) => {
    setEditingServer(server);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingServer(null);
  };

  // Удалить сервер
  const handleDelete = async () => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.OPCServers}/${selectServerId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      setDeleteModal(false);
      setSelectServerId(null);
      queryClient.invalidateQueries(KEYS.OPCServers);
      toast.success("OPC UA сервер успешно удален");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось удалить OPC UA сервер");
    }
  };

  // Переключить статус сервера (включить/выключить)
  const handleToggleEnabled = async (serverId) => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.OPCServers}/${serverId}/toggle`,
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

      queryClient.invalidateQueries(KEYS.OPCServers);
      toast.success("Статус сервера успешно изменен");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось изменить статус сервера");
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
      header: "Имя сервера",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-100">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-gray-400 mt-1">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },

    {
      accessorKey: "endpointUrl",
      header: "URL конечной точки",
      cell: ({ row }) => (
        <span className="text-sm text-gray-300">
          {row.original.endpointUrl || "-"}
        </span>
      ),
    },
    {
      accessorKey: "pollInterval",
      header: "Интервал опроса",

      accessorKey: "username",
      header: "Имя пользователья",

      cell: ({ row }) => (
        <span className="text-sm text-gray-300">
          {row.original.username || "-"}
        </span>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Активен",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <ToggleButton
            enabled={row.original.enabled}
            onClick={() => handleToggleEnabled(row.original.id)}
            tooltip={
              row.original.enabled ? "Отключить сервер" : "Включить сервер"
            }
          />
        </div>
      ),
    },
    {
      accessorKey: "isConnected",
      header: "Статус соединения",
      cell: ({ row }) => {
        const getStatusInfo = (isConnected) => {
          // Проверяем также на undefined/null для надежности
          if (isConnected === true) {
            return {
              text: "Подключен",
              color: "bg-primary/10 text-primary border-primary/30",
            };
          } else if (isConnected === false) {
            return {
              text: "Отключен",
              color: "bg-red-500/10 text-red-400 border-red-500/30",
            };
          } else {
            // Для null, undefined или других неожиданных значений
            return {
              text: "Неизвестно",
              color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
            };
          }
        };

        const statusInfo = getStatusInfo(row.original.isConnected);

        return (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold border ${statusInfo.color}`}
          >
            {statusInfo.text}
          </span>
        );
      },
    },
    {
      accessorKey: "nodesCount",
      header: "Узлы",
      cell: ({ row }) => (
        <span className="text-sm text-gray-300">
          {row.original.nodesCount || 0}
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
            tooltip="Изменить сервер"
          />
          <DeleteButton
            onClick={() => {
              setSelectServerId(row.original.id);
              setDeleteModal(true);
            }}
            tooltip="Удалить сервер"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"OPC UA Серверы"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"OPC UA Серверы"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] rounded-lg my-[20px] manrope border border-surface-dark bg-background-dark"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">
              OPC UA Серверы
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Всего серверов: {get(servers, "data", []).length} | Активных:{" "}
              {get(enabledServers, "data", []).length}
            </p>
          </div>
        </div>

        <div className="mb-2 flex justify-between">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg h-10 px-5 bg-primary text-background-dark text-sm font-bold font-display hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
          >
            <span>Добавить OPC UA сервер</span>
          </button>

          <div className="flex gap-2">
            <button
              // onClick={handleSyncronize}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg h-10 px-5 bg-primary text-background-dark text-sm font-bold font-display hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
            >
              <span className="material-symbols-outlined">sync</span>
              <span>Синхронизировать</span>
            </button>

            <Link
              href={"/dashboard/modbus/devices/status"}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-black rounded-lg transition-colors duration-200 font-medium text-sm"
            >
              <span className="material-symbols-outlined">bar_chart</span>
              Статус устройств
            </Link>
          </div>
        </div>

        <CustomTable data={get(servers, "data", [])} columns={columns} />
      </motion.div>

      {/* Модальное окно для создания/редактирования OPC UA сервера */}
      {isModalOpen && (
        <OPCUAServerModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleCreate}
          editServer={editingServer}
        />
      )}

      <DeleteModal
        open={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setSelectServerId(null);
        }}
        deleting={() => {
          handleDelete();
        }}
        title="Вы уверены, что хотите удалить этот OPC UA сервер?"
        description="Это действие нельзя отменить. Все связанные узлы и данные будут удалены."
      />
    </DashboardLayout>
  );
};

export default Index;
