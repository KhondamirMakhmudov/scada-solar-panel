import ParametrizedShape from "../base/ParametrizedShape";
import type { ShapeComponentProps } from "../base/shapeProps";

const Transformer = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const energized = Boolean(state?.energized ?? true);
  const cy = height / 2;
  const r = Math.min(width * 0.32, height * 0.4);
  const leftCx = width * 0.38;
  const rightCx = width * 0.62;
  const windingColor = energized ? "#facc15" : style.stroke;

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
      <line x1={0} y1={cy} x2={leftCx - r} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <line x1={rightCx + r} y1={cy} x2={width} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <circle cx={leftCx} cy={cy} r={r} fill="none" stroke={windingColor} strokeWidth={style.strokeWidth} />
      <circle cx={rightCx} cy={cy} r={r} fill="none" stroke={windingColor} strokeWidth={style.strokeWidth} />
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Transformer;
