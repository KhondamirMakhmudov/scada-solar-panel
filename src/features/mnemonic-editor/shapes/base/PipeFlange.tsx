import { darken, METAL_BASE as METAL } from "../../lib/color";

interface PipeFlangeProps {
  x: number;
  cy: number;
  height: number;
  width?: number;
  /** id of a gradient the parent shape already declared in its own <defs> — kept centralized so two flanges on one shape share a single gradient instead of duplicating it. */
  gradientId: string;
}

/** Small metal pipe-fitting stub (bolted flange) — used by Pump and Valve so both read as connected to the same piping run, not floating shapes. */
const PipeFlange = ({ x, cy, height, width = 9, gradientId }: PipeFlangeProps) => (
  <g>
    <rect
      x={x}
      y={cy - height / 2}
      width={width}
      height={height}
      rx={1}
      fill={`url(#${gradientId})`}
      stroke={darken(METAL, 0.35)}
      strokeWidth={0.5}
    />
    <circle cx={x + width * 0.3} cy={cy - height * 0.32} r={Math.max(0.6, height * 0.08)} fill={darken(METAL, 0.45)} />
    <circle cx={x + width * 0.3} cy={cy + height * 0.32} r={Math.max(0.6, height * 0.08)} fill={darken(METAL, 0.45)} />
  </g>
);

export default PipeFlange;
