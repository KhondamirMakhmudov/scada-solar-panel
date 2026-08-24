import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { lighten, darken, METAL_BASE as METAL } from "../lib/color";

const COLS = 3;
const ROWS = 2;

/** PV module: aluminum frame around a cell grid with a diagonal glass-glint gradient, pulsing amber outline while generating. */
const SolarPanel = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const generating = Boolean(state?.generating ?? true);
  const frame = Math.max(2, Math.min(width, height) * 0.045);
  const cellX = frame;
  const cellY = frame;
  const cellW = width - frame * 2;
  const cellH = height - frame * 2;
  const cellColW = cellW / COLS;
  const cellRowH = cellH / ROWS;
  const cellColor = style.fill === "none" ? "#1e3a8a" : style.fill;

  const frameGradId = `solar-frame-${element.id}`;
  const cellGradId = `solar-cell-${element.id}`;

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
        <linearGradient id={frameGradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={lighten(METAL, 0.4)} />
          <stop offset="100%" stopColor={darken(METAL, 0.25)} />
        </linearGradient>
        {/* Diagonal glass sheen across the cell grid */}
        <linearGradient id={cellGradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={lighten(cellColor, 0.3)} />
          <stop offset="35%" stopColor={cellColor} />
          <stop offset="70%" stopColor={darken(cellColor, 0.3)} />
          <stop offset="100%" stopColor={darken(cellColor, 0.15)} />
        </linearGradient>
      </defs>

      {/* Aluminum frame */}
      <rect x={0} y={0} width={width} height={height} rx={2} fill={`url(#${frameGradId})`} stroke={darken(METAL, 0.35)} strokeWidth={0.75} />

      {/* Cell grid */}
      <rect x={cellX} y={cellY} width={cellW} height={cellH} fill={`url(#${cellGradId})`} stroke={style.stroke} strokeWidth={Math.max(0.75, style.strokeWidth * 0.6)} opacity={style.opacity} />
      {Array.from({ length: COLS - 1 }).map((_, i) => (
        <line key={`v${i}`} x1={cellX + (i + 1) * cellColW} y1={cellY} x2={cellX + (i + 1) * cellColW} y2={cellY + cellH} stroke={style.stroke} strokeWidth={0.75} opacity={0.55} />
      ))}
      {Array.from({ length: ROWS - 1 }).map((_, i) => (
        <line key={`h${i}`} x1={cellX} y1={cellY + (i + 1) * cellRowH} x2={cellX + cellW} y2={cellY + (i + 1) * cellRowH} stroke={style.stroke} strokeWidth={0.75} opacity={0.55} />
      ))}

      {generating && (
        <rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={2} fill="none" stroke="#fbbf24" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
        </rect>
      )}
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default SolarPanel;
