/** Shared between Chart.tsx (sparkline rows + hover tooltip) and ChartDataTable.tsx (the table view) — one palette/formatting source so the two views of the same data never drift apart. */
export const ROW_COLORS = ["#38bdf8", "#4ade80", "#f59e0b", "#f472b6"];

export function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
}

export function formatValue(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return v.toFixed(decimals);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatClockTime(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
