import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken, METAL_BASE as METAL } from "../lib/color";

const START_ANGLE = -120;
const END_ANGLE = 120;
const TICK_COUNT = 4; // 5 major ticks (0, 25, 50, 75, 100%)

function arcPoint(cx: number, cy: number, angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

/** Analog dial gauge: metal bezel + glass-sheen face, major/minor tick marks with min/mid/max labels, and a proper tapered needle with a counterweight tail and hub cap — the min/max/value semantics are unchanged, only the face reads as a real instrument instead of a bare arc. */
const Gauge = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const min = Number(state?.min ?? 0);
  const max = Number(state?.max ?? 100);
  const rawValue = Number(state?.value ?? min);
  const clamped = Math.min(max, Math.max(min, Number.isFinite(rawValue) ? rawValue : min));
  const ratio = max > min ? (clamped - min) / (max - min) : 0;

  const cx = width / 2;
  const cy = height * 0.6;
  const r = Math.min(width, height * 0.9) / 2 - style.strokeWidth;
  const faceR = r * 0.86;

  const needleAngle = START_ANGLE + ratio * (END_ANGLE - START_ANGLE);
  const needleTip = arcPoint(cx, cy, needleAngle, faceR * 0.82);
  const needleTail = arcPoint(cx, cy, needleAngle + 180, faceR * 0.16);
  const needleColor = style.fill === "none" ? style.stroke : style.fill;

  const bezelGradId = `gauge-bezel-${element.id}`;
  const faceGradId = `gauge-face-${element.id}`;

  const majorTicks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => i / TICK_COUNT);

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
        <radialGradient id={bezelGradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={lighten(METAL, 0.5)} />
          <stop offset="100%" stopColor={darken(METAL, 0.3)} />
        </radialGradient>
        <radialGradient id={faceGradId} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#1c2230" />
          <stop offset="70%" stopColor="#10141d" />
          <stop offset="100%" stopColor="#0a0d13" />
        </radialGradient>
      </defs>

      {/* Bezel + face */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${bezelGradId})`} stroke={darken(METAL, 0.4)} strokeWidth={0.75} />
      <circle cx={cx} cy={cy} r={faceR} fill={`url(#${faceGradId})`} />

      {/* Tick marks + labels */}
      {majorTicks.map((f) => {
        const angle = START_ANGLE + f * (END_ANGLE - START_ANGLE);
        const outer = arcPoint(cx, cy, angle, faceR * 0.94);
        const inner = arcPoint(cx, cy, angle, faceR * 0.78);
        const labelPt = arcPoint(cx, cy, angle, faceR * 0.6);
        return (
          <g key={f}>
            <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="#cbd5e1" strokeWidth={1.4} opacity={0.85} />
            {(f === 0 || f === 0.5 || f === 1) && (
              <text x={labelPt.x} y={labelPt.y + 2} textAnchor="middle" fontSize={7} fill="#94a3b8" fontFamily="monospace">
                {Math.round(min + f * (max - min))}
              </text>
            )}
          </g>
        );
      })}
      {Array.from({ length: TICK_COUNT * 2 }, (_, i) => (i + 0.5) / (TICK_COUNT * 2)).map((f) => {
        const angle = START_ANGLE + f * (END_ANGLE - START_ANGLE);
        const outer = arcPoint(cx, cy, angle, faceR * 0.94);
        const inner = arcPoint(cx, cy, angle, faceR * 0.86);
        return <line key={f} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="#64748b" strokeWidth={1} opacity={0.6} />;
      })}

      {/* Needle */}
      <line x1={needleTail.x} y1={needleTail.y} x2={needleTip.x} y2={needleTip.y} stroke={needleColor} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4.5} fill={`url(#${bezelGradId})`} stroke={darken(METAL, 0.4)} strokeWidth={0.75} />
      <circle cx={cx} cy={cy} r={1.6} fill={darken(METAL, 0.4)} />

      <text x={cx} y={cy + faceR * 0.5} textAnchor="middle" fontSize={11} fontWeight="bold" fontFamily="monospace" fill="#e5e2e1">
        {Math.round(clamped)}
      </text>
      {label && (
        <text x={cx} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Gauge;
