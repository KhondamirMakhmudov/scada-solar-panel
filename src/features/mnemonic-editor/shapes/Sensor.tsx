import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken } from "../lib/color";

const SENSOR_LETTERS: Record<string, string> = {
  temperature: "T",
  pressure: "P",
  flow: "F",
  level: "L",
};

/** Field instrument bubble (ISA S5.1 convention) with a light bezel gradient — stays a simple circle-with-letter by design (that's the actual industry symbol), just with a touch of depth instead of a flat disc. */
const Sensor = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const sensorType = String(state?.sensorType ?? "temperature");
  const letter = SENSOR_LETTERS[sensorType] || "?";
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - style.strokeWidth;
  const bodyColor = style.fill === "none" ? "#1e293b" : style.fill;

  const bezelGradId = `sensor-bezel-${element.id}`;

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
          <stop offset="0%" stopColor={lighten(bodyColor, 0.35)} />
          <stop offset="65%" stopColor={bodyColor} />
          <stop offset="100%" stopColor={darken(bodyColor, 0.3)} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${bezelGradId})`} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r}
        fontWeight="bold"
        fill={style.stroke}
      >
        {letter}
      </text>
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Sensor;
