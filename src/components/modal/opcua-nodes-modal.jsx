import CustomSelect from "@/components/select";
import Input from "@/components/input";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export const OPCUANodeModal = ({
  isOpen,
  onClose,
  onSubmit,
  editNode = null,
  servers = [], // List of available OPC UA servers
}) => {
  const [formData, setFormData] = useState({
    opcServerId: "",
    nodeId: "",
    name: "",
    description: "",
    dataType: "Double",
    multiplier: 1,
    offsetValue: 0,
    unit: "",
    saveToDb: true,
    sendToClient: true,
  });

  const dataTypeOptions = [
    { label: "Boolean", value: "Boolean" },
    { label: "SByte", value: "SByte" },
    { label: "Byte", value: "Byte" },
    { label: "Int16", value: "Int16" },
    { label: "UInt16", value: "UInt16" },
    { label: "Int32", value: "Int32" },
    { label: "UInt32", value: "UInt32" },
    { label: "Int64", value: "Int64" },
    { label: "UInt64", value: "UInt64" },
    { label: "Float", value: "Float" },
    { label: "Double", value: "Double" },
    { label: "String", value: "String" },
    { label: "DateTime", value: "DateTime" },
  ];

  // Populate form when editing
  useEffect(() => {
    if (editNode) {
      setFormData({
        opcServerId: editNode.opcServerId || "",
        nodeId: editNode.nodeId || "",
        name: editNode.name || "",
        description: editNode.description || "",
        dataType: editNode.dataType || "Double",
        multiplier: editNode.multiplier !== undefined ? editNode.multiplier : 1,
        offsetValue:
          editNode.offsetValue !== undefined ? editNode.offsetValue : 0,
        unit: editNode.unit || "",
        saveToDb: editNode.saveToDb !== undefined ? editNode.saveToDb : true,
        sendToClient:
          editNode.sendToClient !== undefined ? editNode.sendToClient : true,
      });
    } else {
      resetForm();
    }
  }, [editNode]);

  // Reset form function
  const resetForm = () => {
    setFormData({
      opcServerId: "",
      nodeId: "",
      name: "",
      description: "",
      dataType: "Double",
      multiplier: 1,
      offsetValue: 0,
      unit: "",
      saveToDb: true,
      sendToClient: true,
    });
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const nodeData = {
      opcServerId: parseInt(formData.opcServerId),
      nodeId: formData.nodeId,
      name: formData.name,
      description: formData.description,
      dataType: formData.dataType,
      multiplier: parseFloat(formData.multiplier),
      offsetValue: parseFloat(formData.offsetValue),
      unit: formData.unit,
      saveToDb: formData.saveToDb,
      sendToClient: formData.sendToClient,
    };

    // Include id if editing
    if (editNode) {
      nodeData.id = editNode.id;
    }

    onSubmit(nodeData);
    resetForm();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const serverOptions = servers.map((server) => ({
    label: `${server.name} (${server.endpointUrl})`,
    value: server.id,
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-noto-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background-dark border border-surface-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">
            {editNode ? "Редактировать узел OPC UA" : "Добавить узел OPC UA"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* OPC Server Selection */}
            <CustomSelect
              label="OPC UA Сервер"
              required
              options={serverOptions}
              value={formData.opcServerId}
              onChange={(value) => handleChange("opcServerId", value)}
              placeholder="Выберите сервер"
              sortOptions={false}
            />

            {/* Node Name */}
            <Input
              type="text"
              label={"Название узла"}
              value={formData.name}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Температура котла"
              required
            />

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full px-3 py-2 bg-surface-dark border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Температура воды в котле №1"
                rows="3"
              />
            </div>

            {/* Data Type */}
            <CustomSelect
              label="Тип данных"
              required
              options={dataTypeOptions}
              value={formData.dataType}
              onChange={(value) => handleChange("dataType", value)}
              placeholder="Выберите тип данных"
              sortOptions={false}
            />

            {/* Multiplier and Offset */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label={"Множитель"}
                value={formData.multiplier}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("multiplier", e.target.value)}
                placeholder="1"
                step="0.01"
              />

              <Input
                type="number"
                label={"Смещение"}
                value={formData.offsetValue}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("offsetValue", e.target.value)}
                placeholder="0"
                step="0.01"
              />
            </div>

            {/* Unit */}
            <Input
              type="text"
              label={"Единица измерения"}
              value={formData.unit}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("unit", e.target.value)}
              placeholder="°C"
            />

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.saveToDb}
                  onChange={(e) => handleChange("saveToDb", e.target.checked)}
                  className="w-4 h-4 text-primary bg-surface-dark border-gray-700 rounded focus:ring-primary"
                />
                <label className="text-sm font-medium text-gray-300">
                  Сохранять в базу данных
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.sendToClient}
                  onChange={(e) =>
                    handleChange("sendToClient", e.target.checked)
                  }
                  className="w-4 h-4 text-primary bg-surface-dark border-gray-700 rounded focus:ring-primary"
                />
                <label className="text-sm font-medium text-gray-300">
                  Отправлять клиенту
                </label>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>Примечание:</strong>
              </p>
              <ul className="text-xs text-blue-300/80 mt-1 list-disc list-inside space-y-1">
                <li>
                  Node ID должен быть в формате OPC UA (например:
                  ns=2;s=Temperature)
                </li>
                <li>
                  Множитель применяется к значению: result = (value *
                  multiplier) + offset
                </li>
                <li>Единица измерения отображается рядом со значением</li>
                <li>
                  Данные сохраняются в БД и отправляются клиенту по умолчанию
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-5 py-2.5 bg-primary text-background-dark text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
              >
                {editNode ? "Сохранить" : "Создать"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-5 py-2.5 bg-surface-dark text-gray-300 text-sm font-bold rounded-lg hover:bg-opacity-80 transition-all active:scale-95"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
