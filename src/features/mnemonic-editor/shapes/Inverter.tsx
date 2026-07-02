import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const STATUS_COLORS: Record<string, string> = {
  running: "#4ade80",
  fault: "#f87171",
  standby: "#94a3b8",
};

const Inverter = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const status = String(state?.status ?? "running");
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.standby;
  const cy = height / 2;

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
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={6}
        fill={style.fill}
        stroke={statusColor}
        strokeWidth={style.strokeWidth + 1}
        opacity={style.opacity}
      />
      <line x1={width * 0.18} y1={cy - 6} x2={width * 0.18} y2={cy + 6} stroke={style.stroke} strokeWidth={2} />
      <line
        x1={width * 0.26}
        y1={cy - 6}
        x2={width * 0.26}
        y2={cy + 6}
        stroke={style.stroke}
        strokeWidth={2}
        strokeDasharray="2 2"
      />
      <path
        d={`M ${width * 0.6} ${cy} Q ${width * 0.68} ${cy - 8} ${width * 0.76} ${cy} T ${width * 0.9} ${cy}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth={2}
      />
      <text x={width / 2} y={height * 0.82} textAnchor="middle" fontSize={9} fill={style.stroke}>
        INV
      </text>
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Inverter;
