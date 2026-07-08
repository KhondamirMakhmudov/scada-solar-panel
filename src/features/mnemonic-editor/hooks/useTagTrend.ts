import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestScreens } from "@/services/api";
import type { DataBinding } from "../types";

export type TrendRange = "15m" | "1h" | "6h" | "24h";

export const TREND_RANGE_META: Record<
  TrendRange,
  { label: string; windowMs: number; interval: string; intervalMs: number }
> = {
  "15m": { label: "15 мин", windowMs: 15 * 60 * 1000, interval: "PT5S", intervalMs: 5 * 1000 },
  "1h": { label: "1 час", windowMs: 60 * 60 * 1000, interval: "PT30S", intervalMs: 30 * 1000 },
  "6h": { label: "6 часов", windowMs: 6 * 60 * 60 * 1000, interval: "PT5M", intervalMs: 5 * 60 * 1000 },
  "24h": { label: "24 часа", windowMs: 24 * 60 * 60 * 1000, interval: "PT15M", intervalMs: 15 * 60 * 1000 },
};

export interface TrendSeriesPoint {
  ms: number;
  [tagName: string]: number;
}

interface AggregateBucket {
  time: string;
  avg: number | null;
}

interface AggregateSeries {
  tagId: string;
  tagName?: string;
  buckets?: AggregateBucket[];
}

/**
 * Historical trend for one or more tags, backed by GET /tag-values/aggregates
 * (see FRONTEND_INTEGRATION.md: raw points aren't meant for charts). The
 * window slides forward every ~30s (nowTick) rather than on every render, so
 * the query key only changes — and refetches — on that cadence.
 */
export function useTagTrend(tags: DataBinding[], range: TrendRange) {
  const { data: session } = useSession();
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const tagIdsKey = useMemo(
    () =>
      tags
        .map((t) => t.tagId)
        .filter(Boolean)
        .sort()
        .join(","),
    [tags],
  );

  const { windowMs, interval } = TREND_RANGE_META[range];
  const { timeFrom, timeTo } = useMemo(
    () => ({
      timeFrom: new Date(nowTick - windowMs).toISOString(),
      timeTo: new Date(nowTick).toISOString(),
    }),
    [nowTick, windowMs],
  );

  const { data, isFetching } = useGetQuery({
    key: KEYS.tagValuesAggregates,
    url: URLS.tagValuesAggregates,
    apiClient: requestScreens,
    params: { tagIds: tagIdsKey, timeFrom, timeTo, interval, fill: "locf" },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: Boolean(tagIdsKey) && Boolean(session?.accessToken),
  });

  const tagNameById = useMemo(() => {
    const map: Record<string, string> = {};
    tags.forEach((t) => {
      if (t.tagId) map[t.tagId] = t.tagName || t.tagId;
    });
    return map;
  }, [tags]);

  const tagNames = useMemo(
    () => tags.map((t) => t.tagName || t.tagId),
    [tags],
  );

  const series = useMemo<TrendSeriesPoint[]>(() => {
    const rows = new Map<number, TrendSeriesPoint>();
    const list = get(data, "data.data", []) as AggregateSeries[];
    list.forEach((s) => {
      const name = s.tagName || tagNameById[s.tagId] || s.tagId;
      (s.buckets || []).forEach((b) => {
        const ms = new Date(b.time).getTime();
        if (!Number.isFinite(ms) || b.avg == null) return;
        const row = rows.get(ms) || { ms };
        row[name] = b.avg;
        rows.set(ms, row);
      });
    });
    return Array.from(rows.values()).sort((a, b) => a.ms - b.ms);
  }, [data, tagNameById]);

  return { series, tagNames, isLoading: isFetching };
}
