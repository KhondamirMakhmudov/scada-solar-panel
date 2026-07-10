import { motion } from "framer-motion";
import { Close } from "@mui/icons-material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { formatAxisTime, formatFullTime, formatValue, formatMaybeMapped } from "./constants";

const StatPill = ({ label, value }) => (
  <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-center">
    <p className="text-[11px] text-slate-400">{label}</p>
    <p className="text-sm font-semibold text-slate-100 font-mono">{value}</p>
  </div>
);

/** One tag's stat pills + line chart — small multiple used by the "График" view of the archive page and the in-place archive modal. */
const TagChartCard = ({ tag, color, chartData, stats, spanMs, valueMap, onRemove }) => {
  const isLoading = chartData === null;
  const hasPoints = Array.isArray(chartData) && chartData.length > 0;
  const displayName = formatTagLabelShort(tag.name);
  // "avg" is a synthetic mean of bucket codes — meaningless for an enum tag
  // ("1.73" isn't a real status). "last" is the actual last-observed value
  // in that bucket, so it's what an enum tag's line/pill should read.
  const isEnum = Boolean(valueMap);
  const valueKey = isEnum ? "last" : "avg";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100" title={displayName}>
              {displayName}
            </p>
            {tag.deviceName && (
              <p className="truncate text-xs text-slate-400" title={tag.deviceName}>
                {tag.deviceName}
              </p>
            )}
          </div>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            title="Убрать тег"
          >
            <Close fontSize="small" />
          </button>
        )}
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        <StatPill label="Мин" value={stats ? formatMaybeMapped(stats.min, valueMap) : "—"} />
        <StatPill
          label={isEnum ? "Посл." : "Сред"}
          value={stats ? formatMaybeMapped(isEnum ? stats.lastValue : stats.avg, valueMap) : "—"}
        />
        <StatPill label="Макс" value={stats ? formatMaybeMapped(stats.max, valueMap) : "—"} />
        <StatPill label="Точек" value={stats ? stats.count : "—"} />
      </div>

      <div className="h-[220px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Загрузка…
          </div>
        ) : !hasPoints ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Нет данных за выбранный период
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="ms"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ms) => formatAxisTime(ms, spanMs)}
                stroke="#64748b"
                fontSize={11}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                domain={["auto", "auto"]}
                allowDecimals={!valueMap}
                tickFormatter={valueMap ? (v) => formatMaybeMapped(v, valueMap) : undefined}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(ms) => formatFullTime(ms)}
                formatter={(value) => [
                  valueMap
                    ? formatMaybeMapped(value, valueMap)
                    : `${formatValue(value)}${tag.unit ? ` ${tag.unit}` : ""}`,
                  displayName,
                ]}
              />
              <Line
                type={isEnum ? "stepAfter" : "monotone"}
                dataKey={valueKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export default TagChartCard;
