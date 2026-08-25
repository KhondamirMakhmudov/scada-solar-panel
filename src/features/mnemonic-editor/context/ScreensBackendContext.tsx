import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AxiosInstance } from "axios";
import { config } from "@/config";
import { requestScreens } from "@/services/api";

export interface ScreensBackend {
  /** axios client for the screens/tag-values REST endpoints */
  apiClient: AxiosInstance;
  /** http(s) base URL the screens WS channel is derived from (see buildScadaWsUrl) */
  baseHttpUrl: string;
  /** route prefix for this backend's editor/runtime pages, e.g. "/dashboard/screens" */
  basePath: string;
  /** discriminator folded into query-cache keys so prod/draft never share a cached response */
  backendId: "prod" | "draft";
}

// Прод-бэкенд по умолчанию — существующие маршруты /dashboard/screens/...
// не оборачивают дерево в провайдер и продолжают работать как раньше.
export const defaultScreensBackend: ScreensBackend = {
  apiClient: requestScreens,
  baseHttpUrl: config.SCREENS_API_URL,
  basePath: "/dashboard/screens",
  backendId: "prod",
};

const ScreensBackendContext = createContext<ScreensBackend>(defaultScreensBackend);

export function useScreensBackend(): ScreensBackend {
  return useContext(ScreensBackendContext);
}

export function ScreensBackendProvider({
  value,
  children,
}: {
  value: ScreensBackend;
  children: ReactNode;
}) {
  return <ScreensBackendContext.Provider value={value}>{children}</ScreensBackendContext.Provider>;
}
