export default function PowerLine({ active, x1, y1, x2, y2 }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={active ? "#22c55e" : "#6b7280"}
      strokeWidth="4"
    />
  );
}
