export default function Battery({ charging }) {
  return (
    <g>
      <rect
        x="160"
        y="120"
        width="90"
        height="40"
        rx="6"
        fill={charging ? "#f59e0b" : "#9ca3af"}
      />
      <text x="205" y="145" textAnchor="middle" fill="white" fontSize="10">
        BAT
      </text>
    </g>
  );
}
