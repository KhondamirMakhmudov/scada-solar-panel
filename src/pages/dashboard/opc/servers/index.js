import { useState } from "react";
import useGetQuery from "@/hooks/java/useGetQuery";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import usePostQuery from "@/hooks/java/usePostQuery";
import usePutQuery from "@/hooks/java/usePutQuery";
import { config } from "@/config";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import DeleteModal from "@/components/modal/delete-modal";
import { OPCUAServerModal } from "@/components/modal/opcua-server-modal";
import { OPCUANodeModal } from "@/components/modal/opcua-nodes-modal";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import Link from "next/link";
import usePostPythonQuery from "@/hooks/python/usePostQuery";

const Index = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectServerId, setSelectServerId] = useState(null);
  const [selectNodeId, setSelectNodeId] = useState(null);
  const [editingServer, setEditingServer] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState("");

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const { data: serversResp, isLoading, isFetching } = useGetQuery({
    key: KEYS.OPCServers,
    url: URLS.OPCServers,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const { data: nodesResp } = useGetQuery({
    key: KEYS.OPCNodes,
    url: URLS.OPCNodes,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const { data: nodeChildrenResp, isLoading: isLoadingChildren } = useGetPythonQuery({
    key: [KEYS.OPCNodeChildren, selectedServerId, currentNodeId],
    url: `${URLS.OPCNodeChildren}?serverId=${selectedServerId}&parentNodeId=${currentNodeId}`,
    headers: authHeaders,
    enabled: !!session?.accessToken && !!selectedServerId,
  });

  const { mutate: createServer } = usePostQuery({ listKeyId: KEYS.OPCServers });
  const { mutate: updateServer } = usePutQuery({ listKeyId: KEYS.OPCServers });
  const { mutate: createNode } = usePostQuery({ listKeyId: KEYS.OPCNodes });
  const { mutate: updateNode } = usePutQuery({ listKeyId: KEYS.OPCNodes });
  const { mutate: syncServers } = usePostPythonQuery({
    listKeyId: "sync-servers",
    hideSuccessToast: true,
  });

  const servers = get(serversResp, "data", []);
  const nodes = get(nodesResp, "data.content", []);
  const nodeChildren = get(nodeChildrenResp, "data", []);
  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const serverNodes = selectedServerId
    ? nodes.filter((n) => n.opcServerId === selectedServerId)
    : nodes;

  const handleSyncronize = () => {
    syncServers(
      { url: URLS.syncServers, config: { headers: authHeaders } },
      {
        onSuccess: () => toast.success("Данные успешно синхронизированы"),
        onError: () => toast.error("Синхронизация не удалась"),
      },
    );
  };

  const handleCreateServer = (serverData) => {
    const onSettled = (successMsg, errorMsg) => ({
      onSuccess: () => {
        setIsServerModalOpen(false);
        setEditingServer(null);
        toast.success(successMsg);
      },
      onError: () => toast.error(errorMsg),
    });
    if (editingServer) {
      updateServer(
        { url: `${URLS.OPCServers}/${editingServer.id}`, attributes: serverData, config: { headers: authHeaders } },
        onSettled("OPC UA сервер успешно обновлен", "Не удалось обновить сервер"),
      );
    } else {
      createServer(
        { url: URLS.OPCServers, attributes: serverData, config: { headers: authHeaders } },
        onSettled("OPC UA сервер успешно создан", "Не удалось создать сервер"),
      );
    }
  };

  const handleCreateNode = (nodeData) => {
    const onSettled = (successMsg, errorMsg) => ({
      onSuccess: () => {
        setIsNodeModalOpen(false);
        setEditingNode(null);
        toast.success(successMsg);
      },
      onError: () => toast.error(errorMsg),
    });
    if (editingNode) {
      updateNode(
        { url: `${URLS.OPCNodes}/${editingNode.id}`, attributes: nodeData, config: { headers: authHeaders } },
        onSettled("Узел успешно обновлен", "Не удалось обновить узел"),
      );
    } else {
      createNode(
        { url: URLS.OPCNodes, attributes: nodeData, config: { headers: authHeaders } },
        onSettled("Узел успешно создан", "Не удалось создать узел"),
      );
    }
  };

  const handleDeleteServer = async () => {
    try {
      const response = await fetch(`${config.JAVA_API_URL}${URLS.OPCServers}/${selectServerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      if (!response.ok) throw new Error("Ошибка при удалении");
      setDeleteModal(false);
      setSelectServerId(null);
      if (selectedServerId === selectServerId) setSelectedServerId(null);
      queryClient.invalidateQueries(KEYS.OPCServers);
      toast.success("OPC UA сервер успешно удален");
    } catch (error) {
      toast.error("Не удалось удалить сервер");
    }
  };

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"OPC UA"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"OPC UA"}>
      <div style={{ fontFamily: "'IBM Plex Sans'" }} className="space-y-2.5">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            onClick={() => {
              setEditingServer(null);
              setIsServerModalOpen(true);
            }}
            style={{
              padding: "6px 11px",
              border: "1px solid #3b82f6",
              color: "#3b82f6",
              font: "500 10.5px/1.2 'IBM Plex Mono'",
              cursor: "pointer",
            }}
          >
            + СЕРВЕР
          </span>

          <div style={{ flex: 1 }} />

          <span
            onClick={handleSyncronize}
            style={{
              padding: "6px 11px",
              border: "1px solid #2a2a2a",
              color: "#bfc7d4",
              font: "500 10.5px/1.2 'IBM Plex Mono'",
              cursor: "pointer",
            }}
          >
            СИНХРОНИЗИРОВАТЬ
          </span>
          <Link
            href="/dashboard/opc/servers/status"
            style={{
              padding: "6px 11px",
              border: "1px solid #2a2a2a",
              color: "#bfc7d4",
              font: "500 10.5px/1.2 'IBM Plex Mono'",
              display: "flex",
              alignItems: "center",
            }}
          >
            СТАТУС
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 10, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}>
              <div
                style={{
                  padding: "7px 10px",
                  borderBottom: "1px solid #2a2a2a",
                  font: "600 11px/1 'IBM Plex Sans'",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#bfc7d4",
                }}
              >
                Серверы OPC UA
              </div>
              {servers.length === 0 ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                  Серверы не найдены
                </p>
              ) : (
                servers.map((server) => (
                  <div
                    key={server.id}
                    onClick={() => {
                      setSelectedServerId(server.id);
                      setCurrentNodeId("");
                    }}
                    style={{
                      padding: "6px 10px",
                      borderBottom: "1px solid #232222",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      background: server.id === selectedServerId ? "rgba(59,130,246,0.08)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: server.isConnected ? "#22c55e" : "#ef4444",
                        }}
                      />
                      <span
                        style={{
                          font: "500 11.5px/1.2 'IBM Plex Mono'",
                          color: "#e5e2e1",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {server.name}
                      </span>
                      <span
                        style={{
                          font: "600 9.5px/1.2 'IBM Plex Mono'",
                          color: server.isConnected ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {server.isConnected ? "СВЯЗЬ ЕСТЬ" : "НЕТ СВЯЗИ"}
                      </span>
                    </div>
                    <span
                      style={{
                        font: "400 9.5px/1.2 'IBM Plex Mono'",
                        color: "#7c8290",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {server.endpointUrl}
                    </span>
                    <span style={{ font: "400 9.5px/1.2 'IBM Plex Mono'", color: "#5c6270" }}>
                      {server.nodesCount || 0} узлов
                      <span style={{ margin: "0 4px" }}>·</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingServer(server);
                          setIsServerModalOpen(true);
                        }}
                        style={{ color: "#3b82f6", cursor: "pointer" }}
                      >
                        ИЗМЕНИТЬ
                      </span>
                      <span style={{ margin: "0 4px" }}>·</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectServerId(server.id);
                          setDeleteModal(true);
                        }}
                        style={{ color: "#ef4444", cursor: "pointer" }}
                      >
                        УДАЛИТЬ
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderBottom: "1px solid #2a2a2a",
                }}
              >
                <span
                  style={{
                    font: "600 11px/1 'IBM Plex Sans'",
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: "#bfc7d4",
                  }}
                >
                  Адресное пространство · обзор
                </span>
                {currentNodeId && (
                  <span
                    onClick={() => setCurrentNodeId("")}
                    style={{ font: "500 9.5px/1.2 'IBM Plex Mono'", color: "#3b82f6", cursor: "pointer" }}
                  >
                    КОРЕНЬ
                  </span>
                )}
              </div>
              {!selectedServerId ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                  Выберите сервер выше
                </p>
              ) : isLoadingChildren ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#7c8290", padding: "16px 10px" }}>Загрузка…</p>
              ) : nodeChildren.length === 0 ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                  Нет доступных узлов
                </p>
              ) : (
                <div style={{ maxHeight: 240, overflowY: "auto" }}>
                  {nodeChildren.map((node, index) => (
                    <div
                      key={index}
                      onClick={() => node.hasChildren && setCurrentNodeId(node.nodeId)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 10px",
                        borderBottom: "1px solid #232222",
                        cursor: node.hasChildren ? "pointer" : "default",
                        textAlign: "left",
                      }}
                    >
                      {node.hasChildren ? (
                        <FolderOutlinedIcon sx={{ fontSize: 14, color: "#f59e0b", flexShrink: 0 }} />
                      ) : (
                        <InsertDriveFileOutlinedIcon sx={{ fontSize: 14, color: "#5c6270", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          font: "400 11px/1.2 'IBM Plex Mono'",
                          color: "#bfc7d4",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.displayName || node.browseName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "#1c1b1b", border: "1px solid #2a2a2a" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                borderBottom: "1px solid #2a2a2a",
              }}
            >
              <span
                style={{
                  font: "600 11px/1 'IBM Plex Sans'",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#bfc7d4",
                }}
              >
                Отслеживаемые узлы {selectedServer ? `· ${selectedServer.name}` : ""}
              </span>
              <span
                onClick={() => {
                  setEditingNode(null);
                  setIsNodeModalOpen(true);
                }}
                style={{ font: "500 10px/1.2 'IBM Plex Mono'", color: "#3b82f6", cursor: "pointer" }}
              >
                + ДОБАВИТЬ
              </span>
            </div>
            {serverNodes.length === 0 ? (
              <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                Узлы не найдены
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Node ID", "Имя", "Тип данных", "Значение", "Статус", "Действия"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 10px",
                          font: "600 9.5px/1.2 'IBM Plex Sans'",
                          letterSpacing: ".05em",
                          textTransform: "uppercase",
                          color: "#7c8290",
                          textAlign: i === 5 ? "right" : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serverNodes.map((node) => {
                    const value = node.currentValue;
                    const multiplier = node.multiplier || 1;
                    const offset = node.offsetValue || 0;
                    const calculated =
                      value !== null && value !== undefined
                        ? (parseFloat(value) * multiplier + offset).toFixed(2)
                        : "—";
                    return (
                      <tr key={node.id} style={{ borderBottom: "1px solid #232222" }}>
                        <td
                          style={{
                            padding: "5px 10px",
                            font: "400 10.5px/1.2 'IBM Plex Mono'",
                            color: "#7c8290",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 180,
                          }}
                        >
                          {node.nodeId}
                        </td>
                        <td style={{ padding: "5px 10px", font: "500 11.5px/1.2 'IBM Plex Sans'", color: "#e5e2e1" }}>
                          {node.name}
                        </td>
                        <td style={{ padding: "5px 10px", font: "400 10.5px/1.2 'IBM Plex Mono'", color: "#7c8290" }}>
                          {node.dataType}
                        </td>
                        <td style={{ padding: "5px 10px", font: "500 11.5px/1.2 'IBM Plex Mono'", color: "#e5e2e1", textAlign: "right" }}>
                          {calculated} {node.unit || ""}
                        </td>
                        <td style={{ padding: "5px 10px", font: "500 9.5px/1.2 'IBM Plex Mono'" }}>
                          {node.saveToDb && <span style={{ color: "#3b82f6", marginRight: 6 }}>DB</span>}
                          {node.sendToClient && <span style={{ color: "#22c55e" }}>WS</span>}
                          {!node.saveToDb && !node.sendToClient && <span style={{ color: "#5c6270" }}>—</span>}
                        </td>
                        <td style={{ padding: "5px 10px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, font: "500 10px/1.2 'IBM Plex Mono'" }}>
                            <span
                              onClick={() => {
                                setEditingNode(node);
                                setIsNodeModalOpen(true);
                              }}
                              style={{ color: "#3b82f6", cursor: "pointer" }}
                            >
                              ИЗМЕНИТЬ
                            </span>
                            <span style={{ color: "#5c6270" }}>·</span>
                            <span
                              onClick={() => {
                                setSelectNodeId(node.id);
                                setDeleteModal(true);
                              }}
                              style={{ color: "#ef4444", cursor: "pointer" }}
                            >
                              УДАЛИТЬ
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isServerModalOpen && (
        <OPCUAServerModal
          isOpen={isServerModalOpen}
          onClose={() => {
            setIsServerModalOpen(false);
            setEditingServer(null);
          }}
          onSubmit={handleCreateServer}
          editServer={editingServer}
        />
      )}

      {isNodeModalOpen && (
        <OPCUANodeModal
          isOpen={isNodeModalOpen}
          onClose={() => {
            setIsNodeModalOpen(false);
            setEditingNode(null);
          }}
          onSubmit={handleCreateNode}
          editNode={editingNode}
          servers={servers}
          nodeChildren={nodeChildrenResp}
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
          setSelectServerId(null);
          setSelectNodeId(null);
        }}
        deleting={() => {
          if (selectServerId) handleDeleteServer();
          else if (selectNodeId) {
            fetch(`${config.JAVA_API_URL}${URLS.OPCNodes}/${selectNodeId}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", ...authHeaders },
            })
              .then((res) => {
                if (!res.ok) throw new Error();
                queryClient.invalidateQueries(KEYS.OPCNodes);
                toast.success("Узел успешно удален");
              })
              .catch(() => toast.error("Не удалось удалить узел"))
              .finally(() => {
                setDeleteModal(false);
                setSelectNodeId(null);
              });
          }
        }}
        title="Вы уверены, что хотите удалить эту запись?"
      />
    </DashboardLayout>
  );
};

export default Index;
