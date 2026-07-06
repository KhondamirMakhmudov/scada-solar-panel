import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

const SENSOR_LETTERS: Record<string, string> = {
  temperature: "T",
  pressure: "P",
  flow: "F",
  level: "L",
};

const Sensor = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const sensorType = String(state?.sensorType ?? "temperature");
  const letter = SENSOR_LETTERS[sensorType] || "?";
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - style.strokeWidth;

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
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
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
