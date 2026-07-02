import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const BLADE_ANGLES = [0, 120, 240];

const Pump = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
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
        y={cy - height * 0.08}
        width={10}
        height={height * 0.16}
        fill={style.stroke}
        opacity={style.opacity}
      />
      <rect
        x={width - 4}
        y={cy - height * 0.08}
        width={10}
        height={height * 0.16}
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
      <g>
        {running && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`360 ${cx} ${cy}`}
            dur="1.6s"
            repeatCount="indefinite"
          />
        )}
        {BLADE_ANGLES.map((angle) => (
          <rect
            key={angle}
            x={cx - r * 0.08}
            y={cy - r * 0.75}
            width={r * 0.16}
            height={r * 0.75}
            fill={style.stroke}
            opacity={0.6}
            transform={`rotate(${angle} ${cx} ${cy})`}
          />
        ))}
      </g>
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Pump;
