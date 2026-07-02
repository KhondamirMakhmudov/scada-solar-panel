import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const COLS = 3;
const ROWS = 2;

const SolarPanel = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const generating = Boolean(state?.generating ?? true);
  const cellW = width / COLS;
  const cellH = height / ROWS;

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
        rx={3}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
      {Array.from({ length: COLS - 1 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={(i + 1) * cellW}
          y1={2}
          x2={(i + 1) * cellW}
          y2={height - 2}
          stroke={style.stroke}
          strokeWidth={1}
          opacity={0.5}
        />
      ))}
      {Array.from({ length: ROWS - 1 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={2}
          y1={(i + 1) * cellH}
          x2={width - 2}
          y2={(i + 1) * cellH}
          stroke={style.stroke}
          strokeWidth={1}
          opacity={0.5}
        />
      ))}
      {generating && (
        <rect x={0} y={0} width={width} height={height} rx={3} fill="none" stroke="#fbbf24" strokeWidth={2}>
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
        </rect>
      )}
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default SolarPanel;
