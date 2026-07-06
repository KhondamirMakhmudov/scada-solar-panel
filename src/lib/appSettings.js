import storage from "@/services/storage";

export const APP_SETTINGS_KEY = "scada_app_settings";

export const DEFAULT_APP_SETTINGS = {
  // Автообновление данных (react-query refetchInterval)
  autoRefreshEnabled: false,
  autoRefreshIntervalSec: 30,
};

export const getAppSettings = () => {
  try {
    const raw = storage.get(APP_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_APP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
};

export const saveAppSettings = (settings) => {
  const merged = { ...getAppSettings(), ...settings };
  storage.set(APP_SETTINGS_KEY, JSON.stringify(merged));
  return merged;
};

// Применяет настройки к живому QueryClient — все useQuery в приложении
// подхватывают новый refetchInterval без перезагрузки страницы.
export const applyAppSettings = (queryClient, settings) => {
  queryClient.setDefaultOptions({
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      refetchInterval: settings.autoRefreshEnabled
        ? settings.autoRefreshIntervalSec * 1000
        : false,
    },
  });
};
