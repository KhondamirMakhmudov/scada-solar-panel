interface GridBackgroundProps {
  gridSize: number;
  width: number;
  height: number;
}

const GridBackground = ({ gridSize, width, height }: GridBackgroundProps) => {
  const patternId = "mnemonic-grid-dots";

  return (
    <>
      <defs>
        <pattern
          id={patternId}
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={1} cy={1} r={1} fill="#334155" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
    </>
  );
};

export default GridBackground;
