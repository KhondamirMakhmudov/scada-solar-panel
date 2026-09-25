import { useState } from "react";
import { categoricalColorFor } from "./palette";

const BAR_THICKNESS = 20; // <=24px per dataviz mark spec

/**
 * Horizontal bar chart for "connections by type" — replaces the old grid of
 * plain count cards. Each connection type is its own row (so it's already
 * self-labeled — no separate legend box needed), sorted by count so the
 * busiest type reads first, but colored by a stable alphabetical assignment
 * (see palette.js) so a type's color never shifts when counts change.
 *
 * Direct-labeled at the bar tip (dataviz: "Bars -> value at the tip") rather
 * than relying on a shared axis, since counts here are small integers that
 * read faster as a number than estimated from bar length alone.
 */
const ConnectionsBarChart = ({ data }) => {
  const [hoveredType, setHoveredType] = useState(null);

  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  const keys = entries.map(([type]) => type);
  const rows = entries
    .map(([type, count]) => ({ type, count, color: categoricalColorFor(keys, type) }))
    .sort((a, b) => b.count - a.count);

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="bg-surface-dark border border-surface-border rounded-[8px] p-3.5">
      <h3 className="text-[13px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted mb-3">
        Соединения по типам
      </h3>
      <div className="space-y-2.5">
        {rows.map((row) => {
          const widthPct = Math.max(3, (row.count / max) * 100);
          const isHovered = hoveredType === row.type;
          return (
            <div
              key={row.type}
              className="group"
              onMouseEnter={() => setHoveredType(row.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-ibmPlexSans text-text-secondary truncate">
                  {row.type.replace(/_/g, " ")}
                </span>
                {/* Value stays in a text token even on hover — the colored bar
                    carries identity, the number never borrows the data color */}
                <span className="text-[13px] font-ibmPlexMono font-semibold tabular-nums text-text-primary">
                  {row.count}
                </span>
              </div>
              <div
                className="relative w-full rounded-full overflow-hidden"
                style={{ height: BAR_THICKNESS, background: "#141414" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    background: row.color,
                    opacity: isHovered ? 1 : 0.88,
                    boxShadow: isHovered ? `0 0 0 1px ${row.color}55` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConnectionsBarChart;
