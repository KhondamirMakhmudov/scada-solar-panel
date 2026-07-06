import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestScreens } from "@/services/api";
import { useDocumentStore } from "../../store/documentStore";
import { commitImmediate } from "../../store/history/historyActions";
import type { MnemonicElement } from "../../types";

interface ScreenOption {
  id: string;
  name?: string;
}

interface NavigationSectionProps {
  element: MnemonicElement;
  /** id текущего экрана — исключается из списка, чтобы не ссылаться на себя */
  currentScreenId?: string;
}

/** Переход по клику: в режиме просмотра клик по элементу открывает выбранный экран (drill-down с обзорной схемы на детальную). */
const NavigationSection = ({ element, currentScreenId }: NavigationSectionProps) => {
  const { data: session } = useSession();
  const updateElement = useDocumentStore((state) => state.updateElement);

  const { data: screensResp, isLoading } = useGetQuery({
    key: `${KEYS.screens}:nav-picker`,
    url: URLS.screens,
    apiClient: requestScreens,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: Boolean(session?.accessToken),
  });

  const screens: ScreenOption[] = useMemo(() => {
    const raw = get(screensResp, "data.data", get(screensResp, "data", [])) || [];
    return (Array.isArray(raw) ? raw : []).filter(
      (screen: ScreenOption) => screen.id && screen.id !== currentScreenId,
    );
  }, [screensResp, currentScreenId]);

  const handleChange = (screenId: string) => {
    commitImmediate(() =>
      updateElement(element.id, { navigateToScreenId: screenId || null }),
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        Переход по клику
      </p>
      <select
        value={element.navigateToScreenId ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isLoading}
        className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-50"
      >
        <option value="">Без перехода</option>
        {screens.map((screen) => (
          <option key={screen.id} value={screen.id}>
            {screen.name || screen.id}
          </option>
        ))}
      </select>
      {element.navigateToScreenId && (
        <p className="text-[10px] text-slate-600">
          Работает в режиме просмотра: сохраните схему, откройте
          «Предпросмотр» и кликните по элементу. В редакторе у элемента
          появился значок ↗ — клик по нему сразу открывает целевой экран.
        </p>
      )}
    </div>
  );
};

export default NavigationSection;
