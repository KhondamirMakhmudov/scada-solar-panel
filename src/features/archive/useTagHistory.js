import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { requestScreens } from "@/services/api";

/**
 * Fetches aggregated history + summary statistics for a fixed set of tags
 * over [timeFrom, timeTo), backed by GET /tag-values/aggregates and
 * /tag-values/statistics (see FRONTEND_INTEGRATION.md). Shared by the
 * standalone "Архивы" page (always prod — no draft equivalent exists) and
 * the in-place archive modal opened from a mnemonic screen's runtime, which
 * DOES need to follow whichever backend that screen lives on (see
 * ScreenArchiveModal → ScreensBackendContext) — the draft service (8103)
 * keeps its own separate tag-value history, so querying prod for a draft
 * screen would silently show the wrong (or empty) archive.
 *
 * `apiClient` defaults to prod for the standalone page's sake; `backendId`
 * is folded into the query key purely so switching between a prod and a
 * draft screen in the same session never flashes the other backend's
 * cached history before refetching.
 *
 * Each bucket carries both `avg` (a synthetic mean — meaningless for an
 * enum/status tag, e.g. "1.73" is not a real code) and `min`/`max`/`last`
 * (actual observed readings within that bucket). Callers rendering a tag
 * with a `value_map` should read `last`, not `avg`.
 */
export function useTagHistory({ tagIds, timeFrom, timeTo, interval, apiClient = requestScreens, backendId = "prod" }) {
  const { data: session } = useSession();
  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const tagIdsKey = tagIds.slice().sort().join(",");
  const canQuery = Boolean(session?.accessToken) && tagIds.length > 0 && Boolean(timeFrom) && Boolean(timeTo);

  const { data: aggregatesResp, isFetching: isFetchingAggregates } = useGetQuery({
    key: `${KEYS.tagValuesAggregates}:${backendId}`,
    url: URLS.tagValuesAggregates,
    apiClient,
    params: { tagIds: tagIdsKey, timeFrom, timeTo, interval, fill: "locf" },
    headers: authHeaders,
    enabled: canQuery,
  });

  const { data: statisticsResp } = useGetQuery({
    key: `${KEYS.tagValuesStatistics}:${backendId}`,
    url: URLS.tagValuesStatistics,
    apiClient,
    params: { tagIds: tagIdsKey, timeFrom, timeTo },
    headers: authHeaders,
    enabled: canQuery,
  });

  const seriesByTagId = useMemo(() => {
    const map = new Map();
    const list = get(aggregatesResp, "data.data", []);
    list.forEach((s) => {
      const points = (s.buckets || [])
        .filter((b) => b.avg !== null && b.avg !== undefined)
        .map((b) => ({ ms: new Date(b.time).getTime(), avg: b.avg, min: b.min, max: b.max, last: b.last }));
      map.set(s.tagId, points);
    });
    return map;
  }, [aggregatesResp]);

  const statsByTagId = useMemo(() => {
    const map = new Map();
    const list = get(statisticsResp, "data.data", []);
    list.forEach((s) => map.set(s.tagId, s));
    return map;
  }, [statisticsResp]);

  return { seriesByTagId, statsByTagId, isFetching: isFetchingAggregates };
}
