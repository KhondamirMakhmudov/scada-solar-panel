import ParametrizedShape from "./base/ParametrizedShape";
import Terminal from "./base/Terminal";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken } from "../lib/color";

/** kWh meter: a bezel ring (shaded off the shape's own color) around a dark LCD-style display, with two terminal lugs at the base like a real meter's wiring block. */
const Meter = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, label } = element;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - style.strokeWidth;
  const bezelColor = style.fill === "none" ? "#1e293b" : style.fill;

  const bezelGradId = `meter-bezel-${element.id}`;

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
        <radialGradient id={bezelGradId} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={lighten(bezelColor, 0.4)} />
          <stop offset="60%" stopColor={bezelColor} />
          <stop offset="100%" stopColor={darken(bezelColor, 0.4)} />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r} fill={`url(#${bezelGradId})`} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={lighten(bezelColor, 0.6)} strokeWidth={0.75} opacity={0.4} />

      {/* Recessed LCD display */}
      <rect
        x={cx - r * 0.72}
        y={cy - r * 0.4}
        width={r * 1.44}
        height={r * 0.8}
        rx={2}
        fill="#08110a"
        stroke={darken(bezelColor, 0.5)}
        strokeWidth={0.75}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r * 0.42}
        fontFamily="monospace"
        fontWeight="bold"
        fill={style.stroke}
      >
        kWh
      </text>

      {/* Wiring-block lugs at the base */}
      <Terminal cx={cx - r * 0.4} cy={cy + r * 0.98} color={style.stroke} r={2.2} />
      <Terminal cx={cx + r * 0.4} cy={cy + r * 0.98} color={style.stroke} r={2.2} />

      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Meter;
