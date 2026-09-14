import ParametrizedShape from "../base/ParametrizedShape";
import Terminal from "../base/Terminal";
import type { ShapeComponentProps } from "../base/shapeProps";
import { lighten, darken } from "../../lib/color";

/** Two-winding transformer: the standard IEC pair-of-circles symbol, with a subtle coil-like radial shade and a soft glow on the windings while energized. */
const Transformer = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const energized = Boolean(state?.energized ?? true);
  const cy = height / 2;
  const r = Math.min(width * 0.32, height * 0.4);
  const leftCx = width * 0.38;
  const rightCx = width * 0.62;
  const windingColor = energized ? "#facc15" : style.stroke;

  const coilGradId = `xfmr-coil-${element.id}`;
  const glowId = `xfmr-glow-${element.id}`;

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
        <radialGradient id={coilGradId} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={lighten(windingColor, 0.5)} stopOpacity={0.25} />
          <stop offset="100%" stopColor={windingColor} stopOpacity={0} />
        </radialGradient>
        {energized && (
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            {/* Breathing blur radius — idle "alive" cue on the default energized=true state, not only once a live tag confirms it. */}
            <feGaussianBlur stdDeviation="1.6" result="blur">
              <animate attributeName="stdDeviation" values="1.1;2.2;1.1" dur="2.6s" repeatCount="indefinite" />
            </feGaussianBlur>
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <line x1={0} y1={cy} x2={leftCx - r} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <line x1={rightCx + r} y1={cy} x2={width} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <Terminal cx={2} cy={cy} color={style.stroke} />
      <Terminal cx={width - 2} cy={cy} color={style.stroke} />

      <g filter={energized ? `url(#${glowId})` : undefined}>
        <circle cx={leftCx} cy={cy} r={r} fill={`url(#${coilGradId})`} stroke={windingColor} strokeWidth={style.strokeWidth} />
        <circle cx={rightCx} cy={cy} r={r} fill={`url(#${coilGradId})`} stroke={windingColor} strokeWidth={style.strokeWidth} />
        {/* Winding-loop texture — a few short arcs along each coil, hinting at wound wire without literally drawing every turn */}
        {[-0.5, 0, 0.5].map((f) => (
          <path
            key={`l${f}`}
            d={`M ${leftCx - r * 0.55} ${cy + f * r * 0.7} q ${r * 0.55} ${-r * 0.35 * Math.sign(f || 1)} ${r * 1.1} 0`}
            fill="none"
            stroke={darken(windingColor, 0.25)}
            strokeWidth={0.75}
            opacity={0.55}
          />
        ))}
        {[-0.5, 0, 0.5].map((f) => (
          <path
            key={`r${f}`}
            d={`M ${rightCx - r * 0.55} ${cy + f * r * 0.7} q ${r * 0.55} ${-r * 0.35 * Math.sign(f || 1)} ${r * 1.1} 0`}
            fill="none"
            stroke={darken(windingColor, 0.25)}
            strokeWidth={0.75}
            opacity={0.55}
          />
        ))}
      </g>

      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Transformer;
