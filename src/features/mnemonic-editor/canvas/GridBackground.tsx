import type { GridStyle } from "../store/uiStore";

interface GridBackgroundProps {
  gridSize: number;
  width: number;
  height: number;
  style: GridStyle;
  /** Текущий масштаб — по нему решается, показывать ли мелкую сетку */
  zoom: number;
}

/** Каждая N-я линия — крупная: даёт опору для выравнивания без пересчёта клеток. */
const MAJOR_EVERY = 5;

/**
 * Ниже этого экранного шага (в пикселях) мелкая сетка сливается в
 * равномерную заливку и только зашумляет схему, поэтому остаётся лишь
 * крупная. Порог подобран по видимой плотности при шаге 20 px и масштабе
 * около 40 %.
 */
const MIN_MINOR_SCREEN_STEP = 6;

const GridBackground = ({ gridSize, width, height, style, zoom }: GridBackgroundProps) => {
  if (style === "none") return null;

  const majorSize = gridSize * MAJOR_EVERY;
  const showMinor = gridSize * zoom >= MIN_MINOR_SCREEN_STEP;

  const minorId = `mnemonic-grid-minor-${style}`;
  const majorId = `mnemonic-grid-major-${style}`;

  return (
    <>
      <defs>
        {style === "dots" ? (
          <>
            <pattern id={minorId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <circle cx={0.5} cy={0.5} r={0.5} fill="#334155" opacity={0.55} />
            </pattern>
            <pattern id={majorId} width={majorSize} height={majorSize} patternUnits="userSpaceOnUse">
              <circle cx={0.5} cy={0.5} r={1.1} fill="#475569" opacity={0.8} />
            </pattern>
          </>
        ) : (
          <>
            <pattern id={minorId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth={1}
              />
            </pattern>
            <pattern id={majorId} width={majorSize} height={majorSize} patternUnits="userSpaceOnUse">
              <path
                d={`M ${majorSize} 0 L 0 0 0 ${majorSize}`}
                fill="none"
                stroke="#334155"
                strokeWidth={1}
              />
            </pattern>
          </>
        )}
      </defs>
      {showMinor && (
        <rect x={0} y={0} width={width} height={height} fill={`url(#${minorId})`} pointerEvents="none" />
      )}
      <rect x={0} y={0} width={width} height={height} fill={`url(#${majorId})`} pointerEvents="none" />
    </>
  );
};

export default GridBackground;
