import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// --- 1. THE SIEMENS HMI CUSTOM NODE ---
// This component re-renders when data.registers changes
const ScadaMnemoNode = ({ data }) => {
  return (
    <div className="flex flex-col items-center">
      {/* Dynamic Data Window (HMI Tag Display) */}
      <div className="mb-2 bg-black border-2 border-slate-800 p-2 rounded shadow-2xl min-w-[140px] font-mono">
        <div className="text-[9px] text-slate-500 border-b border-slate-800 pb-1 mb-1 truncate uppercase">
          {data.deviceName || "Searching..."}
        </div>

        {/* Render all registers found for this device */}
        {data.registers && Object.values(data.registers).length > 0 ? (
          Object.values(data.registers).map((reg) => (
            <div
              key={reg.id}
              className="flex justify-between gap-2 text-[11px] leading-tight"
            >
              <span className="text-slate-400 uppercase text-[8px]">
                {reg.name}:
              </span>
              <span className="text-emerald-400 font-bold">
                {reg.value}{" "}
                <small className="text-slate-600 text-[9px]">{reg.unit}</small>
              </span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-slate-700 animate-pulse italic">
            Waiting for Tags...
          </div>
        )}
      </div>

      {/* Industrial Symbol */}
      <div
        className="w-16 h-16 flex items-center justify-center bg-slate-900 border-2 rounded-md transition-all duration-300"
        style={{
          borderColor: data.color || "#3b82f6",
          boxShadow: `0 0 15px ${data.color}33`,
        }}
      >
        <span
          className="material-symbols-outlined text-4xl"
          style={{ color: data.color || "#3b82f6" }}
        >
          {data.icon}
        </span>
      </div>

      <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        {data.label}
      </div>

      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { scadaNode: ScadaMnemoNode };

const Index = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: "solar",
      type: "scadaNode",
      position: { x: 50, y: 200 },
      data: {
        label: "Solar Array",
        icon: "solar_power",
        color: "#60a5fa",
        deviceId: 2,
        registers: {},
      },
    },
    {
      id: "inverter",
      type: "scadaNode",
      position: { x: 350, y: 200 },
      data: {
        label: "Inverter",
        icon: "bolt",
        color: "#3b82f6",
        deviceId: 3,
        registers: {},
      },
    },
    {
      id: "grid",
      type: "scadaNode",
      position: { x: 650, y: 200 },
      data: {
        label: "Grid",
        icon: "grid_view",
        color: "#94a3b8",
        deviceId: 1,
        registers: {},
      },
    },
  ]);

  const [edges, setEdges] = useEdgesState([
    {
      id: "e1",
      source: "solar",
      target: "inverter",
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 3 },
    },
    {
      id: "e2",
      source: "inverter",
      target: "grid",
      animated: true,
      style: { stroke: "#94a3b8", strokeWidth: 3 },
    },
  ]);

  const [connected, setConnected] = useState(false);

  // --- 2. THE WEBSOCKET TO REACT-FLOW BRIDGE ---
  useEffect(() => {
    const ws = new WebSocket("ws://10.20.6.129:18081/ws/raw");

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "readings") {
          const readings = message.data;

          // CRITICAL: We update nodes by mapping the state
          setNodes((nds) =>
            nds.map((node) => {
              // Find readings belonging to this node's DeviceID
              const deviceMatches = readings.filter(
                (r) => r.deviceId === node.data.deviceId
              );

              if (deviceMatches.length === 0) return node;

              // Create a NEW registers object to trigger React change detection
              const updatedRegisters = { ...node.data.registers };

              deviceMatches.forEach((r) => {
                // Shorten the register name for the HMI display
                const shortName = r.registerName
                  .split("(")[0]
                  .trim()
                  .replace("The inside IPM in inverter", "IPM");

                updatedRegisters[r.registerId] = {
                  id: r.registerId,
                  name: shortName,
                  value: r.value,
                  unit: r.unit,
                };
              });

              // Return a NEW node object (immutability ensures the HMI updates)
              return {
                ...node,
                data: {
                  ...node.data,
                  deviceName: deviceMatches[0].deviceName,
                  registers: updatedRegisters, // The custom component will now re-render
                },
              };
            })
          );
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, [setNodes]);

  return (
    <DashboardLayout headerTitle="Solar Plant Mnemo-Schema">
      <div className="h-[750px] w-full bg-[#020617] relative my-4 rounded-lg">
        {/* HMI Status Bar */}
        <div className="absolute top-0 w-full h-10 bg-slate-900/90 border-b border-slate-800 flex items-center px-6 justify-between z-10 font-mono">
          <div className="flex gap-4 items-center">
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
              System Monitor
            </span>
            <div
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                connected
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {connected ? "CONNECTED" : "OFFLINE"}
            </div>
          </div>
          <div className="text-slate-500 text-[10px]">
            NODE_SYNC_ACTIVE: {new Date().toLocaleTimeString()}
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          fitView
          className="bg-[#020617]"
        >
          <Background color="#1e293b" variant="dot" gap={50} size={0.5} />
          <Controls />
        </ReactFlow>

        {/* Siemens-style Footer Legend */}
        <div className="absolute bottom-4 right-4 p-3 bg-black/60 border border-slate-800 rounded-md backdrop-blur-sm">
          <div className="text-[9px] text-slate-500 uppercase mb-2 border-b border-slate-800 pb-1">
            Telemetry Legend
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div className="flex items-center gap-2 text-[10px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Generation
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Valid
              Quality
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
