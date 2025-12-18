import CustomSelect from "@/components/select";
import Input from "@/components/input";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const RegisterModal = ({
  isOpen,
  onClose,
  onSubmit,
  editRegister = null,
  devices = [],
}) => {
  const [formData, setFormData] = useState({
    deviceId: "",
    startAddress: "",
    name: "",
    description: "",
    dataType: "",
    byteOrder: "",
    functionCode: "",
    multiplier: "",
    offsetValue: "",
    unit: "",
    saveToDb: true,
    sendToClient: true,
    minValue: "",
    maxValue: "",
  });

  // Populate form when editing
  useEffect(() => {
    if (editRegister) {
      setFormData({
        deviceId: editRegister.deviceId || "",
        startAddress: editRegister.startAddress || "",
        name: editRegister.name || "",
        description: editRegister.description || "",
        dataType: editRegister.dataType || "",
        byteOrder: editRegister.byteOrder || "",
        functionCode: editRegister.functionCode || "",
        multiplier:
          editRegister.multiplier !== undefined ? editRegister.multiplier : "",
        offsetValue:
          editRegister.offsetValue !== undefined
            ? editRegister.offsetValue
            : "",
        unit: editRegister.unit || "",
        saveToDb:
          editRegister.saveToDb !== undefined ? editRegister.saveToDb : true,
        sendToClient:
          editRegister.sendToClient !== undefined
            ? editRegister.sendToClient
            : true,
        minValue: editRegister.minValue || "",
        maxValue: editRegister.maxValue || "",
      });
    } else {
      resetForm();
    }
  }, [editRegister]);

  const resetForm = () => {
    setFormData({
      deviceId: "",
      startAddress: "",
      name: "",
      description: "",
      dataType: "",
      byteOrder: "",
      functionCode: "",
      multiplier: "",
      offsetValue: "",
      unit: "",
      saveToDb: true,
      sendToClient: true,
      minValue: "",
      maxValue: "",
    });
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const registerData = {
      deviceId: parseInt(formData.deviceId),
      startAddress: parseInt(formData.startAddress),
      name: formData.name,
      description: formData.description,
      dataType: formData.dataType,
      byteOrder: formData.byteOrder,
      functionCode: parseInt(formData.functionCode),
      multiplier: parseFloat(formData.multiplier),
      offsetValue: parseFloat(formData.offsetValue),
      unit: formData.unit,
      saveToDb: formData.saveToDb,
      sendToClient: formData.sendToClient,
      minValue: formData.minValue,
      maxValue: formData.maxValue,
    };

    if (editRegister) {
      registerData.id = editRegister.id;
    }

    onSubmit(registerData);
    resetForm();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const dataTypeOptions = [
    { label: "UNSIGNED_INT16", value: "UNSIGNED_INT16" },
    { label: "SIGNED_INT16", value: "SIGNED_INT16" },
    { label: "UNSIGNED_INT32", value: "UNSIGNED_INT32" },
    { label: "SIGNED_INT32", value: "SIGNED_INT32" },
    { label: "FLOAT32", value: "FLOAT32" },
    { label: "UNSIGNED_INT64", value: "UNSIGNED_INT64" },
    { label: "SIGNED_INT64", value: "SIGNED_INT64" },
    { label: "DOUBLE64", value: "DOUBLE64" },
    { label: "BIT", value: "BIT" },
    { label: "BOOLEAN", value: "BOOLEAN" },
    { label: "STRING", value: "STRING" },
  ];

  const byteOrderOptions = [
    { label: "BIG_ENDIAN", value: "BIG_ENDIAN" },
    { label: "LITTLE_ENDIAN", value: "LITTLE_ENDIAN" },
    { label: "BIG_ENDIAN_SWAP", value: "BIG_ENDIAN_SWAP" },
    { label: "LITTLE_ENDIAN_SWAP", value: "LITTLE_ENDIAN_SWAP" },
  ];

  const functionCodeOptions = [
    { label: "1 - Read Coils", value: 1 },
    { label: "2 - Read Discrete Inputs", value: 2 },
    { label: "3 - Read Holding Registers", value: 3 },
    { label: "4 - Read Input Registers", value: 4 },
  ];

  const deviceOptions = devices.map((device) => ({
    label: device.name,
    value: device.id,
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-noto-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background-dark border border-surface-dark rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">
            {editRegister ? "Редактировать регистр" : "Добавить регистр"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Device Selection */}
            <CustomSelect
              label="Устройство"
              required
              options={deviceOptions}
              value={formData.deviceId}
              onChange={(value) => handleChange("deviceId", value)}
              placeholder="Выберите устройство"
              sortOptions={false}
            />

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                label="Имя регистра"
                value={formData.name}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Например: Активная мощность"
                required
              />

              <Input
                type="number"
                label="Адрес начала"
                value={formData.startAddress}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("startAddress", e.target.value)}
                placeholder="40001"
                required
              />
            </div>

            {/* Description */}
            <Input
              type="text"
              label="Описание"
              value={formData.description}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Текущая активная мощность инвертора"
            />

            {/* Data Type and Byte Order */}
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Тип данных"
                required
                options={dataTypeOptions}
                value={formData.dataType}
                onChange={(value) => handleChange("dataType", value)}
                placeholder="Выберите тип данных"
                sortOptions={false}
              />

              <CustomSelect
                label="Порядок байтов"
                required
                options={byteOrderOptions}
                value={formData.byteOrder}
                onChange={(value) => handleChange("byteOrder", value)}
                placeholder="Выберите порядок"
                sortOptions={false}
              />
            </div>

            {/* Function Code */}
            <CustomSelect
              label="Код функции"
              required
              options={functionCodeOptions}
              value={formData.functionCode}
              onChange={(value) => handleChange("functionCode", value)}
              placeholder="Выберите код функции"
              sortOptions={false}
            />

            {/* Multiplier, Offset, Unit */}
            <div className="grid grid-cols-3 gap-4">
              <Input
                type="number"
                step="any"
                label="Множитель"
                value={formData.multiplier}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("multiplier", e.target.value)}
                placeholder="0.1"
                required
              />

              <Input
                type="number"
                step="any"
                label="Смещение"
                value={formData.offsetValue}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("offsetValue", e.target.value)}
                placeholder="0"
                required
              />

              <Input
                type="text"
                label="Единица измерения"
                value={formData.unit}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("unit", e.target.value)}
                placeholder="кВт"
              />
            </div>

            {/* Min and Max Values */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                label="Минимальное значение"
                value={formData.minValue}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("minValue", e.target.value)}
                placeholder="0"
              />

              <Input
                type="text"
                label="Максимальное значение"
                value={formData.maxValue}
                inputClass="!h-[45px] text-sm"
                onChange={(e) => handleChange("maxValue", e.target.value)}
                placeholder="100000"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.saveToDb}
                  onChange={(e) => handleChange("saveToDb", e.target.checked)}
                  className="w-4 h-4 text-primary bg-surface-dark border-gray-700 rounded focus:ring-primary"
                />
                <label className="text-sm font-medium text-gray-300">
                  Сохранить в БД
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
                  Отправить клиенту
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-5 py-2.5 bg-primary text-background-dark text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
              >
                {editRegister ? "Сохранить" : "Создать"}
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
export default RegisterModal;
