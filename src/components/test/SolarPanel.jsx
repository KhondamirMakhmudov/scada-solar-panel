export default function SolarPanel({ active }) {
  return (
    <g>
      <rect
        x="20"
        y="40"
        width="80"
        height="40"
        rx="4"
        fill={active ? "#22c55e" : "#9ca3af"}
      />
      <text x="60" y="65" textAnchor="middle" fill="white" fontSize="10">
        PV
      </text>
    </g>
  );
}
