import { useMemo, useState } from "react";
import useGetQuery from "@/hooks/java/useGetQuery";
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
import { DeviceModal } from "@/components/modal/device-modal";
import Link from "next/link";
import usePostPythonQuery from "@/hooks/python/usePostQuery";

const QUALITY_COLOR = {
  GOOD: "#22c55e",
  BAD: "#ef4444",
};

const DeviceRow = ({ device, registerCount, isSelected, onClick, onEdit, onDelete }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 10px",
      borderBottom: "1px solid #232222",
      cursor: "pointer",
      background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
    }}
    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#232222"; }}
    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        flexShrink: 0,
        background: device.status === "CONNECTED" ? "#22c55e" : "#ef4444",
      }}
    />
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          font: "500 11.5px/1.2 'IBM Plex Mono'",
          color: "#e5e2e1",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {device.name}
      </span>
      <span style={{ font: "400 9.5px/1.2 'IBM Plex Mono'", color: "#7c8290" }}>
        {device.protocolType} · адрес {get(JSON.parse(device.connectionParams || "{}"), "slaveId", "—")}
      </span>
    </div>
    <span style={{ font: "400 10px/1.2 'IBM Plex Mono'", color: "#7c8290", textAlign: "right", flexShrink: 0 }}>
      {registerCount} рег.
    </span>
    <div style={{ display: "flex", alignItems: "center", gap: 5, font: "500 9.5px/1.2 'IBM Plex Mono'", flexShrink: 0 }}>
      <span onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ color: "#3b82f6", cursor: "pointer" }}>
        ИЗМЕНИТЬ
      </span>
      <span style={{ color: "#5c6270" }}>·</span>
      <span onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ color: "#ef4444", cursor: "pointer" }}>
        УДАЛИТЬ
      </span>
    </div>
  </div>
);

const Index = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectDeviceId, setSelectDeviceId] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedRegisterId, setSelectedRegisterId] = useState(null);

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const { data: devicesResp, isLoading, isFetching } = useGetQuery({
    key: KEYS.MODBUSDevices,
    url: URLS.MODBUSDevices,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  // Все регистры разом — чтобы посчитать «N reg» в списке устройств без
  // отдельного запроса на каждое устройство.
  const { data: allRegistersResp } = useGetQuery({
    key: KEYS.MODBUSRegisters,
    url: URLS.MODBUSRegisters,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const { data: deviceRegistersResp, isLoading: isLoadingDeviceRegisters } = useGetQuery({
    key: [KEYS.MODBUSRegistersByDeviceId, selectedDeviceId],
    url: `${URLS.MODBUSRegistersByDeviceId}/${selectedDeviceId}`,
    headers: authHeaders,
    enabled: !!session?.accessToken && !!selectedDeviceId,
  });

  const { data: readingsResp, isFetching: isFetchingReadings } = useGetQuery({
    key: [KEYS.MODBUSreadingsByRegisterId, selectedRegisterId],
    url: `${URLS.MODBUSreadingsByRegisterId}/${selectedRegisterId}`,
    headers: authHeaders,
    enabled: !!session?.accessToken && !!selectedRegisterId,
  });

  const { mutate: createDevice } = usePostQuery({ listKeyId: KEYS.MODBUSDevices });
  const { mutate: updateDevice } = usePutQuery({ listKeyId: KEYS.MODBUSDevices });
  const { mutate: syncDevices } = usePostPythonQuery({
    listKeyId: "sync-devices",
    hideSuccessToast: true,
  });

  const handleSyncronize = () => {
    syncDevices(
      { url: URLS.syncDevices, config: { headers: authHeaders } },
      {
        onSuccess: () => toast.success("Данные успешно синхронизированы"),
        onError: () => toast.error("Синхронизация устройства не удалась"),
      },
    );
  };

  const devices = get(devicesResp, "data.content", []);
  const allRegisters = get(allRegistersResp, "data.content", []);
  const deviceRegisters = get(deviceRegistersResp, "data", []);
  const readings = get(readingsResp, "data.content", []);

  const registerCountByDevice = useMemo(() => {
    const map = new Map();
    allRegisters.forEach((r) => {
      map.set(r.deviceId, (map.get(r.deviceId) || 0) + 1);
    });
    return map;
  }, [allRegisters]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const selectedRegister = deviceRegisters.find((r) => r.id === selectedRegisterId);

  const handleCreate = (deviceData) => {
    if (editingDevice) {
      updateDevice(
        {
          url: `${URLS.MODBUSDevices}/${editingDevice.id}`,
          attributes: deviceData,
          config: { headers: authHeaders },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingDevice(null);
            toast.success("Устройство успешно обновлено");
          },
          onError: () => toast.error("Не удалось обновить устройство"),
        },
      );
    } else {
      createDevice(
        {
          url: URLS.MODBUSDevices,
          attributes: deviceData,
          config: { headers: authHeaders },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            toast.success("Устройство успешно создано");
          },
          onError: () => toast.error("Не удалось создать устройство"),
        },
      );
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${config.JAVA_API_URL}${URLS.MODBUSDevices}/${selectDeviceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      if (!response.ok) throw new Error("Ошибка при удалении");
      setDeleteModal(false);
      setSelectDeviceId(null);
      if (selectedDeviceId === selectDeviceId) setSelectedDeviceId(null);
      queryClient.invalidateQueries(KEYS.MODBUSDevices);
      toast.success("Устройство успешно удалено");
    } catch (error) {
      toast.error("Не удалось удалить");
    }
  };

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"Modbus"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Modbus"}>
      <div style={{ fontFamily: "'IBM Plex Sans'" }} className="space-y-2.5">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            onClick={() => {
              setEditingDevice(null);
              setIsModalOpen(true);
            }}
            style={{
              padding: "6px 11px",
              border: "1px solid #3b82f6",
              color: "#3b82f6",
              font: "500 10.5px/1.2 'IBM Plex Mono'",
              cursor: "pointer",
            }}
          >
            + УСТРОЙСТВО
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
            href="/dashboard/modbus/devices/status"
            style={{
              padding: "6px 11px",
              border: "1px solid #2a2a2a",
              color: "#bfc7d4",
              font: "500 10.5px/1.2 'IBM Plex Mono'",
              display: "flex",
              alignItems: "center",
            }}
          >
            СТАТУС ОПРОСА
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 10, alignItems: "start" }}>
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
              Устройства Modbus
            </div>
            {devices.length === 0 ? (
              <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                Устройства не найдены
              </p>
            ) : (
              devices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  registerCount={registerCountByDevice.get(device.id) || 0}
                  isSelected={device.id === selectedDeviceId}
                  onClick={() => {
                    setSelectedDeviceId(device.id);
                    setSelectedRegisterId(null);
                  }}
                  onEdit={() => handleEdit(device)}
                  onDelete={() => {
                    setSelectDeviceId(device.id);
                    setDeleteModal(true);
                  }}
                />
              ))
            )}
          </div>

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
                Регистры {selectedDevice ? `· ${selectedDevice.name}` : ""}
              </div>
              {!selectedDeviceId ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                  Выберите устройство слева
                </p>
              ) : isLoadingDeviceRegisters ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#7c8290", padding: "16px 10px" }}>Загрузка…</p>
              ) : deviceRegisters.length === 0 ? (
                <p style={{ font: "400 11px/1.4 'IBM Plex Sans'", color: "#5c6270", fontStyle: "italic", padding: "16px 10px" }}>
                  Регистры не найдены
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                      {["Адрес", "Название", "Тип", "Порядок байт", "Ед."].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "6px 10px",
                            textAlign: "left",
                            font: "600 9.5px/1.2 'IBM Plex Sans'",
                            letterSpacing: ".05em",
                            textTransform: "uppercase",
                            color: "#7c8290",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deviceRegisters.map((register) => (
                      <tr
                        key={register.id}
                        onClick={() => setSelectedRegisterId(register.id)}
                        style={{
                          borderBottom: "1px solid #232222",
                          cursor: "pointer",
                          background: register.id === selectedRegisterId ? "rgba(59,130,246,0.08)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "5px 10px", font: "500 11px/1.2 'IBM Plex Mono'", color: "#bfc7d4" }}>
                          {register.startAddress}
                        </td>
                        <td style={{ padding: "5px 10px", font: "500 11.5px/1.2 'IBM Plex Sans'", color: "#e5e2e1" }}>
                          {register.name}
                        </td>
                        <td style={{ padding: "5px 10px", font: "400 10.5px/1.2 'IBM Plex Mono'", color: "#7c8290" }}>
                          {register.dataType}
                        </td>
                        <td style={{ padding: "5px 10px", font: "400 10.5px/1.2 'IBM Plex Mono'", color: "#7c8290" }}>
                          {register.byteOrder}
                        </td>
                        <td style={{ padding: "5px 10px", font: "400 10.5px/1.2 'IBM Plex Mono'", color: "#7c8290" }}>
                          {register.unit || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

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
                Текущие показания {selectedRegister ? `· ${selectedRegister.name}` : ""}
              </div>
              <div style={{ padding: "6px 10px", maxHeight: 220, overflowY: "auto", font: "400 11px/1.4 'IBM Plex Mono'" }}>
                {!selectedRegisterId ? (
                  <p style={{ color: "#5c6270", fontStyle: "italic", padding: "10px 0" }}>Выберите регистр выше</p>
                ) : isFetchingReadings ? (
                  <p style={{ color: "#7c8290", padding: "10px 0" }}>Загрузка…</p>
                ) : readings.length === 0 ? (
                  <p style={{ color: "#5c6270", fontStyle: "italic", padding: "10px 0" }}>Показаний пока нет</p>
                ) : (
                  readings.slice(0, 30).map((reading, index) => (
                    <div key={index} style={{ display: "flex", gap: 10, padding: "2px 0" }}>
                      <span style={{ color: "#5c6270", width: 150, flexShrink: 0 }}>
                        {new Date(reading.timestamp).toLocaleString("ru-RU")}
                      </span>
                      <span
                        style={{ width: 48, flexShrink: 0, fontWeight: 600, color: QUALITY_COLOR[reading.quality] || "#f59e0b" }}
                      >
                        {reading.quality}
                      </span>
                      <span style={{ color: "#bfc7d4" }}>
                        {reading.value?.toFixed?.(2) ?? reading.value} {reading.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
        deleting={handleDelete}
        title="Вы уверены, что хотите удалить это устройство?"
      />
    </DashboardLayout>
  );
};

export default Index;
