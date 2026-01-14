import CustomSelect from "@/components/select";
import Input from "@/components/input";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export const DeviceModal = ({
  isOpen,
  onClose,
  onSubmit,
  editDevice = null,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    protocolType: "",
    serialNumber: "",
    enabled: true,
    pollInterval: "",
    // TCP params
    host: "",
    port: "",
    timeout: "",
    // RTU params
    comPort: "",
    baudRate: "",
    dataBits: "",
    stopBits: "",
    parity: "",
    // Common
    slaveId: "",
  });

  // Populate form when editing
  useEffect(() => {
    if (editDevice) {
      try {
        const params = JSON.parse(editDevice.connectionParams);
        setFormData({
          name: editDevice.name || "",
          protocolType: editDevice.protocolType || "",
          enabled: editDevice.enabled !== undefined ? editDevice.enabled : true,
          pollInterval: editDevice.pollInterval || "",
          // TCP params
          host: params.host || "",
          port: params.port || "",
          timeout: params.timeout || "",
          // RTU params
          comPort: params.comPort || "",
          baudRate: params.baudRate || "",
          dataBits: params.dataBits || "",
          stopBits: params.stopBits || "",
          parity: params.parity || "",
          // Common
          slaveId: params.slaveId || "",
        });
      } catch (error) {
        console.error("Error parsing connection params:", error);
      }
    } else {
      // Reset form when not editing
      resetForm();
    }
  }, [editDevice]);

  // Reset form function
  const resetForm = () => {
    setFormData({
      name: "",
      protocolType: "",
      serialNumber: "",
      enabled: true,
      pollInterval: "",
      host: "",
      port: "",
      timeout: "",
      comPort: "",
      baudRate: "",
      dataBits: "",
      stopBits: "",
      parity: "",
      slaveId: "",
    });
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    let connectionParams;
    if (formData.protocolType === "MODBUS_TCP") {
      connectionParams = JSON.stringify({
        host: formData.host,
        port: parseInt(formData.port),
        slaveId: parseInt(formData.slaveId),
        timeout: parseInt(formData.timeout),
      });
    } else {
      connectionParams = JSON.stringify({
        comPort: formData.comPort,
        baudRate: parseInt(formData.baudRate),
        dataBits: parseInt(formData.dataBits),
        stopBits: parseInt(formData.stopBits),
        parity: formData.parity,
        slaveId: parseInt(formData.slaveId),
      });
    }

    const deviceData = {
      name: formData.name,
      protocolType: formData.protocolType,
      serialNumber: formData.serialNumber,
      connectionParams,
      enabled: formData.enabled,
      pollInterval: parseInt(formData.pollInterval),
    };

    // Include id if editing
    if (editDevice) {
      deviceData.id = editDevice.id;
    }

    onSubmit(deviceData);
    resetForm(); // Reset form after submit
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
            {editDevice ? "Редактировать устройство" : "Добавить устройство"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Device Name */}
            <Input
              type="text"
              label={"Имя устройства"}
              value={formData.name}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Введите имя устройства"
              required
            />
            <Input
              type="text"
              label={"Серийный номер устройства"}
              value={formData.serialNumber}
              inputClass="!h-[45px] text-sm"
              onChange={(e) => handleChange("serialNumber", e.target.value)}
              placeholder="Введите серийный номер устройства"
              required
            />

            {/* Protocol Type */}
            <CustomSelect
              label="Тип протокола"
              required
              options={[
                { label: "MODBUS TCP", value: "MODBUS_TCP" },
                { label: "MODBUS RTU", value: "MODBUS_RTU" },
              ]}
              value={formData.protocolType}
              onChange={(value) => handleChange("protocolType", value)}
              placeholder="Выберите тип протокола"
              sortOptions={false}
            />

            {/* Connection Parameters */}
            {formData.protocolType === "MODBUS_TCP" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label={"Хост"}
                      type="text"
                      inputClass="!h-[45px] text-sm"
                      value={formData.host}
                      onChange={(e) => handleChange("host", e.target.value)}
                      placeholder="0.0.0.0"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label={"Порт"}
                      type="number"
                      inputClass="!h-[45px] text-sm"
                      value={formData.port}
                      onChange={(e) => handleChange("port", e.target.value)}
                      placeholder="3000"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label={"Slave ID"}
                      type="number"
                      inputClass="!h-[45px] text-sm"
                      value={formData.slaveId}
                      onChange={(e) => handleChange("slaveId", e.target.value)}
                      placeholder="Введите ID"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label={"Timeout (мс)"}
                      type="number"
                      inputClass="!h-[45px] text-sm"
                      value={formData.timeout}
                      onChange={(e) => handleChange("timeout", e.target.value)}
                      placeholder="Введите таймоут"
                      required
                    />
                  </div>
                </div>
              </>
            ) : formData.protocolType === "MODBUS_RTU" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label={"COM Порт"}
                      type="text"
                      inputClass="!h-[45px] text-sm"
                      value={formData.comPort}
                      onChange={(e) => handleChange("comPort", e.target.value)}
                      placeholder="Введите COM Порт"
                      required
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label={"Скорость (бод)"}
                      options={[
                        { label: "9600", value: 9600 },
                        { label: "19200", value: 19200 },
                        { label: "38400", value: 38400 },
                        { label: "57600", value: 57600 },
                        { label: "115200", value: 115200 },
                      ]}
                      value={formData.baudRate}
                      onChange={(value) => handleChange("baudRate", value)}
                      placeholder="Выберите скорость"
                      sortOptions={false}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <CustomSelect
                      label={"Биты данных"}
                      options={[
                        { label: "7", value: 7 },
                        { label: "8", value: 8 },
                      ]}
                      value={formData.dataBits}
                      onChange={(value) => handleChange("dataBits", value)}
                      placeholder="Биты"
                      sortOptions={false}
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label={"Стоп-биты"}
                      options={[
                        { label: "1", value: 1 },
                        { label: "2", value: 2 },
                      ]}
                      value={formData.stopBits}
                      onChange={(value) => handleChange("stopBits", value)}
                      placeholder="Стоп-биты"
                      sortOptions={false}
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label={"Четность"}
                      options={[
                        { label: "NONE", value: "NONE" },
                        { label: "EVEN", value: "EVEN" },
                        { label: "ODD", value: "ODD" },
                      ]}
                      value={formData.parity}
                      onChange={(value) => handleChange("parity", value)}
                      placeholder="Четность"
                      sortOptions={false}
                    />
                  </div>
                </div>
                <div>
                  <Input
                    label={"Slave ID"}
                    type="number"
                    inputClass="!h-[45px] text-sm"
                    value={formData.slaveId}
                    onChange={(e) => handleChange("slaveId", e.target.value)}
                    placeholder="Введите ID"
                    required
                  />
                </div>
              </>
            ) : null}

            {/* Poll Interval */}
            <div>
              <Input
                label={"Интервал опроса (мс)"}
                type="number"
                inputClass="!h-[45px] text-sm"
                value={formData.pollInterval}
                onChange={(e) => handleChange("pollInterval", e.target.value)}
                placeholder="Введите интервал опроса"
                required
              />
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => handleChange("enabled", e.target.checked)}
                className="w-4 h-4 text-primary bg-surface-dark border-gray-700 rounded focus:ring-primary"
              />
              <label className="text-sm font-medium text-gray-300">
                Включить устройство
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-5 py-2.5 bg-primary text-background-dark text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95"
              >
                {editDevice ? "Сохранить" : "Создать"}
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
