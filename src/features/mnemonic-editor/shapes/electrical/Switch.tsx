import ParametrizedShape from "../base/ParametrizedShape";
import type { ShapeComponentProps } from "../base/shapeProps";

const Switch = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const on = Boolean(state?.on ?? true);
  const cy = height / 2;
  const p1x = width * 0.2;
  const p2x = width * 0.8;

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
      <line x1={0} y1={cy} x2={p1x} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <line x1={p2x} y1={cy} x2={width} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <circle cx={p1x} cy={cy} r={2.5} fill={style.stroke} />
      <circle cx={p2x} cy={cy} r={2.5} fill={style.stroke} />
      <line
        x1={p1x}
        y1={cy}
        x2={on ? p2x : p2x - width * 0.1}
        y2={on ? cy : cy - height * 0.35}
        stroke={on ? "#4ade80" : style.stroke}
        strokeWidth={style.strokeWidth + 1}
      />
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Switch;
