import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const Grid = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const connected = Boolean(state?.connected ?? true);
  const color = connected ? "#4ade80" : "#94a3b8";
  const cx = width / 2;

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
      <line x1={cx} y1={4} x2={cx} y2={height - 8} stroke={color} strokeWidth={style.strokeWidth + 1} />
      <line x1={width * 0.15} y1={height * 0.25} x2={width * 0.85} y2={height * 0.25} stroke={color} strokeWidth={2} />
      <line x1={width * 0.25} y1={height * 0.45} x2={width * 0.75} y2={height * 0.45} stroke={color} strokeWidth={2} />
      <line x1={cx} y1={height - 8} x2={width * 0.15} y2={height} stroke={color} strokeWidth={2} />
      <line x1={cx} y1={height - 8} x2={width * 0.85} y2={height} stroke={color} strokeWidth={2} />
      <circle cx={width * 0.15} cy={height * 0.25} r={2} fill={color} />
      <circle cx={width * 0.85} cy={height * 0.25} r={2} fill={color} />
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Grid;
