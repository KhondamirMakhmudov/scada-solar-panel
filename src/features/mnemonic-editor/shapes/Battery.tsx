import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

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
  const fillH = bodyH * charge;
  const fillColor = charge < 0.2 ? "#f87171" : style.fill;

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
      <rect x={(width - nubW) / 2} y={0} width={nubW} height={nubH} fill={style.stroke} />
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={bodyY} width={width} height={bodyH} rx={4} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={bodyY} width={width} height={bodyH} fill="#0e0e0e" />
        <rect x={0} y={bodyY + bodyH - fillH} width={width} height={fillH} fill={fillColor} opacity={style.opacity} />
      </g>
      <rect
        x={0}
        y={bodyY}
        width={width}
        height={bodyH}
        rx={4}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      {charging && (
        <path
          d={`M ${width * 0.55} ${bodyY + bodyH * 0.25} L ${width * 0.4} ${bodyY + bodyH * 0.55} L ${width * 0.52} ${bodyY + bodyH * 0.55} L ${width * 0.42} ${bodyY + bodyH * 0.85} L ${width * 0.65} ${bodyY + bodyH * 0.45} L ${width * 0.53} ${bodyY + bodyH * 0.45} Z`}
          fill="#facc15"
        />
      )}
      <text x={width / 2} y={bodyY + bodyH + 14} textAnchor="middle" fontSize={10} fill="#e5e2e1">
        {Math.round(charge * 100)}%
      </text>
      {label && (
        <text x={width / 2} y={bodyY + bodyH + 28} textAnchor="middle" fontSize={11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Battery;
