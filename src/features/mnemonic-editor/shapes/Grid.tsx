import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken, METAL_BASE as METAL } from "../lib/color";

/** External-grid connection: a lattice pylon silhouette (tapered trapezoid body instead of a bare stick figure) with insulator discs at the cross-arm tips, glowing when connected. */
const Grid = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const connected = Boolean(state?.connected ?? true);
  const color = connected ? "#4ade80" : "#94a3b8";
  const cx = width / 2;

  const towerGradId = `grid-tower-${element.id}`;
  const glowId = `grid-glow-${element.id}`;

  const baseW = width * 0.22;
  const topW = width * 0.04;
  const baseY = height - 6;
  const topY = 4;

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
        <linearGradient id={towerGradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={darken(METAL, 0.2)} />
          <stop offset="50%" stopColor={lighten(METAL, 0.25)} />
          <stop offset="100%" stopColor={darken(METAL, 0.2)} />
        </linearGradient>
        {connected && (
          <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Tapered lattice-tower body */}
      <path
        d={`M ${cx - baseW} ${baseY} L ${cx - topW} ${topY} L ${cx + topW} ${topY} L ${cx + baseW} ${baseY} Z`}
        fill={`url(#${towerGradId})`}
        stroke={darken(METAL, 0.35)}
        strokeWidth={0.75}
        opacity={style.opacity}
      />
      {/* Cross-brace lattice texture */}
      {[0.3, 0.55, 0.8].map((f) => {
        const yy = topY + (baseY - topY) * f;
        const w = topW + (baseW - topW) * f;
        return (
          <path
            key={f}
            d={`M ${cx - w} ${yy} L ${cx + w} ${yy - (baseY - topY) * 0.06} M ${cx - w} ${yy - (baseY - topY) * 0.06} L ${cx + w} ${yy}`}
            stroke={darken(METAL, 0.4)}
            strokeWidth={0.6}
            opacity={0.6}
          />
        );
      })}

      <g filter={connected ? `url(#${glowId})` : undefined}>
        <line x1={cx} y1={topY} x2={cx} y2={height - 10} stroke={color} strokeWidth={style.strokeWidth + 1} />
        <line x1={width * 0.15} y1={height * 0.25} x2={width * 0.85} y2={height * 0.25} stroke={color} strokeWidth={2} />
        <line x1={width * 0.25} y1={height * 0.45} x2={width * 0.75} y2={height * 0.45} stroke={color} strokeWidth={2} />
        <line x1={cx} y1={height - 10} x2={width * 0.15} y2={height} stroke={color} strokeWidth={2} />
        <line x1={cx} y1={height - 10} x2={width * 0.85} y2={height} stroke={color} strokeWidth={2} />

        {/* Insulator discs (stacked ellipses) instead of a bare dot */}
        {[width * 0.15, width * 0.85].map((ix) => (
          <g key={ix}>
            <ellipse cx={ix} cy={height * 0.25 - 3} rx={2.4} ry={1.3} fill={lighten(color, 0.3)} opacity={0.9} />
            <ellipse cx={ix} cy={height * 0.25} rx={2.4} ry={1.3} fill={color} />
            <ellipse cx={ix} cy={height * 0.25 + 3} rx={2.4} ry={1.3} fill={darken(color, 0.2)} opacity={0.9} />
          </g>
        ))}
      </g>

      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Grid;
