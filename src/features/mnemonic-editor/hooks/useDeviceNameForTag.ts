import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestPython } from "@/services/api";

interface TagLike {
  id: string;
  deviceId?: string;
  device?: { id?: string };
}

interface DeviceLike {
  id: string;
  name?: string;
}

function resolveTagDeviceId(tag: TagLike): string | null {
  return tag.deviceId || get(tag, "device.id", "") || null;
}

/**
 * Resolves a tag's owning device name — used by Chart.tsx to auto-title a
 * trend as "{device} — {parameter}" instead of a bare tag name, so it's
 * obvious at a glance which node on the diagram it belongs to (same device
 * resolution as BindingSection's extras filter). Cheap even with several
 * charts mounted: tags/devices are fetched under the same query keys used
 * elsewhere in the editor, so react-query serves them from cache instead of
 * refetching per chart.
 */
export function useDeviceNameForTag(tagId: string | undefined): string | null {
  const { data: session } = useSession();
  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const { data: tagsResp } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    apiClient: requestPython,
    headers: authHeaders,
    enabled: Boolean(session?.accessToken) && Boolean(tagId),
  });
  const { data: devicesResp } = useGetQuery({
    key: `${KEYS.devices}:chart-title`,
    url: URLS.devices,
    apiClient: requestPython,
    headers: authHeaders,
    enabled: Boolean(session?.accessToken) && Boolean(tagId),
  });

  return useMemo(() => {
    if (!tagId) return null;
    const tags: TagLike[] = get(tagsResp, "data.data", get(tagsResp, "data", [])) || [];
    const devices: DeviceLike[] = get(devicesResp, "data.data", get(devicesResp, "data", [])) || [];
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return null;
    const deviceId = resolveTagDeviceId(tag);
    if (!deviceId) return null;
    return devices.find((d) => d.id === deviceId)?.name || null;
  }, [tagId, tagsResp, devicesResp]);
}
