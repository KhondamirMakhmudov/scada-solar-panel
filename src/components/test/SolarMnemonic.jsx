import SolarPanel from "./SolarPanel";
import Inverter from "./Inverter";
import Battery from "./Battery";
import PowerLine from "./PowerLine";

export default function SolarMnemonic({ data }) {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="300">
      {/* Power lines */}
      <PowerLine active={data.pvActive} x1={100} y1={60} x2={160} y2={60} />
      <PowerLine active={data.invRunning} x1={205} y1={85} x2={205} y2={120} />

      {/* Devices */}
      <SolarPanel active={data.pvActive} />
      <Inverter running={data.invRunning} />
      <Battery charging={data.batteryCharging} />
    </svg>
  );
}
