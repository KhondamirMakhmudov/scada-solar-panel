import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestScreens } from "@/services/api";
import type { FlatOverviewDevice, OverviewStationsResponse } from "./overviewStationsTypes";

/**
 * The docs (main_page.md) say the backend's own cache is 10s and polling
 * more often than that buys nothing — 20s keeps this comfortably inside
 * that window without hammering the endpoint on every render.
 */
const POLL_MS = 20000;

/**
 * GET /api/v1/overview/stations on the scada_storage service (same 8102
 * backend as screens/tag-values — see ScreensBackendContext).
 *
 * Uses react-query's `useQuery` directly with a *static* key and its own
 * `refetchInterval`, deliberately not the shared `useGetQuery` hook's
 * "bump a local tick state" pattern (see useTagTrend): this hook is called
 * from many places at once — the dashboard section AND, per-shape, from
 * every equipment element on a runtime screen (useOverviewStatusForTag) —
 * and a per-instance `setInterval` would mean N independent polling loops
 * hitting the endpoint instead of one. A static key lets react-query
 * dedupe every simultaneous caller into a single shared subscription and a
 * single interval, however many components ask for it.
 */
export function useOverviewStations() {
  const { data: session } = useSession();

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: [KEYS.overviewStations],
    queryFn: () =>
      requestScreens.get(URLS.overviewStations, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          Accept: "application/json",
        },
      }),
    enabled: Boolean(session?.accessToken),
    refetchInterval: POLL_MS,
    placeholderData: (previous) => previous,
  });

  const response: OverviewStationsResponse | null = get(data, "data", null);
  const stations = useMemo(() => response?.stations ?? [], [response]);

  // Flattened once per fetch (not per consumer) — the runtime's per-element
  // status enrichment does a cheap Map lookup per shape instead of walking
  // stations→connections→devices on every render of every equipment shape.
  const deviceById = useMemo(() => {
    const map = new Map<string, FlatOverviewDevice>();
    stations.forEach((station) => {
      station.connections.forEach((connection) => {
        connection.devices.forEach((device) => {
          map.set(device.id, {
            ...device,
            stationDriverId: station.driverId,
            connectionId: connection.id,
            connectionName: connection.name,
          });
        });
      });
    });
    return map;
  }, [stations]);

  return { response, stations, deviceById, isLoading, isFetching, isError };
}
