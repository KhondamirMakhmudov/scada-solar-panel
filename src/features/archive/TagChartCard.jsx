import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Close, UnfoldMore, UnfoldLess } from "@mui/icons-material";
import {
  StatTile,
  EmptyState,
  AXIS_PROPS,
  GRID_PROPS,
  TOOLTIP_PROPS,
  CHART_MARGIN,
} from "@/components/ui";
import { formatTagLabelShort } from "@/lib/tagNameTranslation";
import { formatAxisTime, formatFullTime, formatValue, formatMaybeMapped } from "./constants";

const COLLAPSED_HEIGHT = 200;
const EXPANDED_HEIGHT = 340;

/**
 * История одного тега: полоса показателей + график.
 *
 * В развёрнутом виде дополнительно рисуется полоса мин–макс внутри каждого
 * бакета. Это и есть детализация: свёрнутая карточка показывает только
 * усреднённую линию, по которой не видно, что за спокойным средним прячется
 * размах в половину шкалы. Данные для полосы уже приходят в тех же точках
 * (min/max в бакете), поэтому разворот не делает новых запросов.
 *
 * Для перечислимых тегов полоса не рисуется: диапазон между кодами состояний
 * не имеет физического смысла.
 */
const TagChartCard = ({
  tag,
  color,
  chartData,
  stats,
  spanMs,
  valueMap,
  onRemove,
  isExpanded = false,
  onToggleExpand,
}) => {
  const isLoading = chartData === null;
  const hasPoints = Array.isArray(chartData) && chartData.length > 0;
  const displayName = formatTagLabelShort(tag.name);
  // "avg" — синтетическое среднее кодов, для перечислимого тега бессмысленное
  // («1.73» не является статусом). "last" — реально наблюдавшееся значение.
  const isEnum = Boolean(valueMap);
  const valueKey = isEnum ? "last" : "avg";
  const showRangeBand = isExpanded && !isEnum;

  // Recharts рисует диапазон как область от нижней границы до верхней,
  // поэтому нужна пара [min, размах], а не [min, max]
  const data = showRangeBand
    ? chartData.map((p) => ({
        ...p,
        rangeBase: p.min,
        rangeSpan: Number.isFinite(p.max) && Number.isFinite(p.min) ? p.max - p.min : 0,
      }))
    : chartData;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-2">
      <header className="flex items-center gap-2 px-3.5 py-2.5 border-b border-surface-border">
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#e5e2e1]" title={displayName}>
            {displayName}
          </p>
          {tag.deviceName && (
            <p className="truncate text-[10px] text-[#6b7280]" title={tag.deviceName}>
              {tag.deviceName}
            </p>
          )}
        </div>
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            title={isExpanded ? "Свернуть" : "Развернуть: показать разброс мин–макс"}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[#6b7280] transition-colors hover:bg-surface-3 hover:text-[#e5e2e1]"
          >
            {isExpanded ? (
              <UnfoldLess sx={{ fontSize: 16 }} />
            ) : (
              <UnfoldMore sx={{ fontSize: 16 }} />
            )}
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Убрать тег"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[#6b7280] transition-colors hover:bg-surface-3 hover:text-[#f87171]"
          >
            <Close sx={{ fontSize: 16 }} />
          </button>
        )}
      </header>

      <div className="p-3.5">
        <div className="mb-3 grid grid-cols-4 gap-2">
          <StatTile
            dense
            label="Мин"
            value={stats ? formatMaybeMapped(stats.min, valueMap) : "—"}
          />
          <StatTile
            dense
            label={isEnum ? "Посл." : "Сред"}
            value={stats ? formatMaybeMapped(isEnum ? stats.lastValue : stats.avg, valueMap) : "—"}
          />
          <StatTile
            dense
            label="Макс"
            value={stats ? formatMaybeMapped(stats.max, valueMap) : "—"}
          />
          <StatTile dense label="Точек" value={stats ? stats.count : "—"} />
        </div>

        {/* Обёртка остаётся блочной: ResponsiveContainer измеряет родителя и
            во flex-контейнере схлопывается по ширине */}
        <div style={{ height: isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT }}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState compact title="Загрузка…" />
            </div>
          ) : !hasPoints ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                compact
                title="Нет данных за выбранный период"
                description="Измените диапазон или проверьте, что опрос тега включён."
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={CHART_MARGIN}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  {...AXIS_PROPS}
                  dataKey="ms"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(ms) => formatAxisTime(ms, spanMs)}
                />
                <YAxis
                  {...AXIS_PROPS}
                  domain={["auto", "auto"]}
                  width={44}
                  allowDecimals={!valueMap}
                  tickFormatter={valueMap ? (v) => formatMaybeMapped(v, valueMap) : undefined}
                />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  labelFormatter={(ms) => formatFullTime(ms)}
                  formatter={(value) => [
                    valueMap
                      ? formatMaybeMapped(value, valueMap)
                      : `${formatValue(value)}${tag.unit ? ` ${tag.unit}` : ""}`,
                    displayName,
                  ]}
                />
                {showRangeBand && (
                  <>
                    {/* tooltipType="none" — служебные ряды полосы не должны
                        попадать в подсказку отдельными строками: «rangeBase»
                        и «rangeSpan» ничего не значат для оператора */}
                    <Area
                      dataKey="rangeBase"
                      stackId="range"
                      stroke="none"
                      fill="transparent"
                      tooltipType="none"
                      isAnimationActive={false}
                    />
                    <Area
                      dataKey="rangeSpan"
                      stackId="range"
                      stroke="none"
                      fill={color}
                      fillOpacity={0.14}
                      tooltipType="none"
                      isAnimationActive={false}
                    />
                  </>
                )}
                <Line
                  type={isEnum ? "stepAfter" : "monotone"}
                  dataKey={valueKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {showRangeBand && hasPoints && (
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#6b7280]">
            <span
              className="inline-block h-2 w-4 rounded-sm"
              style={{ backgroundColor: color, opacity: 0.14 }}
            />
            разброс мин–макс внутри интервала усреднения
          </p>
        )}
      </div>
    </div>
  );
};

export default TagChartCard;
