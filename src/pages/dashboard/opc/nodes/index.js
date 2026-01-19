import { useState } from "react";
import useGetQuery from "@/hooks/java/useGetQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { motion } from "framer-motion";
import CustomTable from "@/components/table";
import { get, isEmpty } from "lodash";
import ContentLoader from "@/components/loader";
import usePostPythonQuery from "@/hooks/python/usePostQuery";
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
import { Tooltip } from "@mui/material";
import ToggleButton from "@/components/button/toggle-button";
import { OPCUANodeModal } from "@/components/modal/opcua-nodes-modal";
import NoData from "@/components/no-data";
import useGetPythonQuery from "@/hooks/python/useGetQuery";

const Index = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectNodeId, setSelectNodeId] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState("");

  // nodes
  const {
    data: nodes,
    isLoading,
    isFetching,
  } = useGetQuery({
    key: KEYS.OPCNodes,
    url: URLS.OPCNodes,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // servers
  const { data: servers } = useGetQuery({
    key: KEYS.OPCServers,
    url: URLS.OPCServers,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const { data: nodeChildren, isLoading: isLoadingChildren } =
    useGetPythonQuery({
      key: [KEYS.OPCNodeChildren, selectedServerId, currentNodeId],
      url: `${URLS.OPCNodeChildren}?serverId=${selectedServerId}&nodeId=${currentNodeId}`,
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
        Accept: "application/json",
      },
      enabled: !!session?.accessToken && !!selectedServerId,
    });
  // create node
  const { mutate: createNode } = usePostQuery({
    listKeyId: KEYS.OPCNodes,
  });

  const handleCreate = (nodeData) => {
    if (editingNode) {
      // Обновить существующий узел
      updateNode(
        {
          url: `${URLS.OPCNodes}/${editingNode.id}`,
          attributes: nodeData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingNode(null);
            toast.success("Узел OPC UA успешно обновлен");
          },
          onError: (error) => {
            console.error("Update error:", error);
            toast.error("Не удалось обновить узел OPC UA");
          },
        }
      );
    } else {
      // Создать новый узел
      createNode(
        {
          url: URLS.OPCNodes,
          attributes: nodeData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            toast.success("Узел OPC UA успешно создан");
          },
          onError: (error) => {
            console.error("Create error:", error);
            toast.error("Не удалось создать узел OPC UA");
          },
        }
      );
    }
  };

  // edit node
  const { mutate: updateNode } = usePutQuery({
    listKeyId: KEYS.OPCNodes,
  });

  const handleEdit = (node) => {
    setEditingNode(node);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingNode(null);
  };

  // delete node
  const handleDelete = async () => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.OPCNodes}/${selectNodeId}`,
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
      setSelectNodeId(null);
      queryClient.invalidateQueries(KEYS.OPCNodes);
      toast.success("Узел OPC UA успешно удален");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось удалить узел OPC UA");
    }
  };

  // Переключить статус saveToDb
  const handleToggleSaveToDb = async (nodeId) => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.OPCNodes}/${nodeId}/toggle-save`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при переключении статуса сохранения");
      }

      queryClient.invalidateQueries(KEYS.OPCNodes);
      toast.success("Статус сохранения успешно изменен");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось изменить статус сохранения");
    }
  };

  // Переключить статус sendToClient
  const handleToggleSendToClient = async (nodeId) => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.OPCNodes}/${nodeId}/toggle-send`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при переключении статуса отправки");
      }

      queryClient.invalidateQueries(KEYS.OPCNodes);
      toast.success("Статус отправки успешно изменен");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось изменить статус отправки");
    }
  };

  // Получить имя сервера по ID
  const getServerName = (serverId) => {
    const server = get(servers, "data", []).find((s) => s.id === serverId);
    return server ? server.name : "Неизвестно";
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
      header: "Название узла",
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
      accessorKey: "opcServerId",
      header: "OPC Сервер",
      cell: ({ row }) => (
        <span className="text-sm text-gray-300">
          {getServerName(row.original.opcServerId)}
        </span>
      ),
    },
    {
      accessorKey: "nodeId",
      header: "Node ID",
      cell: ({ row }) => (
        <Tooltip title={row.original.nodeId} placement="top">
          <span className="text-sm text-gray-300 truncate max-w-[150px] block">
            {row.original.nodeId}
          </span>
        </Tooltip>
      ),
    },
    {
      accessorKey: "dataType",
      header: "Тип данных",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          {row.original.dataType}
        </span>
      ),
    },
    {
      accessorKey: "value",
      header: "Значение",
      cell: ({ row }) => {
        const value = row.original.currentValue;
        const multiplier = row.original.multiplier || 1;
        const offset = row.original.offsetValue || 0;
        const unit = row.original.unit || "";

        // Применяем формулу: (value * multiplier) + offset
        const calculatedValue =
          value !== null && value !== undefined
            ? (parseFloat(value) * multiplier + offset).toFixed(2)
            : "-";

        return (
          <span className="text-sm text-gray-300">
            {calculatedValue} {unit}
          </span>
        );
      },
    },
    {
      accessorKey: "saveToDb",
      header: "Сохранять в БД",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <ToggleButton
            enabled={row.original.saveToDb}
            onClick={() => handleToggleSaveToDb(row.original.id)}
            tooltip={
              row.original.saveToDb
                ? "Отключить сохранение в БД"
                : "Включить сохранение в БД"
            }
          />
        </div>
      ),
    },
    {
      accessorKey: "sendToClient",
      header: "Отправлять клиенту",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <ToggleButton
            enabled={row.original.sendToClient}
            onClick={() => handleToggleSendToClient(row.original.id)}
            tooltip={
              row.original.sendToClient
                ? "Отключить отправку клиенту"
                : "Включить отправку клиенту"
            }
          />
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <ActionButtonGroup>
          <EditButton
            onClick={() => handleEdit(row.original)}
            tooltip="Изменить узел"
          />
          <DeleteButton
            onClick={() => {
              setSelectNodeId(row.original.id);
              setDeleteModal(true);
            }}
            tooltip="Удалить узел"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"Узлы OPC UA"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  // Подсчитываем активные узлы
  const activeNodes = get(nodes, "data.content", []).filter(
    (node) => node.saveToDb || node.sendToClient
  ).length;

  return (
    <DashboardLayout headerTitle={"Узлы OPC UA"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] rounded-lg my-[20px] manrope border border-surface-dark bg-background-dark"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Узлы OPC UA</h2>
            <p className="text-sm text-gray-400 mt-1">
              Всего узлов: {get(nodes, "data", []).length} | Активных:{" "}
              {activeNodes}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg h-10 px-5 bg-primary text-background-dark text-sm font-bold font-display hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
          >
            <span>Добавить узел</span>
          </button>
        </div>

        {isEmpty(get(nodes, "data.content", [])) ? (
          <NoData />
        ) : (
          <CustomTable
            data={get(nodes, "data.content", [])}
            columns={columns}
          />
        )}
      </motion.div>

      {/* Модальное окно для создания/редактирования узла */}
      {isModalOpen && (
        <OPCUANodeModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleCreate}
          editNode={editingNode}
          servers={get(servers, "data", [])}
          nodeChildren={nodeChildren}
          isLoadingChildren={isLoadingChildren}
          onServerChange={setSelectedServerId}
          onNodeIdChange={setCurrentNodeId}
          currentNodeId={currentNodeId}
          selectedServerId={selectedServerId}
        />
      )}

      <DeleteModal
        open={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setSelectNodeId(null);
        }}
        deleting={() => {
          handleDelete();
        }}
        title="Вы уверены, что хотите удалить этот узел?"
        description="Это действие нельзя отменить. Все связанные данные будут удалены."
      />
    </DashboardLayout>
  );
};

export default Index;
