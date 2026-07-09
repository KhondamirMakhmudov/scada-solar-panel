import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestPython } from "@/services/api";

interface TagLike {
  id: string;
  value_map?: Record<string, string> | null;
  params?: { value_map?: Record<string, string> | null } | null;
}

/**
 * Maps each tag id to its backend-configured `value_map` (e.g.
 * `{"0": "Waiting", "1": "Normal", "3": "Fault"}`) — lets an enum-style tag's
 * live numeric value render as its human-readable label instead of a bare
 * code. Fetched under the same GET /tags query key used elsewhere in the
 * editor (BindingSection, useDeviceNameForTag), so react-query serves it
 * from cache rather than refetching per panel.
 */
export function useTagValueMaps(): Map<string, Record<string, string>> {
  const { data: session } = useSession();
  const { data: tagsResp } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    apiClient: requestPython,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: Boolean(session?.accessToken),
  });

  return useMemo(() => {
    const tags: TagLike[] = get(tagsResp, "data.data", get(tagsResp, "data", [])) || [];
    const map = new Map<string, Record<string, string>>();
    tags.forEach((tag) => {
      // Register-level metadata (word_order/byte_order/register_type etc.)
      // lives under `params` for Modbus/OPC tags — value_map follows the
      // same convention, but fall back to a top-level field too in case a
      // given tag/protocol puts it there instead.
      const valueMap = tag.params?.value_map || tag.value_map;
      if (valueMap && typeof valueMap === "object") {
        map.set(tag.id, valueMap);
      }
    });
    return map;
  }, [tagsResp]);
}
