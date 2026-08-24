import ParametrizedShape from "./base/ParametrizedShape";
import PipeFlange from "./base/PipeFlange";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken, METAL_BASE as METAL } from "../lib/color";

const BLADE_ANGLES = [0, 90, 180, 270];

/** One curved impeller blade, drawn pointing up from the hub. */
function bladePath(r: number): string {
  const tipY = -r * 0.82;
  const tipX = r * 0.16;
  return `M 0 0 Q ${tipX} ${tipY * 0.55} ${tipX * 0.5} ${tipY} Q 0 ${tipY * 1.05} ${-tipX * 0.6} ${tipY * 0.6} Q -${tipX * 0.3} ${tipY * 0.25} 0 0 Z`;
}

/**
 * Centrifugal pump: metallic housing (radial gradient off the shape's own
 * fill color, so it stays customizable) with pipe flanges on both sides and
 * a curved impeller that spins while `state.running` is true.
 */
const Pump = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const running = Boolean(state?.running);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - style.strokeWidth;
  const housingColor = style.fill === "none" ? "#1e3a8a" : style.fill;

  const housingGradId = `pump-housing-${element.id}`;
  const flangeGradId = `pump-flange-${element.id}`;
  const shadowId = `pump-shadow-${element.id}`;

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
        <radialGradient id={housingGradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={lighten(housingColor, 0.55)} />
          <stop offset="45%" stopColor={housingColor} />
          <stop offset="100%" stopColor={darken(housingColor, 0.45)} />
        </radialGradient>
        <linearGradient id={flangeGradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lighten(METAL, 0.3)} />
          <stop offset="100%" stopColor={darken(METAL, 0.15)} />
        </linearGradient>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      <PipeFlange x={-9} cy={cy} height={height * 0.18} gradientId={flangeGradId} />
      <PipeFlange x={width - 9} cy={cy} height={height * 0.18} gradientId={flangeGradId} />

      <circle cx={cx} cy={cy} r={r} fill={`url(#${housingGradId})`} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} filter={`url(#${shadowId})`} />

      <g>
        {running && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`360 ${cx} ${cy}`}
            dur="1.4s"
            repeatCount="indefinite"
          />
        )}
        {BLADE_ANGLES.map((angle) => (
          <path
            key={angle}
            d={bladePath(r)}
            fill={darken(housingColor, 0.55)}
            opacity={0.85}
            transform={`translate(${cx} ${cy}) rotate(${angle})`}
          />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.16} fill={lighten(housingColor, 0.2)} stroke={darken(housingColor, 0.4)} strokeWidth={0.75} />
      </g>

      {/* Housing rim highlight */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={lighten(housingColor, 0.6)} strokeWidth={0.75} opacity={0.5} />

      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Pump;
