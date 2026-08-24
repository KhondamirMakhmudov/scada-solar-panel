import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken } from "../lib/color";

const LAMP_COLORS: Record<string, string> = {
  green: "#4ade80",
  red: "#f87171",
  yellow: "#facc15",
};

/** Pilot light: a glass-dome radial gradient (bright top-left highlight, darker rim) plus a soft outer glow, instead of a flat filled disc. */
const StatusLamp = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const color = LAMP_COLORS[String(state?.color ?? "green")] || LAMP_COLORS.green;
  const blinking = Boolean(state?.blinking);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - style.strokeWidth;

  const glassGradId = `lamp-glass-${element.id}`;
  const glowId = `lamp-glow-${element.id}`;

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
        <radialGradient id={glassGradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={lighten(color, 0.55)} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={darken(color, 0.35)} />
        </radialGradient>
        <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={Math.max(1.5, r * 0.35)} />
        </filter>
      </defs>

      {/* Soft halo behind the lens */}
      <circle cx={cx} cy={cy} r={r * 0.95} fill={color} opacity={0.45} filter={`url(#${glowId})`}>
        {blinking && <animate attributeName="opacity" values="0.45;0.05;0.45" dur="0.8s" repeatCount="indefinite" />}
      </circle>

      <circle cx={cx} cy={cy} r={r} fill={`url(#${glassGradId})`} stroke={style.stroke} strokeWidth={style.strokeWidth}>
        {blinking && <animate attributeName="opacity" values="1;0.25;1" dur="0.8s" repeatCount="indefinite" />}
      </circle>
      {/* Glass highlight */}
      <ellipse cx={cx - r * 0.32} cy={cy - r * 0.35} rx={r * 0.28} ry={r * 0.18} fill="#fff" opacity={0.55} />

      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default StatusLamp;
