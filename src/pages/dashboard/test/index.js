import { useState } from "react";
import SolarMnemonic from "@/components/test/SolarMnemonic";

export default function TestPage() {
  const [data, setData] = useState({
    pvActive: true,
    invRunning: true,
    batteryCharging: false,
  });

  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-6">
      <h1 className="text-xl font-semibold">
        Solar SCADA – Mnemonic Test Mode
      </h1>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={() =>
            setData((prev) => ({ ...prev, pvActive: !prev.pvActive }))
          }
          className="px-4 py-2 rounded bg-green-600 text-white"
        >
          Toggle PV
        </button>

        <button
          onClick={() =>
            setData((prev) => ({ ...prev, invRunning: !prev.invRunning }))
          }
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Toggle Inverter
        </button>

        <button
          onClick={() =>
            setData((prev) => ({
              ...prev,
              batteryCharging: !prev.batteryCharging,
            }))
          }
          className="px-4 py-2 rounded bg-yellow-500 text-white"
        >
          Toggle Battery
        </button>
      </div>

      {/* Mnemonic */}
      <SolarMnemonic data={data} />
    </div>
  );
}
