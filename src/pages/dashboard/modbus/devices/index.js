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
import CustomSelect from "@/components/select";
import Input from "@/components/input";

const DeviceModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    protocolType: "",
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
      connectionParams,
      enabled: formData.enabled,
      pollInterval: parseInt(formData.pollInterval),
    };

    onSubmit(deviceData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
            Добавить устройство
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
            ) : (
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
            )}

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
                Создать
              </button>
              <button
                type="button"
                onClick={onClose}
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

const Index = () => {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const { mutate: createDevice } = usePostQuery({
    listKeyId: KEYS.MODBUSDevices,
  });

  const handleCreate = (deviceData) => {
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
        },
      }
    );
  };

  const handleEdit = (device) => {
    console.log("Edit device:", device);
  };

  const handleDelete = (device) => {
    console.log("Delete device:", device);
  };

  const formatConnectionParams = (paramsString) => {
    try {
      const params = JSON.parse(paramsString);
      return (
        <div className="flex flex-wrap gap-2">
          {params.host && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-primary/20 text-primary">
              {params.host}:{params.port}
            </span>
          )}
          {params.comPort && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-primary/20 text-primary">
              {params.comPort}
            </span>
          )}
          {params.baudRate && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-purple-500/20 text-purple-400">
              {params.baudRate}
            </span>
          )}
          {params.dataBits && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-orange-500/20 text-orange-400">
              {params.dataBits}/{params.stopBits}
            </span>
          )}
          {params.parity && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-dark border border-blue-500/20 text-blue-400">
              {params.parity}
            </span>
          )}
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
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />
    </DashboardLayout>
  );
};

export default Index;
