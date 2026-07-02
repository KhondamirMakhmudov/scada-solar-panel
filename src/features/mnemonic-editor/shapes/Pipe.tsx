import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const Pipe = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state } = element;
  const variant = String(state?.variant ?? "straight");
  const flowing = Boolean(state?.flowing);
  const strokeWidth = Math.max(style.strokeWidth, 6);
  const cy = height / 2;
  const cx = width / 2;

  let pathD = `M 0 ${cy} L ${width} ${cy}`;
  if (variant === "angled") {
    pathD = `M 0 ${cy} L ${cx} ${cy} L ${width} 0`;
  } else if (variant === "tee") {
    pathD = `M 0 ${cy} L ${width} ${cy} M ${cx} ${cy} L ${cx} ${height}`;
  }

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
        d={pathD}
        fill="none"
        stroke={style.stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={style.opacity}
      />
      {flowing && (
        <path
          d={pathD}
          fill="none"
          stroke="#e0f2fe"
          strokeWidth={2}
          strokeDasharray="6 10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        >
          <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />
        </path>
      )}
    </ParametrizedShape>
  );
};

export default Pipe;
