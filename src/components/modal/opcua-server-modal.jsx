import Input from "@/components/input";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export const OPCUAServerModal = ({
  isOpen,
  onClose,
  onSubmit,
  editServer = null,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    endpointUrl: "",
    username: "",
    password: "",
    enabled: true,
  });

  // Populate form when editing
  useEffect(() => {
    if (editServer) {
      setFormData({
        name: editServer.name || "",
        endpointUrl: editServer.endpointUrl || "",
        username: editServer.username || "",
        password: "", // Пароль не показываем при редактировании
        enabled: editServer.enabled !== undefined ? editServer.enabled : true,
      });
    } else {
      // Reset form when not editing
      resetForm();
    }
  }, [editServer]);

  // Reset form function
  const resetForm = () => {
    setFormData({
      name: "",
      endpointUrl: "",
      username: "",
      password: "",
      enabled: true,
    });
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Создаем объект сервера в формате API
    const serverData = {
      name: formData.name,
      endpointUrl: formData.endpointUrl,
      enabled: formData.enabled,
    };

    // Добавляем username и password только если они заполнены
    if (formData.username) {
      serverData.username = formData.username;
    }

    // Добавляем пароль только если он заполнен (при создании или изменении)
    if (formData.password) {
      serverData.password = formData.password;
    }

    // Include id if editing
    if (editServer) {
      serverData.id = editServer.id;
    }

    onSubmit(serverData);
    resetForm(); // Reset form after submit
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Endpoint URL ni o'zgarganda avtomatik "opc.tcp://" qo'shamiz
  const handleEndpointUrlChange = (value) => {
    // Agar "opc.tcp://" bilan boshlanmasa, qo'shamiz
    let finalValue = value;
    if (value && !value.startsWith("opc.tcp://")) {
      finalValue = "opc.tcp://" + value;
    }
    setFormData((prev) => ({ ...prev, endpointUrl: finalValue }));
  };

  const handleClose = () => {
    resetForm(); // Reset form when closing
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-noto-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background-dark border border-surface-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">
            {editServer
              ? "Редактировать OPC UA сервер"
              : "Добавить OPC UA сервер"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Server Name */}
            <Input
              type="text"
              label={"Имя сервера"}
              value={formData.name}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Введите имя сервера"
              required
            />

            {/* Endpoint URL */}
            <Input
              type="text"
              label={"Endpoint URL"}
              value={formData.endpointUrl}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleEndpointUrlChange(e.target.value)}
              placeholder="192.168.1.100:4840"
              required
            />

            {/* Username */}
            <Input
              type="text"
              label={"Имя пользователя"}
              value={formData.username}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("username", e.target.value)}
              placeholder="Введите имя пользователя (опционально)"
            />

            {/* Password */}
            <Input
              type="password"
              label={"Пароль"}
              value={formData.password}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder={
                editServer
                  ? "Оставьте пустым, чтобы не менять пароль"
                  : "Введите пароль (опционально)"
              }
            />

            {/* Enabled Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => handleChange("enabled", e.target.checked)}
                className="w-4 h-4 text-primary bg-surface-dark border-gray-700 rounded focus:ring-primary"
              />
              <label className="text-sm font-medium text-gray-300">
                Включить сервер после создания
              </label>
            </div>

            {/* Info Note */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>Примечание:</strong> Поля "Имя пользователя" и "Пароль"
                являются опциональными.
              </p>
              <ul className="text-xs text-blue-300/80 mt-1 list-disc list-inside">
                <li>
                  Если сервер использует анонимный доступ, оставьте эти поля
                  пустыми
                </li>
                <li>Для серверов с аутентификацией укажите учетные данные</li>
                <li>
                  При редактировании: оставьте поле пароля пустым, чтобы
                  сохранить текущий пароль
                </li>
                <li>
                  Endpoint URL автоматически добавляется <code>opc.tcp://</code>{" "}
                  в начало
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-5 py-2.5 bg-primary text-background-dark text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
              >
                {editServer ? "Сохранить" : "Создать"}
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
