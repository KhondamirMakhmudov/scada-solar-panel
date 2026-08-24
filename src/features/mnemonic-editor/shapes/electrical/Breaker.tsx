import ParametrizedShape from "../base/ParametrizedShape";
import Terminal from "../base/Terminal";
import type { ShapeComponentProps } from "../base/shapeProps";
import { lighten, darken } from "../../lib/color";

/**
 * Circuit breaker: schematic contact blade (IEC/ANSI convention — one-line
 * diagrams stay flat/iconic, unlike the P&ID equipment shapes) inside a
 * lightly shaded enclosure, with a status LED matching the blade color so
 * the open/closed state reads even at a glance from across the screen.
 */
const Breaker = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const closed = Boolean(state?.closed ?? true);
  const cy = height / 2;
  const midX = width / 2;
  const boxColor = style.fill === "none" ? "#334155" : style.fill;
  const stateColor = closed ? "#4ade80" : "#f87171";

  const boxGradId = `breaker-box-${element.id}`;

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
        <linearGradient id={boxGradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lighten(boxColor, 0.3)} />
          <stop offset="100%" stopColor={darken(boxColor, 0.25)} />
        </linearGradient>
      </defs>

      <line x1={0} y1={cy} x2={width * 0.35} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <line x1={width * 0.65} y1={cy} x2={width} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <Terminal cx={width * 0.35} cy={cy} color={style.stroke} />
      <Terminal cx={width * 0.65} cy={cy} color={style.stroke} />

      {/* Enclosure */}
      <rect
        x={midX - 9}
        y={cy - height * 0.42}
        width={18}
        height={height * 0.5}
        rx={1.5}
        fill={`url(#${boxGradId})`}
        stroke={darken(boxColor, 0.4)}
        strokeWidth={0.75}
        opacity={style.opacity}
      />
      <circle cx={midX} cy={cy - height * 0.42 + 4} r={1.6} fill={stateColor} style={{ filter: `drop-shadow(0 0 2px ${stateColor})` }} />

      {/* Switching blade */}
      {closed ? (
        <line x1={width * 0.35} y1={cy} x2={width * 0.65} y2={cy} stroke={stateColor} strokeWidth={style.strokeWidth + 1.5} strokeLinecap="round" />
      ) : (
        <line x1={width * 0.35} y1={cy} x2={width * 0.65} y2={cy - height * 0.3} stroke={stateColor} strokeWidth={style.strokeWidth + 1.5} strokeLinecap="round" />
      )}

      {label && (
        <text x={midX} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Breaker;
