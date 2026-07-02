import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const Motor = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const running = Boolean(state?.running);
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
      <rect
        x={-6}
        y={cy - height * 0.06}
        width={10}
        height={height * 0.12}
        fill={style.stroke}
        opacity={style.opacity}
      />
      <rect
        x={width - 4}
        y={cy - height * 0.06}
        width={10}
        height={height * 0.12}
        fill={style.stroke}
        opacity={style.opacity}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r}
        fontWeight="bold"
        fill={style.stroke}
      >
        M
      </text>
      {running && (
        <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="#4ade80" strokeWidth={2}>
          <animate attributeName="r" values={`${r + 2};${r + 8};${r + 2}`} dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Motor;
