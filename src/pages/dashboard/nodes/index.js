import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { URLS } from "@/constants/url";
import { KEYS } from "@/constants/key";
import { get } from "lodash";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TuneIcon from "@mui/icons-material/Tune";
import StorageIcon from "@mui/icons-material/Storage";
import LinkIcon from "@mui/icons-material/Link";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LabelIcon from "@mui/icons-material/Label";
import CircleIcon from "@mui/icons-material/Circle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentLoader from "@/components/loader";
import usePostPythonQuery from "@/hooks/python/usePostQuery";
import PrimaryButton from "@/components/button";
import MethodModal from "@/components/modal/method-modal";
import Input from "@/components/input";
import { Button } from "@mui/material";
import CustomSelect from "@/components/select";
import { config } from "@/config";

const typeOfNodes = ["BOOL", "INT", "FLOAT", "STRING"];

const Index = () => {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editingNode, setEditingNode] = useState(null);
  const [formDataNode, setFormDataNode] = useState({
    name: "",
    type: "",
    identifier: "",
    node_id: "",
    units: "",
    description: "",
  });

  // get nodes
  const {
    data: nodes,
    isLoading,
    isFetching,
    refetch: refetchNodes,
  } = useGetPythonQuery({
    key: KEYS.nodes,
    url: URLS.nodes,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // get connect
  const {
    data: connects,
    isLoading: isLoadingConnects,
    isFetching: isFetchingConnects,
  } = useGetPythonQuery({
    key: [KEYS.connects, showCreateModal, showEditModal],
    url: URLS.connects,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken && (showCreateModal || showEditModal),
  });

  const connectOptions = get(connects, "data.data", [])?.map((connect) => ({
    label: connect.name,
    value: connect.id,
  }));

  const typeOptions = typeOfNodes.map((type) => ({
    label: type,
    value: type,
  }));

  // create node
  const { mutate: createNode } = usePostPythonQuery({
    listKeyId: "create-node",
  });

  const handleCreateNode = () => {
    createNode(
      {
        url: URLS.nodes,
        attributes: formDataNode,
        config: {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setFormDataNode({
            name: "",
            type: "",
            identifier: "",
            node_id: "",
            units: "",
            description: "",
          });
          refetchNodes();
        },
      }
    );
  };

  const handleEditNode = async () => {
    try {
      const response = await fetch(`${URLS.nodes}/${editingNode.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formDataNode),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingNode(null);
        setFormDataNode({
          name: "",
          type: "",
          identifier: "",
          node_id: "",
          units: "",
          description: "",
        });
        refetchNodes();
      }
    } catch (error) {
      console.error("Error updating node:", error);
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (!confirm("Вы уверены, что хотите удалить этот узел?")) return;

    try {
      const response = await fetch(
        `${config.PYTHON_API_URL}${URLS.nodes}${nodeId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
            Accept: "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error deleting node:", error);
    }
  };

  const openEditModal = (node) => {
    setEditingNode(node);
    setFormDataNode({
      name: node.name,
      type: node.type,
      identifier: node.identifier,
      node_id: node.node_id || "",
      units: node.units,
      description: node.description,
    });
    setShowEditModal(true);
  };

  const filteredNodes = get(nodes, "data.data", [])?.filter((node) => {
    const matchesSearch =
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.identifier.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const handleChangeNode = (e) => {
    const { name, value } = e.target;
    setFormDataNode((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormDataNode({
      name: "",
      type: "",
      identifier: "",
      node_id: "",
      units: "",
      description: "",
    });
  };

  return (
    <DashboardLayout headerTitle={"Узлы"}>
      <div className="min-h-screen bg-[#1A132A] p-6 manrope my-[15px] rounded-md border border-[#555555]">
        <PrimaryButton onClick={() => setShowCreateModal(true)}>
          Создать узел
        </PrimaryButton>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="my-8"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-2xl">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию, описанию или идентификатору..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#1F2937] border border-[#6E39CB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#6E39CB] focus:ring-2 focus:ring-[#6E39CB]/20 transition-all"
              />
            </div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex gap-4 text-sm text-gray-400"
          >
            <span>Всего узлов: {get(nodes, "data.data", [])?.length || 0}</span>
            <span>Отфильтровано: {filteredNodes?.length || 0}</span>
          </motion.div>
        </motion.div>

        {/* Loading State */}
        {(isLoading || isFetching) && <ContentLoader />}

        {/* Nodes Grid */}
        {!isLoading && !isFetching && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredNodes?.map((node) => (
                <motion.div
                  key={node.id}
                  variants={cardVariants}
                  layout
                  className="bg-gradient-to-br from-[#2A1F3C] to-[#1F2937] rounded-xl border border-[#6E39CB]/30 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-[#6E39CB]/20 transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-[#6E39CB]/20 relative">
                    {/* Action Buttons - Top Right Corner */}
                    <div className="absolute top-4 right-4 flex gap-1">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openEditModal(node)}
                        className="group relative p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10  hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/30 hover:border-orange-400/50 transition-all duration-200"
                        title="Редактировать"
                      >
                        <EditIcon
                          className="text-orange-400 group-hover:text-orange-300 transition-colors"
                          style={{ fontSize: 18 }}
                        />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteNode(node.id)}
                        className="group relative p-2 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30 hover:border-red-400/50 transition-all duration-200"
                        title="Удалить"
                      >
                        <DeleteIcon
                          className="text-red-400 group-hover:text-red-300 transition-colors"
                          style={{ fontSize: 18 }}
                        />
                      </motion.button>
                    </div>

                    <div className="flex items-start justify-between mb-3 pr-24">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#6E39CB]/20 rounded-lg flex items-center justify-center">
                          <StorageIcon className="text-[#6E39CB]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white uppercase">
                            {node.name}
                          </h3>
                          <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <LabelIcon style={{ fontSize: 14 }} />
                            {node.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-3">
                      {node.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-[#6E39CB]/20 text-[#6E39CB] rounded-full text-xs font-medium">
                          {node.units}
                        </span>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
                          <CircleIcon style={{ fontSize: 8 }} />
                          {node.connects?.length || 0} подключений
                        </span>
                      </div>

                      {/* Expand/Collapse Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setExpandedCard(
                            expandedCard === node.id ? null : node.id
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6E39CB]/10 hover:bg-[#6E39CB]/20 border border-[#6E39CB]/30 hover:border-[#6E39CB]/50 transition-all duration-200"
                      >
                        <span className="text-[#6E39CB] text-xs font-medium">
                          {expandedCard === node.id ? "Скрыть" : "Подробнее"}
                        </span>
                        {expandedCard === node.id ? (
                          <KeyboardArrowUpIcon
                            className="text-[#6E39CB]"
                            style={{ fontSize: 18 }}
                          />
                        ) : (
                          <KeyboardArrowDownIcon
                            className="text-[#6E39CB]"
                            style={{ fontSize: 18 }}
                          />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Card Body - Expandable */}
                  <AnimatePresence>
                    {expandedCard === node.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-4">
                          {/* Node Details */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                              <TuneIcon
                                className="text-gray-400 mt-0.5"
                                style={{ fontSize: 18 }}
                              />
                              <div>
                                <span className="text-gray-400">
                                  Идентификатор:
                                </span>
                                <p className="text-white font-mono text-xs break-all mt-1">
                                  {node.identifier}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarTodayIcon
                                className="text-gray-400"
                                style={{ fontSize: 18 }}
                              />
                              <span className="text-gray-400">Создан:</span>
                              <span className="text-white">
                                {new Date(node.created_at).toLocaleDateString(
                                  "ru-RU"
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Connections */}
                          {node.connects && node.connects.length > 0 && (
                            <div>
                              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <LinkIcon style={{ fontSize: 18 }} />
                                Подключения ({node.connects.length})
                              </h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {node.connects.map((conn, idx) => (
                                  <motion.div
                                    key={conn.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-[#1F2937] p-3 rounded-lg border border-[#6E39CB]/20 hover:border-[#6E39CB]/50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-white font-medium">
                                        {conn.name}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        Port: {conn.port}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-400 space-y-1">
                                      <div>IP: {conn.ip}</div>
                                      <div>User: {conn.username}</div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !isFetching && filteredNodes?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400"
          >
            <StorageIcon style={{ fontSize: 64 }} className="mb-4 opacity-50" />
            <p className="text-xl">Узлы не найдены</p>
            <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
          </motion.div>
        )}

        {/* Create Modal */}
        <MethodModal
          open={showCreateModal}
          showCloseIcon={true}
          closeClick={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title={"Добавить узел к коннекту"}
        >
          <div className="space-y-[20px] manrope my-[10px]">
            <Input
              placeholder={"Название"}
              name={"name"}
              label={"Название"}
              value={formDataNode.name}
              onChange={handleChangeNode}
            />

            <CustomSelect
              label={"Подключение"}
              placeholder={"Выберите подключение"}
              options={connectOptions}
              name="node_id"
              value={formDataNode.node_id}
              onChange={(value) =>
                setFormDataNode((prev) => ({
                  ...prev,
                  node_id: value,
                }))
              }
            />
            <div className="flex gap-2">
              <Input
                placeholder={"Единицы измерения"}
                label={"Единицы измерения"}
                name="units"
                classNames="w-1/2"
                type="text"
                value={formDataNode.units}
                onChange={handleChangeNode}
              />

              <CustomSelect
                label={"Тип"}
                placeholder={"Выберите тип"}
                options={typeOptions}
                name="type"
                classNames="w-1/2"
                value={formDataNode.type}
                onChange={(value) =>
                  setFormDataNode((prev) => ({
                    ...prev,
                    type: value,
                  }))
                }
              />
            </div>

            <Input
              label={"Идентификатор"}
              placeholder={"Идентификатор"}
              name="identifier"
              type="text"
              value={formDataNode.identifier}
              onChange={handleChangeNode}
            />
            <Input
              label={"Описание"}
              name="description"
              placeholder={"Описание"}
              type="text"
              value={formDataNode.description}
              onChange={handleChangeNode}
            />

            <Button
              onClick={handleCreateNode}
              sx={{
                backgroundColor: "#6E39CB",
                color: "#FFFFFF",
                height: "45px",
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "17px",
                fontWeight: "600",
                width: "100%",
                fontFamily: "Manrope, sans-serif",
                "&:hover": {
                  backgroundColor: "#5b2bb3",
                },
              }}
            >
              Добавить
            </Button>
          </div>
        </MethodModal>

        {/* Edit Modal */}
        <MethodModal
          open={showEditModal}
          showCloseIcon={true}
          closeClick={() => {
            setShowEditModal(false);
            setEditingNode(null);
            resetForm();
          }}
          title={"Редактировать узел"}
        >
          <div className="space-y-[20px] manrope my-[10px]">
            <Input
              placeholder={"Название"}
              name={"name"}
              label={"Название"}
              value={formDataNode.name}
              onChange={handleChangeNode}
            />

            <CustomSelect
              label={"Подключение"}
              placeholder={"Выберите подключение"}
              options={connectOptions}
              name="node_id"
              value={formDataNode.node_id}
              onChange={(value) =>
                setFormDataNode((prev) => ({
                  ...prev,
                  node_id: value,
                }))
              }
            />
            <div className="flex gap-2">
              <Input
                placeholder={"Единицы измерения"}
                label={"Единицы измерения"}
                name="units"
                classNames="w-1/2"
                type="text"
                value={formDataNode.units}
                onChange={handleChangeNode}
              />

              <CustomSelect
                label={"Тип"}
                placeholder={"Выберите тип"}
                options={typeOptions}
                name="type"
                classNames="w-1/2"
                value={formDataNode.type}
                onChange={(value) =>
                  setFormDataNode((prev) => ({
                    ...prev,
                    type: value,
                  }))
                }
              />
            </div>

            <Input
              label={"Идентификатор"}
              placeholder={"Идентификатор"}
              name="identifier"
              type="text"
              value={formDataNode.identifier}
              onChange={handleChangeNode}
            />
            <Input
              label={"Описание"}
              name="description"
              placeholder={"Описание"}
              type="text"
              value={formDataNode.description}
              onChange={handleChangeNode}
            />

            <Button
              onClick={handleEditNode}
              sx={{
                backgroundColor: "#6E39CB",
                color: "#FFFFFF",
                height: "45px",
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "17px",
                fontWeight: "600",
                width: "100%",
                fontFamily: "Manrope, sans-serif",
                "&:hover": {
                  backgroundColor: "#5b2bb3",
                },
              }}
            >
              Сохранить
            </Button>
          </div>
        </MethodModal>
      </div>
    </DashboardLayout>
  );
};

export default Index;
