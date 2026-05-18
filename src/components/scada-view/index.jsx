import { useState, useCallback, useEffect, useMemo } from "react";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import ApartmentIcon from "@mui/icons-material/Apartment";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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

const ScadaFlowComponent = ({
  devices = [],
  data = [],
  totals = {},
  connected = false,
  fullPage = false,
  onClose = null,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Initialize flow diagram based on device data
  useEffect(() => {
    if (devices.length > 0) {
      initializeFlowDiagram();
    }
  }, [devices.length]);

  // Update diagram when new data arrives
  useEffect(() => {
    if (data.length > 0) {
      updateFlowDiagram(data);
    }
  }, [data]);

  const initializeFlowDiagram = () => {
    const nodePositions = [
      { x: 100, y: 100 },
      { x: 100, y: 300 },
      { x: 400, y: 100 },
      { x: 400, y: 300 },
      { x: 700, y: 200 },
      { x: 400, y: 500 },
      { x: 700, y: 400 },
    ];

    const newNodes = devices.map((device, index) => {
      const position = nodePositions[index] || { x: 100 + index * 300, y: 200 };

      let deviceType = "inverter";
      let icon = "вљЎ";
      let bgColor = "linear-gradient(135deg, #10b981 0%, #059669 100%)";

      if (device.name.toLowerCase().includes("СЃС‡С‘С‚С‡РёРє")) {
        deviceType = "meter";
        icon = "рџ“Љ";
        bgColor = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
      }

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
          label: (
            <span className="inline-flex items-center gap-2">
              <DeviceIcon fontSize="inherit" className="text-[18px]" />
              <span>{device.name}</span>
            </span>
          ),
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
            ? `${device.parameters[tempParam].value.toFixed(1)}В°C`
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

    newNodes.push({
      id: "grid",
      type: "output",
      position: { x: 700, y: 200 },
      data: {
        label: "рџЏў Р­Р»РµРєС‚СЂРѕСЃРµС‚СЊ",
        type: "grid",
        power: `${totals.power?.toFixed(1) || 0}W`,
        status: "connected",
        devices: `${devices.length} СѓСЃС‚СЂРѕР№СЃС‚РІР°`,
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
        label: "рџ“Љ SCADA РњРѕРЅРёС‚РѕСЂРёРЅРі",
        type: "monitoring",
        dataPoints: data.length,
        activeDevices: totals.activeDevices || 0,
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

    devices.forEach((device, index) => {
      if (index < 2) {
        newEdges.push({
          id: `edge-solar-${device.id}`,
          source: `device-${device.id}`,
          target: "grid",
          type: "smoothstep",
          animated: (totals.power || 0) > 0,
          style: {
            stroke: (totals.power || 0) > 0 ? "#fbbf24" : "#9ca3af",
            strokeWidth: 3,
            opacity: device.active ? 1 : 0.3,
          },
          label: `${
            device.parameters["Output power"]?.value?.toFixed(1) || 0
          }W`,
          labelStyle: {
            fill: (totals.power || 0) > 0 ? "#f59e0b" : "#6b7280",
            fontWeight: "bold",
            fontSize: 12,
          },
          labelBgStyle: { fill: "white", fillOpacity: 0.8, rx: 4, ry: 4 },
        });
      }

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
    setNodes((nds) =>
      nds.map((node) => {
        if (node.data.deviceId) {
          const deviceData = newData.filter(
            (item) => item.deviceId === node.data.deviceId
          );

          if (deviceData.length > 0) {
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
                  ? `${updatedParams[tempParam].value.toFixed(1)}В°C`
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
          return {
            ...node,
            data: {
              ...node.data,
              power: `${totals.power?.toFixed(1) || 0}W`,
            },
          };
        } else if (node.id === "monitoring") {
          return {
            ...node,
            data: {
              ...node.data,
              dataPoints: data.length,
              activeDevices: totals.activeDevices || 0,
            },
          };
        }
        return node;
      })
    );

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source.startsWith("device-")) {
          const deviceId = parseInt(edge.source.split("-")[1]);
          const deviceData = newData.find(
            (item) =>
              item.deviceId === deviceId &&
              item.registerName.toLowerCase().includes("power")
          );

          const hasPower = deviceData?.value > 0 || (totals.power || 0) > 0;

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

  if (fullPage) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-900 dark:to-gray-950">
        <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition-colors duration-200"
                >
                  <span className="text-xl">в†ђ</span>
                  РќР°Р·Р°Рґ Рє РїР°РЅРµР»Рё
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Р’РёР·СѓР°Р»РёР·Р°С†РёСЏ SCADA СЃРёСЃС‚РµРјС‹
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
                  {connected ? "РџРѕРґРєР»СЋС‡РµРЅРѕ" : "РћС‚РєР»СЋС‡РµРЅРѕ"}
                </span>
              </div>
              <div className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold">
                {totals.power?.toFixed(0) || 0}W
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
                РЎС‚Р°С‚РёСЃС‚РёРєР° СЃРёСЃС‚РµРјС‹
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    РЈСЃС‚СЂРѕР№СЃС‚РІР°:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {devices.length} С€С‚.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    РњРѕС‰РЅРѕСЃС‚СЊ:
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {totals.power?.toFixed(1) || 0}W
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    РЎРµРіРѕРґРЅСЏ:
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {totals.energyToday?.toFixed(1) || 0} РєР’С‚В·С‡
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Р”Р°РЅРЅС‹Рµ:
                  </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {data.length} Р·Р°РїРёСЃРµР№
                  </span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-900 dark:to-emerald-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <span className="text-2xl">рџЊђ</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Р’РёР·СѓР°Р»РёР·Р°С†РёСЏ СЃРёСЃС‚РµРјС‹
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Р”РёРЅР°РјРёС‡РµСЃРєР°СЏ СЃС…РµРјР° РїРѕС‚РѕРєРѕРІ СЌРЅРµСЂРіРёРё
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors duration-200 font-medium"
          >
            <span className="text-xl">в›¶</span>
            РћС‚РєСЂС‹С‚СЊ РІ РїРѕР»РЅС‹Р№ СЌРєСЂР°РЅ
          </button>
        )}
      </div>

      <div className="h-[400px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-gradient-to-br from-gray-50 to-emerald-50/50 dark:from-gray-900 dark:to-emerald-900/10"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
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
              РРЅРІРµСЂС‚РѕСЂС‹
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500 border border-purple-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              РЎС‡С‘С‚С‡РёРєРё
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Р­Р»РµРєС‚СЂРѕСЃРµС‚СЊ
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-pink-500 border border-pink-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              РњРѕРЅРёС‚РѕСЂРёРЅРі
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-yellow-500 animate-pulse"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              РџРѕС‚РѕРє СЌРЅРµСЂРіРёРё
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScadaFlowComponent;


