import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken, METAL_BASE as METAL } from "../lib/color";

/** Battery cell: metallic terminal nub + case bezel, charge level as a gradient-shaded fill (unchanged behavior — still driven by `state.charge`), glowing bolt while charging. */
const Battery = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const rawCharge = Number(state?.charge ?? 0.6);
  const charge = Math.min(1, Math.max(0, Number.isFinite(rawCharge) ? rawCharge : 0.6));
  const charging = Boolean(state?.charging);

  const nubW = width * 0.3;
  const nubH = height * 0.08;
  const bodyY = nubH;
  const bodyH = height - nubH;
  const clipId = `battery-clip-${element.id}`;
  const fillColor = charge < 0.2 ? "#f87171" : style.fill;
  const fillGradId = `battery-fill-${element.id}`;
  const nubGradId = `battery-nub-${element.id}`;
  const fillH = bodyH * charge;

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
        <linearGradient id={nubGradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={darken(METAL, 0.2)} />
          <stop offset="50%" stopColor={lighten(METAL, 0.25)} />
          <stop offset="100%" stopColor={darken(METAL, 0.2)} />
        </linearGradient>
        <linearGradient id={fillGradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={darken(fillColor, 0.15)} />
          <stop offset="45%" stopColor={lighten(fillColor, 0.2)} />
          <stop offset="100%" stopColor={darken(fillColor, 0.15)} />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={0} y={bodyY} width={width} height={bodyH} rx={4} />
        </clipPath>
      </defs>

      <rect x={(width - nubW) / 2} y={0} width={nubW} height={nubH} rx={1} fill={`url(#${nubGradId})`} />

      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={bodyY} width={width} height={bodyH} fill="#0e0e0e" />
        <rect x={0} y={bodyY + bodyH - fillH} width={width} height={fillH} fill={`url(#${fillGradId})`} opacity={style.opacity} />
        {fillH > 1 && (
          <rect x={0} y={bodyY + bodyH - fillH} width={width} height={1.5} fill={lighten(fillColor, 0.45)} opacity={0.85} />
        )}
      </g>
      <rect
        x={0.5}
        y={bodyY}
        width={width - 1}
        height={bodyH}
        rx={4}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      {/* Case bezel highlight */}
      <rect x={1.5} y={bodyY + 1} width={width - 3} height={bodyH - 2} rx={3} fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={1} />

      {charging && (
        <path
          d={`M ${width * 0.55} ${bodyY + bodyH * 0.25} L ${width * 0.4} ${bodyY + bodyH * 0.55} L ${width * 0.52} ${bodyY + bodyH * 0.55} L ${width * 0.42} ${bodyY + bodyH * 0.85} L ${width * 0.65} ${bodyY + bodyH * 0.45} L ${width * 0.53} ${bodyY + bodyH * 0.45} Z`}
          fill="#facc15"
          style={{ filter: "drop-shadow(0 0 2px #facc15)" }}
        />
      )}
      <text x={width / 2} y={bodyY + bodyH + 14} textAnchor="middle" fontSize={10} fill="#e5e2e1">
        {Math.round(charge * 100)}%
      </text>
      {label && (
        <text x={width / 2} y={bodyY + bodyH + 28} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Battery;
