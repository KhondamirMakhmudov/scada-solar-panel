import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken } from "../lib/color";

const STATUS_COLORS: Record<string, string> = {
  running: "#4ade80",
  fault: "#f87171",
  standby: "#94a3b8",
};

/** Inverter enclosure: shaded metal cabinet with a recessed display (DC bars + AC waveform, unchanged iconography) and a status LED, plus cooling-vent slits for texture. */
const Inverter = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const status = String(state?.status ?? "running");
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.standby;
  const cy = height / 2;
  const cabinetColor = style.fill === "none" ? "#334155" : style.fill;

  const cabinetGradId = `inv-cabinet-${element.id}`;
  const displayGradId = `inv-display-${element.id}`;

  return (
    <ParametrizedShape
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      <defs>
        <linearGradient id={cabinetGradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lighten(cabinetColor, 0.25)} />
          <stop offset="100%" stopColor={darken(cabinetColor, 0.3)} />
        </linearGradient>
        <linearGradient id={displayGradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0a1018" />
          <stop offset="100%" stopColor="#050810" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={width} height={height} rx={6} fill={`url(#${cabinetGradId})`} stroke={statusColor} strokeWidth={style.strokeWidth + 1} opacity={style.opacity} />

      {/* Cooling vents */}
      {[0.16, 0.22, 0.28].map((f) => (
        <line key={f} x1={width * 0.06} y1={height * f} x2={width * 0.34} y2={height * f} stroke={darken(cabinetColor, 0.45)} strokeWidth={1.5} opacity={0.7} />
      ))}

      {/* Recessed display */}
      <rect x={width * 0.4} y={cy - height * 0.22} width={width * 0.5} height={height * 0.44} rx={2} fill={`url(#${displayGradId})`} stroke={darken(cabinetColor, 0.4)} strokeWidth={0.75} />
      <line x1={width * 0.48} y1={cy - 6} x2={width * 0.48} y2={cy + 6} stroke={style.stroke} strokeWidth={2} />
      <line x1={width * 0.55} y1={cy - 6} x2={width * 0.55} y2={cy + 6} stroke={style.stroke} strokeWidth={2} strokeDasharray="2 2" />
      <path
        d={`M ${width * 0.63} ${cy} Q ${width * 0.7} ${cy - 7} ${width * 0.77} ${cy} T ${width * 0.87} ${cy}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth={1.5}
      />

      {/* Status LED */}
      <circle cx={width * 0.12} cy={height * 0.16} r={2.2} fill={statusColor} style={{ filter: `drop-shadow(0 0 2.5px ${statusColor})` }} />

      <text x={width / 2} y={height * 0.85} textAnchor="middle" fontSize={9} fill={style.stroke}>
        INV
      </text>
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Inverter;
