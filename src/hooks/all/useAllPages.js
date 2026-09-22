import { useQuery } from "@tanstack/react-query";
import { get } from "lodash";
import { requestPython } from "@/services/api";

/**
 * Fetches every page of a paginated list endpoint (`/tags`, `/devices`, …
 * anything shaped `{ data: [...], pagination: { total, page, pageSize,
 * totalPages } }`) and merges them into one array — instead of guessing a
 * "generously large" `pageSize` and hoping the server doesn't cap it lower
 * than that.
 *
 * That guess is exactly what went wrong on the tags page: requesting
 * `pageSize=1000` doesn't guarantee the server honors it — if it silently
 * clamps to, say, 100, a one-shot "wide page" request quietly returns only
 * the first 100 and the rest never shows up anywhere (tree, table, filter
 * options). This reads the real `pagination.totalPages` the server actually
 * used for page 1's `pageSize`, then fetches whatever pages remain and
 * merges them — correct regardless of what page size the server enforces.
 *
 * Returned shape mirrors a single-page response (`data.data`, plus a
 * synthetic `pagination.total`/`pagination.totalPages: 1` since it's one
 * merged list now) so call sites written for `get(resp, "data.data", [])`
 * don't need to change.
 */
export default function useAllPages({
  key,
  url,
  apiClient = requestPython,
  headers = {},
  pageSize = 200,
  enabled = true,
}) {
  return useQuery({
    queryKey: [key, "all-pages"],
    queryFn: async () => {
      const first = await apiClient.get(url, { params: { page: 1, pageSize }, headers });
      const firstItems = get(first, "data.data", []);
      const totalPages = get(first, "data.pagination.totalPages", 1);
      const total = get(first, "data.pagination.total", firstItems.length);

      if (totalPages <= 1) {
        return { data: { data: firstItems, pagination: { total, page: 1, pageSize, totalPages: 1 } } };
      }

      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const rest = await Promise.all(
        remainingPages.map((page) => apiClient.get(url, { params: { page, pageSize }, headers })),
      );
      const allItems = firstItems.concat(...rest.map((resp) => get(resp, "data.data", [])));

      return { data: { data: allItems, pagination: { total, page: 1, pageSize: allItems.length, totalPages: 1 } } };
    },
    enabled,
    placeholderData: (previous) => previous,
  });
}
