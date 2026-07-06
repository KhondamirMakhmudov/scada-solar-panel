import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { requestScreens } from "@/services/api";

import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useHistoryStore } from "../store/history/historyStore";
import { useRuntimeStore } from "../store/runtimeStore";
import { useMnemonicWebSocket } from "../hooks/useMnemonicWebSocket";
import { createEmptyDocument } from "../document/defaults";
import { parseMnemonicParams } from "../document/documentSchema";
import { migrateMnemonicParams } from "../document/migrate";
import RuntimeCanvas from "../runtime/RuntimeCanvas";
import FullscreenKiosk from "../runtime/FullscreenKiosk";
import ConnectionStatusBadge from "../runtime/ConnectionStatusBadge";

interface RuntimePageProps {
  screenId: string;
  accessToken?: string;
}

/** Read-only live view of a screen — no edit chrome, fits any monitor via viewBox scaling, fullscreen kiosk toggle. */
const RuntimePage = ({ screenId, accessToken }: RuntimePageProps) => {
  const router = useRouter();
  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const { data: screenResp, isLoading: isLoadingScreen } = useGetQuery({
    key: `${KEYS.screens}:detail:${screenId}`,
    url: `${URLS.screens}/${screenId}`,
    apiClient: requestScreens,
    headers: { ...authHeaders, Accept: "application/json" },
    enabled: Boolean(screenId),
  });

  const screen = get(screenResp, "data.data", get(screenResp, "data", null));
  const loadDocument = useDocumentStore((state) => state.loadDocument);
  // Гидратация привязана к id экрана: клик-переход между экранами в режиме
  // просмотра — клиентская навигация в тот же компонент, документ нужно
  // перезагрузить для нового id.
  const hydratedFor = useRef<string | null>(null);

  useMnemonicWebSocket(screenId, accessToken);

  useEffect(() => {
    // Сверяем id из ответа: при клиентской навигации хук может ещё отдавать
    // закэшированные данные предыдущего экрана (keepPreviousData)
    if (screen && get(screen, "id") === screenId && hydratedFor.current !== screenId) {
      const raw = get(screen, "params.mnemonic");
      const parsed = raw ? parseMnemonicParams(raw) : null;
      const doc = parsed ? migrateMnemonicParams(parsed).document : createEmptyDocument();
      loadDocument(doc);
      useHistoryStore.getState().clear();
      useUiStore.getState().clearSelection();
      useRuntimeStore.getState().clear();
      hydratedFor.current = screenId;
    }
  }, [screen, screenId, loadDocument]);

  if (isLoadingScreen || !screen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e0e0e] font-manrope">
        <Head>
          <title>Экран | SCADA</title>
        </Head>
        <ContentLoader classNames="" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0e0e0e] text-[#e5e2e1] font-manrope">
      <Head>
        <title>{`${screen.name} — просмотр | SCADA`}</title>
      </Head>
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/screens/${screenId}`)}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← К редактированию
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-sm font-semibold text-slate-100">{screen.name}</span>
          <div className="h-4 w-px bg-slate-700" />
          <ConnectionStatusBadge />
        </div>
        <FullscreenKiosk />
      </div>
      <div className="flex-1 min-h-0">
        <RuntimeCanvas />
      </div>
    </div>
  );
};

export default RuntimePage;
