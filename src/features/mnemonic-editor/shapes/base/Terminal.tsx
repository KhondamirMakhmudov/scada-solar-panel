interface TerminalProps {
  cx: number;
  cy: number;
  r?: number;
  color: string;
}

/** Small connector stud at a wire endpoint — used by the electrical shapes (Breaker, Switch, Transformer, Meter). Electrical one-line symbols stay schematic by convention (unlike Tank/Pump/Valve, real SLDs don't go photorealistic), so this is deliberately just a dot with a touch of highlight, not a 3D part. */
const Terminal = ({ cx, cy, r = 2.75, color }: TerminalProps) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth={0.5} />
    <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.35} fill="#fff" opacity={0.5} />
  </g>
);

export default Terminal;
