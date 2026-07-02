import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const START_ANGLE = -120;
const END_ANGLE = 120;

function arcPoint(cx: number, cy: number, angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

const Gauge = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const min = Number(state?.min ?? 0);
  const max = Number(state?.max ?? 100);
  const rawValue = Number(state?.value ?? min);
  const clamped = Math.min(max, Math.max(min, Number.isFinite(rawValue) ? rawValue : min));
  const ratio = max > min ? (clamped - min) / (max - min) : 0;

  const cx = width / 2;
  const cy = height * 0.6;
  const r = Math.min(width, height * 0.9) / 2 - style.strokeWidth;

  const needleAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);
  const needleTip = arcPoint(cx, cy, needleAngle, r * 0.85);
  const arcStart = arcPoint(cx, cy, START_ANGLE, r);
  const arcEnd = arcPoint(cx, cy, END_ANGLE, r);
  const needleColor = style.fill === "none" ? style.stroke : style.fill;

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
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={0.5}
      />
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke={needleColor}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={3} fill={style.stroke} />
      <text x={cx} y={cy + r * 0.55} textAnchor="middle" fontSize={10} fill="#e5e2e1">
        {Math.round(clamped)}
      </text>
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Gauge;
