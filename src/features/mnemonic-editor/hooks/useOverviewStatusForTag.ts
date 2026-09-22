import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestPython } from "@/services/api";
import { useOverviewStations } from "@/features/overview/useOverviewStations";
import { overviewDeviceTooltip } from "@/features/overview/overviewDisplay";

interface TagLike {
  id: string;
  deviceId?: string;
}

function resolveTagDeviceId(tag: TagLike): string | null {
  return tag.deviceId || get(tag, "device.id", "") || null;
}

/**
 * Enrichment, not the source of truth: the shape's own status dot is still
 * driven by its bound tag's live value (see resolveVisual.deriveLiveStatus)
 * — this only adds *why*, when the overview endpoint happens to know about
 * the device that tag belongs to. A tag with no matching device (most
 * screens bind arbitrary tags, not every tag belongs to an inverter this
 * endpoint tracks) just returns null and the dot behaves exactly as before.
 *
 * Same tag→device resolution as useDeviceNameForTag, sharing its query key
 * so react-query serves it from cache instead of refetching per shape.
 */
export function useOverviewStatusForTag(tagId: string | undefined): string | null {
  const { data: session } = useSession();
  const { deviceById, response } = useOverviewStations();

  const { data: tagsResp } = useGetQuery({
    // /tags is paginated (same `pagination` shape as /devices — see
    // deviceDisplay.js) — without an explicit pageSize the server defaults
    // to its first page, and a tag outside it would silently never resolve
    // to a device here, even though it definitely has one.
    key: `${KEYS.tags}:overview-status`,
    url: URLS.tags,
    apiClient: requestPython,
    params: { page: 1, pageSize: 1000 },
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: Boolean(session?.accessToken) && Boolean(tagId),
  });

  return useMemo(() => {
    if (!tagId || !response) return null;
    const tags: TagLike[] = get(tagsResp, "data.data", get(tagsResp, "data", [])) || [];
    const tag = tags.find((t) => t.id === tagId);
    const deviceId = tag ? resolveTagDeviceId(tag) : null;
    if (!deviceId) return null;
    const device = deviceById.get(deviceId);
    return device ? overviewDeviceTooltip(device, response.generatedAt) : null;
  }, [tagId, tagsResp, deviceById, response]);
}
