import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken, METAL_BASE as METAL } from "../lib/color";

/**
 * Vertical vessel with a metallic cylinder body (independent of the shape's
 * own color) and a liquid fill driven by `style.fill` + `state.level` — the
 * body reads as "tank" regardless of what liquid color the user picks,
 * matching how a real vessel looks the same empty or full of anything.
 */
const Tank = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const rawLevel = Number(state?.level ?? 0.5);
  const level = Math.min(1, Math.max(0, Number.isFinite(rawLevel) ? rawLevel : 0.5));

  const capH = Math.min(height * 0.08, width * 0.2, 14);
  const bodyTop = capH;
  const bodyHeight = Math.max(1, height - capH * 2);
  const liquidHeight = bodyHeight * level;
  const liquidColor = style.fill === "none" ? "#3b82f6" : style.fill;

  const clipId = `tank-clip-${element.id}`;
  const bodyGradId = `tank-body-${element.id}`;
  const liquidGradId = `tank-liquid-${element.id}`;

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
        <clipPath id={clipId}>
          <rect x={0.5} y={bodyTop} width={width - 1} height={bodyHeight} />
        </clipPath>
        {/* Light-dark-light band across the width fakes a cylinder curving away from the viewer */}
        <linearGradient id={bodyGradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={lighten(METAL, 0.55)} />
          <stop offset="14%" stopColor={lighten(METAL, 0.15)} />
          <stop offset="46%" stopColor={darken(METAL, 0.2)} />
          <stop offset="56%" stopColor={darken(METAL, 0.2)} />
          <stop offset="88%" stopColor={lighten(METAL, 0.15)} />
          <stop offset="100%" stopColor={lighten(METAL, 0.55)} />
        </linearGradient>
        <linearGradient id={liquidGradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lighten(liquidColor, 0.35)} />
          <stop offset="18%" stopColor={liquidColor} />
          <stop offset="100%" stopColor={darken(liquidColor, 0.3)} />
        </linearGradient>
      </defs>

      {/* Level scale — drawn first so the vessel paints over its inner tick end */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const ty = bodyTop + bodyHeight * (1 - t);
        return (
          <g key={t} opacity={0.75}>
            <line x1={-5} x2={2} y1={ty} y2={ty} stroke="#64748b" strokeWidth={1} />
            <text x={-8} y={ty + 3} textAnchor="end" fontSize={7.5} fill="#64748b" fontFamily="monospace">
              {Math.round(t * 100)}
            </text>
          </g>
        );
      })}

      {/* Cylinder body */}
      <rect x={0} y={bodyTop} width={width} height={bodyHeight} fill={`url(#${bodyGradId})`} />
      <ellipse cx={width / 2} cy={bodyTop} rx={width / 2} ry={capH} fill={`url(#${bodyGradId})`} />
      <ellipse cx={width / 2} cy={height - capH} rx={width / 2} ry={capH} fill={darken(METAL, 0.3)} />

      {/* Liquid, clipped to the body */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          x={0}
          y={height - capH - liquidHeight}
          width={width}
          height={liquidHeight + capH}
          fill={`url(#${liquidGradId})`}
          opacity={style.opacity}
        />
        {level > 0.02 && level < 0.99 && (
          <rect
            x={0}
            y={height - capH - liquidHeight}
            width={width}
            height={1.5}
            fill={lighten(liquidColor, 0.5)}
            opacity={0.9}
          />
        )}
      </g>

      {/* Rim + outline */}
      <ellipse
        cx={width / 2}
        cy={bodyTop}
        rx={width / 2 - 0.5}
        ry={capH}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      <rect
        x={0.5}
        y={bodyTop}
        width={width - 1}
        height={bodyHeight}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />

      {/* Support legs */}
      <rect x={width * 0.14} y={height - capH * 0.3} width={Math.max(2, width * 0.05)} height={capH * 1.1} fill={darken(METAL, 0.35)} />
      <rect x={width * 0.81} y={height - capH * 0.3} width={Math.max(2, width * 0.05)} height={capH * 1.1} fill={darken(METAL, 0.35)} />

      {label && (
        <text x={width / 2} y={height + 16} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Tank;
