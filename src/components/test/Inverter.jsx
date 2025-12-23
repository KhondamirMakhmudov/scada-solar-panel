export default function Inverter({ running }) {
  return (
    <g>
      <rect
        x="160"
        y="35"
        width="90"
        height="50"
        rx="6"
        fill={running ? "#3b82f6" : "#9ca3af"}
      />
      <text x="205" y="65" textAnchor="middle" fill="white" fontSize="10">
        INV
      </text>
    </g>
  );
}
