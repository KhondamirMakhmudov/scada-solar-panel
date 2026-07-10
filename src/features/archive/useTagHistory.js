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
 * standalone "Архивы" page and the in-place archive modal opened from a
 * mnemonic screen, so both read history the same way.
 *
 * Each bucket carries both `avg` (a synthetic mean — meaningless for an
 * enum/status tag, e.g. "1.73" is not a real code) and `min`/`max`/`last`
 * (actual observed readings within that bucket). Callers rendering a tag
 * with a `value_map` should read `last`, not `avg`.
 */
export function useTagHistory({ tagIds, timeFrom, timeTo, interval }) {
  const { data: session } = useSession();
  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const tagIdsKey = tagIds.slice().sort().join(",");
  const canQuery = Boolean(session?.accessToken) && tagIds.length > 0 && Boolean(timeFrom) && Boolean(timeTo);

  const { data: aggregatesResp, isFetching: isFetchingAggregates } = useGetQuery({
    key: KEYS.tagValuesAggregates,
    url: URLS.tagValuesAggregates,
    apiClient: requestScreens,
    params: { tagIds: tagIdsKey, timeFrom, timeTo, interval, fill: "locf" },
    headers: authHeaders,
    enabled: canQuery,
  });

  const { data: statisticsResp } = useGetQuery({
    key: KEYS.tagValuesStatistics,
    url: URLS.tagValuesStatistics,
    apiClient: requestScreens,
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
