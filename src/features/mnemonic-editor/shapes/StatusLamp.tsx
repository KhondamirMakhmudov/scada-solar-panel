import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const LAMP_COLORS: Record<string, string> = {
  green: "#4ade80",
  red: "#f87171",
  yellow: "#facc15",
};

const StatusLamp = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const color = LAMP_COLORS[String(state?.color ?? "green")] || LAMP_COLORS.green;
  const blinking = Boolean(state?.blinking);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - style.strokeWidth;

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
      <circle cx={cx} cy={cy} r={r} fill={color} stroke={style.stroke} strokeWidth={style.strokeWidth}>
        {blinking && (
          <animate attributeName="opacity" values="1;0.25;1" dur="0.8s" repeatCount="indefinite" />
        )}
      </circle>
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default StatusLamp;
