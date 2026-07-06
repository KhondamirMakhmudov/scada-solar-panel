import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const Tank = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const rawLevel = Number(state?.level ?? 0.5);
  const level = Math.min(1, Math.max(0, Number.isFinite(rawLevel) ? rawLevel : 0.5));
  const clipId = `tank-clip-${element.id}`;
  const liquidHeight = height * level;

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
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} rx={6} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={0} width={width} height={height} fill="#0e0e0e" />
        <rect
          x={0}
          y={height - liquidHeight}
          width={width}
          height={liquidHeight}
          fill={style.fill}
          opacity={style.opacity}
        />
      </g>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={6}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Tank;
