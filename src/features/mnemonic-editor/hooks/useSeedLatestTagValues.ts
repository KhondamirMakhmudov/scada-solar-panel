import { useEffect, useRef } from "react";
import { get } from "lodash";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { requestScreens } from "@/services/api";
import { useRuntimeStore } from "../store/runtimeStore";

interface LatestTagValue {
  tagId: string;
  value: number | string | boolean | null;
  unit?: string | null;
  isError?: boolean;
  errorMessage?: string | null;
  time?: string;
}

/**
 * Seeds runtimeStore with each tag's last known value via
 * GET /tag-values/latest — the endpoint FRONTEND_INTEGRATION.md documents
 * exactly for this case ("snapshot для мнемосхем до прихода WS-данных").
 * The screens WS channel (useMnemonicWebSocket) only pushes on change, with
 * no initial-history burst like the per-device/per-tag channels, so without
 * this every panel reads "—" until something happens to change.
 */
export function useSeedLatestTagValues(tagIds: string[], accessToken: string | undefined) {
  const applyTagFrame = useRuntimeStore((state) => state.applyTagFrame);
  const seededKey = useRef<string | null>(null);

  const tagIdsKey = tagIds.slice().sort().join(",");

  const { data } = useGetQuery({
    key: KEYS.tagValuesLatest,
    url: URLS.tagValuesLatest,
    apiClient: requestScreens,
    params: { tagIds: tagIdsKey },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    enabled: Boolean(accessToken) && tagIdsKey.length > 0,
  });

  useEffect(() => {
    if (!data || seededKey.current === tagIdsKey) return;
    const list = get(data, "data.data", []) as LatestTagValue[];
    list.forEach((item) => {
      if (!item?.tagId) return;
      applyTagFrame({
        tag_id: item.tagId,
        value: item.value,
        unit: item.unit ?? null,
        is_error: Boolean(item.isError),
        error_message: item.errorMessage ?? null,
        time: item.time,
      });
    });
    seededKey.current = tagIdsKey;
  }, [data, tagIdsKey, applyTagFrame]);
}
