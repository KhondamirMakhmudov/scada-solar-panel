import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const Valve = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const open = Boolean(state?.open);
  const cx = width / 2;
  const cy = height / 2;
  const half = Math.min(width, height) / 2 - style.strokeWidth;

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
        x1={-6}
        y1={cy}
        x2={width + 6}
        y2={cy}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
      <path
        d={`M ${cx - half} ${cy - half} L ${cx} ${cy} L ${cx - half} ${cy + half} Z M ${cx + half} ${cy - half} L ${cx} ${cy} L ${cx + half} ${cy + half} Z`}
        fill={open ? "none" : style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
      <line
        x1={cx}
        y1={cy - half - 4}
        x2={cx}
        y2={cy - half - 16}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        transform={`rotate(${open ? 90 : 0} ${cx} ${cy - half - 4})`}
      />
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Valve;
