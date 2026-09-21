import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestPython } from "@/services/api";

export interface CatalogTag {
  id: string;
  name?: string;
  deviceId?: string;
}

export interface CatalogDevice {
  id: string;
  name?: string;
  connectionId?: string;
}

export interface CatalogConnection {
  id: string;
  name?: string;
}

/** Куда относится тег: подключение → устройство. */
export interface TagPlacement {
  deviceId: string | null;
  deviceName: string;
  connectionId: string | null;
  connectionName: string;
}

export const NO_DEVICE_LABEL = "Без устройства";
export const NO_CONNECTION_LABEL = "Без подключения";

/**
 * Каталог «подключение → устройство → тег» для мнемосхемы. Запросы идут под
 * теми же ключами, что и в BindingSection, поэтому react-query отдаёт их из
 * общего кэша, а не тянет заново для каждой таблицы/выбора тегов.
 */
export function useTagCatalog(enabled = true) {
  const { data: session } = useSession();
  const headers = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };
  const isEnabled = enabled && Boolean(session?.accessToken);

  const { data: tagsResp, isLoading: loadingTags } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    apiClient: requestPython,
    headers,
    enabled: isEnabled,
  });
  const { data: devicesResp } = useGetQuery({
    key: `${KEYS.devices}:binding-tree`,
    url: URLS.devices,
    apiClient: requestPython,
    headers,
    enabled: isEnabled,
  });
  const { data: connectsResp } = useGetQuery({
    key: `${KEYS.connects}:binding-tree`,
    url: URLS.connects,
    apiClient: requestPython,
    headers,
    enabled: isEnabled,
  });

  const tags: CatalogTag[] = useMemo(
    () => get(tagsResp, "data.data", get(tagsResp, "data", [])) || [],
    [tagsResp],
  );
  const devices: CatalogDevice[] = useMemo(
    () => get(devicesResp, "data.data", get(devicesResp, "data", [])) || [],
    [devicesResp],
  );
  const connections: CatalogConnection[] = useMemo(
    () => get(connectsResp, "data.data", get(connectsResp, "data", [])) || [],
    [connectsResp],
  );

  const placementByTagId = useMemo(() => {
    const deviceById = new Map(devices.map((d) => [d.id, d]));
    const connNameById = new Map(connections.map((c) => [c.id, c.name || c.id]));
    const map = new Map<string, TagPlacement>();
    tags.forEach((tag) => {
      const deviceId = tag.deviceId || get(tag, "device.id", "") || null;
      const device = deviceId ? deviceById.get(deviceId) : undefined;
      const connectionId = device?.connectionId || null;
      map.set(tag.id, {
        deviceId,
        deviceName: device?.name || (deviceId ? deviceId : NO_DEVICE_LABEL),
        connectionId,
        connectionName: connectionId ? connNameById.get(connectionId) || connectionId : NO_CONNECTION_LABEL,
      });
    });
    return map;
  }, [tags, devices, connections]);

  return { tags, devices, connections, placementByTagId, isLoading: loadingTags };
}
