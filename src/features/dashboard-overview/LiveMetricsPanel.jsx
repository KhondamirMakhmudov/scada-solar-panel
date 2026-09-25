import { useMemo, useState } from "react";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { formatValue } from "@/features/mnemonic-editor/lib/chartFormat";
import { useTagTrend } from "@/features/mnemonic-editor/hooks/useTagTrend";

const SPARK_HUE = "#3987e5"; // sequential default — one hue, these tiles aren't compared against each other by identity
const RANGE = "1h";

/**
 * A small sparkline for one tag's recent history — 12ish points, one hue,
 * no axes/gridlines (this is a stat-tile trend, not a standalone chart; see
 * dataviz's figures spec). Renders nothing but "…" while the shape can't be
 * computed yet, never a broken/empty axis.
 */
const Sparkline = ({ points, width = 96, height = 28 }) => {
  const valid = points.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (valid.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center text-[12px] text-text-faint">
        нет истории
      </div>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  let d = "";
  let started = false;
  points.forEach((v, i) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return;
    const x = i * step;
    const y = height - ((v - min) / span) * height;
    d += started ? ` L${x},${y}` : `M${x},${y}`;
    started = true;
  });

  const lastIndex = [...points].reverse().findIndex((v) => typeof v === "number" && Number.isFinite(v));
  const lastX = (points.length - 1 - (lastIndex === -1 ? 0 : lastIndex)) * step;
  const lastY = height - ((valid[valid.length - 1] - min) / span) * height;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={SPARK_HUE} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      {/* End-marker with a surface ring so it stays legible where the line ends */}
      <circle cx={lastX} cy={lastY} r={2.5} fill={SPARK_HUE} stroke="#1c1b1b" strokeWidth={1.5} />
    </svg>
  );
};

const NumericTile = ({ tag, current, points, isLoading }) => (
  <div className="bg-background-dark border border-surface-border rounded-[8px] px-3 py-2.5 flex flex-col gap-1.5">
    <p className="text-[12.5px] font-ibmPlexMono text-text-muted truncate" title={tag}>
      {tag}
    </p>
    <div className="flex items-end justify-between gap-2">
      <span className="text-lg font-ibmPlexSans font-semibold text-text-primary leading-none">
        {current === undefined ? "—" : formatValue(current)}
      </span>
      {isLoading && points.every((v) => v === undefined) ? (
        <div className="w-24 h-7 flex items-center justify-end text-[12px] text-text-faint">…</div>
      ) : (
        <Sparkline points={points} />
      )}
    </div>
  </div>
);

const StatusTile = ({ tag, label, isError }) => (
  <div className="bg-background-dark border border-surface-border rounded-[8px] px-3 py-2.5 flex flex-col justify-between gap-1.5">
    <p className="text-[12.5px] font-ibmPlexMono text-text-muted truncate" title={tag}>
      {tag}
    </p>
    <span
      className={`inline-flex items-center gap-1.5 self-start text-[14px] font-ibmPlexSans font-medium px-2 py-0.5 rounded-full ${
        isError ? "text-status-fault bg-status-fault/10" : "text-text-secondary bg-white/5"
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: isError ? "#ef4444" : "#5c6270" }}
      />
      {label}
    </span>
  </div>
);

/**
 * Upgrades the flat "current values" list into small-multiple trend tiles:
 * one 1h sparkline per numeric tag, and a plain status pill for enum/string
 * tags (a sparkline of status *codes* would be meaningless — averaging "1"
 * and "3" isn't a real number). Reuses the mnemonic editor's own trend
 * fetch (`useTagTrend`) so the history query, its 30s window tick, and its
 * backend-aware query key are the exact same code path the screen editor's
 * chart shape uses — no second implementation to keep in sync.
 */
const LiveMetricsPanel = ({ tags, latestValuesByTagId, valueMaps }) => {
  const numericTags = useMemo(() => tags.filter((tag) => !valueMaps.has(tag.id)), [tags, valueMaps]);
  const enumTags = useMemo(() => tags.filter((tag) => valueMaps.has(tag.id)), [tags, valueMaps]);

  const bindings = useMemo(
    () => numericTags.map((tag) => ({ tagId: tag.id, tagName: tag.name || tag.id })),
    [numericTags],
  );
  const { series, isLoading } = useTagTrend(bindings, RANGE);

  const pointsByTagName = useMemo(() => {
    const map = new Map();
    numericTags.forEach((tag) => {
      const name = tag.name || tag.id;
      map.set(name, series.map((point) => point[name]));
    });
    return map;
  }, [series, numericTags]);

  if (tags.length === 0) {
    return <p className="text-[13px] text-text-faint px-1 py-2">Параметры не найдены</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
      {numericTags.map((tag) => {
        const name = tag.name || tag.id;
        const latest = latestValuesByTagId.get(tag.id);
        const current =
          latest && !latest.isError && latest.value !== null && latest.value !== undefined
            ? Number(latest.value)
            : undefined;
        return (
          <NumericTile
            key={tag.id}
            tag={formatTagLabelShort(name)}
            current={current}
            points={pointsByTagName.get(name) || []}
            isLoading={isLoading}
          />
        );
      })}
      {enumTags.map((tag) => {
        const name = tag.name || tag.id;
        const latest = latestValuesByTagId.get(tag.id);
        const isError = Boolean(latest?.isError);
        const code = latest?.value;
        const mapped = valueMaps.get(tag.id)?.[String(code)];
        const label = isError ? "ошибка" : mapped !== undefined ? mapped : code === null || code === undefined ? "—" : String(code);
        return <StatusTile key={tag.id} tag={formatTagLabelShort(name)} label={label} isError={isError} />;
      })}
    </div>
  );
};

export default LiveMetricsPanel;
