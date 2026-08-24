import ParametrizedShape from "./base/ParametrizedShape";
import PipeFlange from "./base/PipeFlange";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken, METAL_BASE as METAL } from "../lib/color";

/**
 * Gate valve: ISA-style bowtie on a round body, pipe flanges tying it into
 * the line on both sides, and a lever that rotates 90° between the closed
 * (across the pipe) and open (along the pipe) positions.
 */
const Valve = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const open = Boolean(state?.open);
  const cx = width / 2;
  const cy = height / 2;
  const half = Math.min(width, height) / 2 - style.strokeWidth;
  const bodyColor = style.fill === "none" ? "#134e4a" : style.fill;

  const bodyGradId = `valve-body-${element.id}`;
  const flangeGradId = `valve-flange-${element.id}`;
  const leverGradId = `valve-lever-${element.id}`;

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
        <radialGradient id={bodyGradId} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={lighten(bodyColor, 0.5)} />
          <stop offset="55%" stopColor={bodyColor} />
          <stop offset="100%" stopColor={darken(bodyColor, 0.4)} />
        </radialGradient>
        <linearGradient id={flangeGradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lighten(METAL, 0.3)} />
          <stop offset="100%" stopColor={darken(METAL, 0.15)} />
        </linearGradient>
        <linearGradient id={leverGradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={darken(style.stroke, 0.25)} />
          <stop offset="50%" stopColor={lighten(style.stroke, 0.35)} />
          <stop offset="100%" stopColor={darken(style.stroke, 0.25)} />
        </linearGradient>
      </defs>

      {/* Pipe run through the valve */}
      <line x1={-6} y1={cy} x2={width + 6} y2={cy} stroke={METAL} strokeWidth={Math.max(3, style.strokeWidth * 2.5)} opacity={0.5} />

      <PipeFlange x={-9} cy={cy} height={height * 0.55} gradientId={flangeGradId} />
      <PipeFlange x={width - 9} cy={cy} height={height * 0.55} gradientId={flangeGradId} />

      {/* Round valve body behind the bowtie, like a real gate/ball valve casing */}
      <circle cx={cx} cy={cy} r={half * 0.92} fill={`url(#${bodyGradId})`} opacity={style.opacity} />
      <circle cx={cx} cy={cy} r={half * 0.92} fill="none" stroke={darken(bodyColor, 0.5)} strokeWidth={0.75} opacity={0.6} />

      {/* ISA bowtie: filled = closed, hollow = open */}
      <path
        d={`M ${cx - half} ${cy - half} L ${cx} ${cy} L ${cx - half} ${cy + half} Z M ${cx + half} ${cy - half} L ${cx} ${cy} L ${cx + half} ${cy + half} Z`}
        fill={open ? "none" : darken(bodyColor, 0.15)}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />

      {/* Stem + T-handle, rotating open/closed about the stem base */}
      <g transform={`rotate(${open ? 90 : 0} ${cx} ${cy - half - 4})`}>
        <line x1={cx} y1={cy - half - 4} x2={cx} y2={cy - half - 15} stroke={darken(METAL, 0.1)} strokeWidth={Math.max(2, style.strokeWidth)} />
        <rect x={cx - 9} y={cy - half - 18} width={18} height={4} rx={2} fill={`url(#${leverGradId})`} stroke={darken(style.stroke, 0.3)} strokeWidth={0.5} />
      </g>

      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Valve;
