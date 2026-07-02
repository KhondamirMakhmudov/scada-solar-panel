import ParametrizedShape from "../base/ParametrizedShape";
import type { ShapeComponentProps } from "../base/shapeProps";

const Breaker = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const closed = Boolean(state?.closed ?? true);
  const cy = height / 2;
  const midX = width / 2;

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
      <line
        x1={0}
        y1={cy}
        x2={width * 0.35}
        y2={cy}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
      <line
        x1={width * 0.65}
        y1={cy}
        x2={width}
        y2={cy}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
      <circle cx={width * 0.35} cy={cy} r={2.5} fill={style.stroke} />
      <circle cx={width * 0.65} cy={cy} r={2.5} fill={style.stroke} />
      {closed ? (
        <line
          x1={width * 0.35}
          y1={cy}
          x2={width * 0.65}
          y2={cy}
          stroke="#4ade80"
          strokeWidth={style.strokeWidth + 1}
        />
      ) : (
        <line
          x1={width * 0.35}
          y1={cy}
          x2={width * 0.65}
          y2={cy - height * 0.3}
          stroke="#f87171"
          strokeWidth={style.strokeWidth + 1}
        />
      )}
      <rect
        x={midX - 8}
        y={cy - height * 0.4}
        width={16}
        height={10}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={1}
      />
      {label && (
        <text x={midX} y={height + 14} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Breaker;
