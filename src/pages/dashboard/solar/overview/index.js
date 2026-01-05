import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const Index = () => {
  const [data, setData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showFullPageFlow, setShowFullPageFlow] = useState(false);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Process WebSocket data to extract device information
  const devices = useMemo(() => {
    const deviceMap = new Map();

    data.forEach((item) => {
      if (!deviceMap.has(item.deviceId)) {
        deviceMap.set(item.deviceId, {
          id: item.deviceId,
          name: item.deviceName,
          parameters: {},
          lastUpdate: item.timestamp,
          active: true,
        });
      }

      const device = deviceMap.get(item.deviceId);
      const paramName = item.registerName.split("(")[0].trim();
      device.parameters[paramName] = {
        value: item.value,
        unit: item.unit,
        quality: item.quality,
        timestamp: item.timestamp,
      };

      // Update last update time
      if (
        new Date(...item.timestamp.slice(0, 6)) >
        new Date(...device.lastUpdate.slice(0, 6))
      ) {
        device.lastUpdate = item.timestamp;
      }
    });

    return Array.from(deviceMap.values());
  }, [data]);

  // Calculate totals from data
  const totals = useMemo(() => {
    let totalPower = 0;
    let totalEnergyToday = 0;
    let totalEnergy = 0;
    let deviceStatuses = {};

    devices.forEach((device) => {
      // Find power parameters
      const powerParams = Object.keys(device.parameters).filter(
        (key) =>
          key.toLowerCase().includes("power") &&
          !key.toLowerCase().includes("reactive")
      );

      powerParams.forEach((param) => {
        totalPower += device.parameters[param].value || 0;
      });

      // Find today's energy
      const todayParams = Object.keys(device.parameters).filter((key) =>
        key.toLowerCase().includes("today")
      );

      todayParams.forEach((param) => {
        const value = device.parameters[param].value || 0;
        totalEnergyToday +=
          value /
          (device.parameters[param].unit.toLowerCase().includes("kwh")
            ? 1
            : 1000);
      });

      // Find total energy
      const totalParams = Object.keys(device.parameters).filter(
        (key) =>
          key.toLowerCase().includes("total") &&
          key.toLowerCase().includes("energy")
      );

      totalParams.forEach((param) => {
        const value = device.parameters[param].value || 0;
        totalEnergy +=
          value /
          (device.parameters[param].unit.toLowerCase().includes("kwh")
            ? 1
            : 1000);
      });

      // Determine device status
      deviceStatuses[device.id] = {
        active: device.active,
        hasData: Object.keys(device.parameters).length > 0,
      };
    });

    return {
      power: totalPower,
      energyToday: totalEnergyToday,
      totalEnergy: totalEnergy,
      activeDevices: devices.filter((d) => d.active).length,
      deviceStatuses,
    };
  }, [devices]);

  useEffect(() => {
    const ws = new WebSocket("ws://10.20.6.129:18081/ws/raw");

    ws.onopen = () => {
      console.log("Connected to SCADA");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "connected") {
          console.log("WebSocket:", message.message);
        } else if (message.type === "readings" && message.data) {
          setData((prev) => {
            const newData = [...prev, ...message.data];
            return newData.slice(-200); // Keep more data for analysis
          });
          setLastUpdate(new Date());

          // Update flow diagram with real data
          updateFlowDiagram(message.data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
    };

    return () => ws.close();
  }, []);

  // Initialize flow diagram based on device data
  useEffect(() => {
    if (devices.length > 0) {
      initializeFlowDiagram();
    }
  }, [devices.length]);

  const initializeFlowDiagram = () => {
    const nodePositions = [
      { x: 100, y: 100 }, // Solar panel 1
      { x: 100, y: 300 }, // Solar panel 2
      { x: 400, y: 100 }, // Inverter 1
      { x: 400, y: 300 }, // Inverter 2
      { x: 700, y: 200 }, // Grid connection
      { x: 400, y: 500 }, // Battery
      { x: 700, y: 400 }, // Monitoring
    ];

    const newNodes = devices.map((device, index) => {
      const position = nodePositions[index] || { x: 100 + index * 300, y: 200 };

      // Determine device type based on parameters
      let deviceType = "inverter";
      let icon = "⚡";
      let bgColor = "linear-gradient(135deg, #10b981 0%, #059669 100%)";

      if (device.name.toLowerCase().includes("счётчик")) {
        deviceType = "meter";
        icon = "📊";
        bgColor = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
      }

      // Get key parameters for display
      const powerParam = Object.keys(device.parameters).find((key) =>
        key.toLowerCase().includes("power")
      );
      const voltageParam = Object.keys(device.parameters).find((key) =>
        key.toLowerCase().includes("voltage")
      );
      const tempParam = Object.keys(device.parameters).find((key) =>
        key.toLowerCase().includes("temperature")
      );

      return {
        id: `device-${device.id}`,
        type: index === 0 ? "input" : "default",
        position,
        data: {
          label: `${icon} ${device.name}`,
          type: deviceType,
          deviceId: device.id,
          power: powerParam
            ? `${device.parameters[powerParam].value.toFixed(1)}${
                device.parameters[powerParam].unit
              }`
            : "N/A",
          voltage: voltageParam
            ? `${device.parameters[voltageParam].value.toFixed(1)}${
                device.parameters[voltageParam].unit
              }`
            : "N/A",
          temperature: tempParam
            ? `${device.parameters[tempParam].value.toFixed(1)}°C`
            : "N/A",
          status: device.active ? "active" : "inactive",
          parameters: device.parameters,
        },
        style: {
          background: bgColor,
          color: "white",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          width: 200,
          minHeight: 120,
          borderRadius: "12px",
          padding: "15px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          fontSize: "14px",
          fontWeight: "500",
        },
        draggable: true,
      };
    });

    // Add grid and monitoring nodes
    newNodes.push({
      id: "grid",
      type: "output",
      position: { x: 700, y: 200 },
      data: {
        label: "🏢 Электросеть",
        type: "grid",
        power: `${totals.power.toFixed(1)}W`,
        status: "connected",
        devices: `${devices.length} устройства`,
      },
      style: {
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        color: "white",
        border: "2px solid #1e40af",
        width: 200,
        borderRadius: "12px",
        padding: "15px",
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
      },
    });

    newNodes.push({
      id: "monitoring",
      type: "output",
      position: { x: 700, y: 400 },
      data: {
        label: "📊 SCADA Мониторинг",
        type: "monitoring",
        dataPoints: data.length,
        activeDevices: totals.activeDevices,
        status: "active",
      },
      style: {
        background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
        color: "white",
        border: "2px solid #9d174d",
        width: 200,
        borderRadius: "12px",
        padding: "15px",
        boxShadow: "0 4px 12px rgba(236, 72, 153, 0.3)",
      },
    });

    const newEdges = [];

    // Create connections based on power flow logic
    devices.forEach((device, index) => {
      if (index < 2) {
        // First two devices as solar inputs
        newEdges.push({
          id: `edge-solar-${device.id}`,
          source: `device-${device.id}`,
          target: "grid",
          type: "smoothstep",
          animated: totals.power > 0,
          style: {
            stroke: totals.power > 0 ? "#fbbf24" : "#9ca3af",
            strokeWidth: 3,
            opacity: device.active ? 1 : 0.3,
          },
          label: `${
            device.parameters["Output power"]?.value?.toFixed(1) || 0
          }W`,
          labelStyle: {
            fill: totals.power > 0 ? "#f59e0b" : "#6b7280",
            fontWeight: "bold",
            fontSize: 12,
          },
          labelBgStyle: { fill: "white", fillOpacity: 0.8, rx: 4, ry: 4 },
        });
      }

      // Connect all devices to monitoring
      newEdges.push({
        id: `edge-monitor-${device.id}`,
        source: `device-${device.id}`,
        target: "monitoring",
        type: "straight",
        animated: false,
        style: {
          stroke: "#6b7280",
          strokeWidth: 1,
          strokeDasharray: "5,5",
          opacity: 0.5,
        },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const updateFlowDiagram = (newData) => {
    // Update node values with real-time data
    setNodes((nds) =>
      nds.map((node) => {
        if (node.data.deviceId) {
          // Find latest data for this device
          const deviceData = newData.filter(
            (item) => item.deviceId === node.data.deviceId
          );

          if (deviceData.length > 0) {
            // Update parameters
            const updatedParams = { ...node.data.parameters };
            deviceData.forEach((item) => {
              const paramName = item.registerName.split("(")[0].trim();
              updatedParams[paramName] = {
                value: item.value,
                unit: item.unit,
                quality: item.quality,
                timestamp: item.timestamp,
              };
            });

            // Find power parameter for display
            const powerParam = Object.keys(updatedParams).find(
              (key) =>
                key.toLowerCase().includes("power") &&
                !key.toLowerCase().includes("reactive")
            );

            const voltageParam = Object.keys(updatedParams).find((key) =>
              key.toLowerCase().includes("voltage")
            );

            const tempParam = Object.keys(updatedParams).find((key) =>
              key.toLowerCase().includes("temperature")
            );

            return {
              ...node,
              data: {
                ...node.data,
                parameters: updatedParams,
                power: powerParam
                  ? `${updatedParams[powerParam].value.toFixed(1)}${
                      updatedParams[powerParam].unit
                    }`
                  : node.data.power,
                voltage: voltageParam
                  ? `${updatedParams[voltageParam].value.toFixed(1)}${
                      updatedParams[voltageParam].unit
                    }`
                  : node.data.voltage,
                temperature: tempParam
                  ? `${updatedParams[tempParam].value.toFixed(1)}°C`
                  : node.data.temperature,
                status: "active",
              },
              style: {
                ...node.style,
                opacity: 1,
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.4)",
              },
            };
          }
        } else if (node.id === "grid") {
          // Update grid node with total power
          return {
            ...node,
            data: {
              ...node.data,
              power: `${totals.power.toFixed(1)}W`,
            },
          };
        } else if (node.id === "monitoring") {
          // Update monitoring node
          return {
            ...node,
            data: {
              ...node.data,
              dataPoints: data.length + newData.length,
              activeDevices: totals.activeDevices,
            },
          };
        }
        return node;
      })
    );

    // Update edge animations based on power flow
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source.startsWith("device-")) {
          const deviceId = parseInt(edge.source.split("-")[1]);
          const deviceData = newData.find(
            (item) =>
              item.deviceId === deviceId &&
              item.registerName.toLowerCase().includes("power")
          );

          const hasPower = deviceData?.value > 0 || totals.power > 0;

          return {
            ...edge,
            animated: hasPower,
            style: {
              ...edge.style,
              stroke: hasPower ? "#fbbf24" : "#9ca3af",
              opacity: hasPower ? 1 : 0.3,
            },
            label: deviceData
              ? `${deviceData.value.toFixed(1)}${deviceData.unit}`
              : edge.label,
          };
        }
        return edge;
      })
    );
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const formatTime = (timestamp) => {
    if (!timestamp || !Array.isArray(timestamp)) return "-";
    const date = new Date(...timestamp.slice(0, 6));
    return date.toLocaleTimeString("ru-RU");
  };

  const CustomNode = ({ data }) => {
    return (
      <div
        className="p-4 rounded-xl shadow-lg border-2 border-white/20"
        style={{ background: data.bgColor }}
      >
        <div className="font-bold text-white mb-2 text-center">
          {data.label}
        </div>
        {data.power && (
          <div className="text-sm text-white/90 mb-1">⚡ {data.power}</div>
        )}
        {data.voltage && (
          <div className="text-sm text-white/90 mb-1">🔌 {data.voltage}</div>
        )}
        {data.temperature && (
          <div className="text-sm text-white/90">🌡️ {data.temperature}</div>
        )}
        <div className="mt-2 text-xs text-white/70 text-center">
          {data.status === "active" ? "🟢 Активен" : "⚪ Нет данных"}
        </div>
      </div>
    );
  };

  const nodeTypes = {
    custom: CustomNode,
  };

  // Full-page flow view
  if (showFullPageFlow) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-900 dark:to-gray-950">
        <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFullPageFlow(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition-colors duration-200"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Назад к панели
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Визуализация SCADA системы
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {connected ? "Подключено" : "Отключено"}
                </span>
              </div>
              <div className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold">
                {totals.power.toFixed(0)}W
              </div>
            </div>
          </div>
        </div>

        <div className="pt-20 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg" />
            <MiniMap
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
              nodeStrokeColor={(n) => {
                switch (n.data?.type) {
                  case "meter":
                    return "#8b5cf6";
                  case "inverter":
                    return "#10b981";
                  case "grid":
                    return "#3b82f6";
                  case "monitoring":
                    return "#ec4899";
                  default:
                    return "#666";
                }
              }}
              nodeColor={(n) => {
                switch (n.data?.type) {
                  case "meter":
                    return "#a78bfa";
                  case "inverter":
                    return "#34d399";
                  case "grid":
                    return "#60a5fa";
                  case "monitoring":
                    return "#f472b6";
                  default:
                    return "#9ca3af";
                }
              }}
            />
            <Background variant="dots" gap={20} size={1} />

            <Panel
              position="top-right"
              className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-800"
            >
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                Статистика системы
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Устройства:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {devices.length} шт.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Мощность:
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {totals.power.toFixed(1)}W
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Сегодня:
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {totals.energyToday.toFixed(1)} кВт·ч
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Данные:
                  </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {data.length} записей
                  </span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <DashboardLayout headerTitle={"Общий обход"}>
      <div className="font-manrope py-6 space-y-6">
        {/* Hero Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden bg-gradient-to-br from-green-900/20 via-emerald-900/10 to-teal-900/20 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30 rounded-3xl border border-green-500/20 p-8"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl -z-10"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div
                  className={`absolute inset-0 ${
                    connected ? "bg-green-500" : "bg-red-500"
                  } blur-xl opacity-30 animate-pulse`}
                ></div>
                <div
                  className={`relative w-20 h-20 rounded-2xl ${
                    connected ? "bg-green-500/20" : "bg-red-500/20"
                  } border ${
                    connected ? "border-green-500/30" : "border-red-500/30"
                  } flex items-center justify-center`}
                >
                  <span
                    className={`material-symbols-outlined text-5xl ${
                      connected ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {connected ? "wifi" : "wifi_off"}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                    Солнечная SCADA
                  </h1>
                  <div
                    className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                      connected
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                    } border ${
                      connected ? "border-green-500/30" : "border-red-500/30"
                    }`}
                  >
                    {connected ? "ПОДКЛЮЧЕНО" : "ОТКЛЮЧЕНО"}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  • Мониторинг в реальном времени • {devices.length} устройства
                  • {data.length} записей
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    connected ? "bg-green-500" : "bg-red-500"
                  } animate-pulse`}
                ></div>
                <span className="text-gray-900 dark:text-white text-lg font-medium">
                  {connected ? "Активен" : "Нет связи"}
                </span>
              </div>
              {lastUpdate && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Обновлено: {lastUpdate.toLocaleTimeString("ru-RU")}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-yellow-600 dark:text-yellow-400">
                    bolt
                  </span>
                </div>
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 group-hover:animate-pulse">
                  trending_up
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Текущая мощность
              </p>
              <p className="text-gray-900 dark:text-white text-3xl font-bold">
                {totals.power.toFixed(1)}{" "}
                <span className="text-xl text-gray-500 dark:text-gray-400">
                  Вт
                </span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">
                    wb_sunny
                  </span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  Сегодня
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Выработано энергии
              </p>
              <p className="text-gray-900 dark:text-white text-3xl font-bold">
                {totals.energyToday.toFixed(1)}{" "}
                <span className="text-xl text-gray-500 dark:text-gray-400">
                  кВт·ч
                </span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">
                    devices
                  </span>
                </div>
                <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                  {totals.activeDevices}/{devices.length}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Активные устройства
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-gray-900 dark:text-white text-3xl font-bold">
                  {totals.activeDevices}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  онлайн
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-2xl text-purple-600 dark:text-purple-400">
                    database
                  </span>
                </div>
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 animate-pulse">
                  sync
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                Всего данных
              </p>
              <p className="text-gray-900 dark:text-white text-3xl font-bold">
                {data.length}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Flow Diagram Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-900 dark:to-emerald-900/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                  account_tree
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Визуализация системы
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Динамическая схема потоков энергии
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFullPageFlow(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors duration-200 font-medium"
            >
              <span className="material-symbols-outlined">fullscreen</span>
              Открыть в полный экран
            </button>
          </div>

          <div className="h-[400px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              className="bg-gradient-to-br from-gray-50 to-emerald-50/50 dark:from-gray-900 dark:to-emerald-900/10 font-manrope"
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              style={{ fontFamily: "Manrope" }}
            >
              <Controls
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
                showInteractive={false}
              />
              <Background
                variant="dots"
                gap={20}
                size={1}
                color="#9ca3af"
                className="opacity-30"
              />
            </ReactFlow>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-wrap gap-3 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500 border border-green-600"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Инверторы
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500 border border-purple-600"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Счётчики
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Электросеть
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-pink-500 border border-pink-600"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Мониторинг
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-yellow-500 animate-pulse"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Поток энергии
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Device Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                  solar_power
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Устройства системы
              </h2>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {devices.length} устройств
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:border-green-500/30 dark:hover:border-green-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${
                        device.active
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-gray-500/10 border-gray-500/20"
                      } border flex items-center justify-center`}
                    >
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                        devices
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        Устройство {device.id}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                        {device.name}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      device.active
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  ></div>
                </div>

                <div className="space-y-3">
                  {Object.entries(device.parameters)
                    .slice(0, 3)
                    .map(([key, param], idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {key}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {param.value.toFixed(2)} {param.unit}
                        </span>
                      </div>
                    ))}
                </div>

                {device.lastUpdate && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      Обновлено: {formatTime(device.lastUpdate)}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Data Stream */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                  data_usage
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Поток данных в реальном времени
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Активен
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Устройство
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Параметр
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Значение
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Качество
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Время
                  </th>
                </tr>
              </thead>
              <tbody>
                {data
                  .slice(-20)
                  .reverse()
                  .map((item, index) => (
                    <motion.tr
                      key={`${item.deviceId}-${item.registerId}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {item.deviceId}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              Устройство {item.deviceId}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[150px]">
                              {item.deviceName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {item.registerName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {item.value}{" "}
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                            {item.unit}
                          </span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.quality === "GOOD"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          {item.quality}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(item.timestamp)}
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>

          {data.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
                hourglass_empty
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Ожидание данных...
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
