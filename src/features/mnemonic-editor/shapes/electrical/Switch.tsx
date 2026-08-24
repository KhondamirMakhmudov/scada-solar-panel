import ParametrizedShape from "../base/ParametrizedShape";
import Terminal from "../base/Terminal";
import type { ShapeComponentProps } from "../base/shapeProps";
import { darken } from "../../lib/color";

/** Two-position disconnector/selector: schematic blade pivoting between the two terminals, with a small pivot hub instead of a bare joint. */
const Switch = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const on = Boolean(state?.on ?? true);
  const cy = height / 2;
  const p1x = width * 0.2;
  const p2x = width * 0.8;
  const bladeColor = on ? "#4ade80" : style.stroke;

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
      <line x1={0} y1={cy} x2={p1x} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <line x1={p2x} y1={cy} x2={width} y2={cy} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
      <Terminal cx={p1x} cy={cy} color={style.stroke} />
      <Terminal cx={p2x} cy={cy} color={style.stroke} />

      <line
        x1={p1x}
        y1={cy}
        x2={on ? p2x : p2x - width * 0.1}
        y2={on ? cy : cy - height * 0.35}
        stroke={bladeColor}
        strokeWidth={style.strokeWidth + 1.5}
        strokeLinecap="round"
      />
      {/* Pivot hub at the fixed end */}
      <circle cx={p1x} cy={cy} r={3.2} fill="none" stroke={darken(bladeColor, 0.2)} strokeWidth={1} opacity={0.7} />

      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Switch;
