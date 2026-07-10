import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { get } from "lodash";
import { HistoryRounded } from "@mui/icons-material";
import ContentLoader from "@/components/loader";
import ScreenArchiveModal from "../runtime/ScreenArchiveModal";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { requestScreens } from "@/services/api";
import { hasPermission } from "@/constants/permissions";

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
  const { data: session } = useSession();
  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  // Редактирование мнемосхемы — не операторская задача (см. routeAccess.js:
  // /dashboard/screens/[id] и так закрыт для не-админов на уровне маршрута,
  // это лишь скрывает саму ссылку, чтобы её не предлагать без доступа).
  const canEditScreen = hasPermission(session?.user?.permissions || [], "scada_storage", "update");

  const { data: screenResp, isLoading: isLoadingScreen } = useGetQuery({
    key: `${KEYS.screens}:detail:${screenId}`,
    url: `${URLS.screens}/${screenId}`,
    apiClient: requestScreens,
    headers: { ...authHeaders, Accept: "application/json" },
    enabled: Boolean(screenId),
  });

  const screen = get(screenResp, "data.data", get(screenResp, "data", null));
  const loadDocument = useDocumentStore((state) => state.loadDocument);
  const elements = useDocumentStore((state) => state.document.elements);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Теги этого экрана, сгруппированные по фигуре-источнику (обычно один
  // "прибор" на схеме = одна группа) — кнопка "Архив" открывает историю сразу
  // для них, без перехода на отдельную страницу, и не мешает теги разных
  // приборов в одну кучу. Фигуры "chart" (тренд) обрабатываются последними и
  // только подбирают теги, ещё не занятые каким-то прибором — иначе тренд,
  // отрисованный раньше в массиве элементов, перехватил бы группировку.
  const tagGroups = useMemo(() => {
    const seenTagIds = new Set<string>();
    const groups: Array<{ id: string; label: string; tags: Array<{ id: string; name: string }> }> = [];

    const collect = (el: (typeof elements)[number], fallbackLabel: string) => {
      const tags: Array<{ id: string; name: string }> = [];
      if (el.dataBinding?.tagId && !seenTagIds.has(el.dataBinding.tagId)) {
        seenTagIds.add(el.dataBinding.tagId);
        tags.push({ id: el.dataBinding.tagId, name: el.dataBinding.tagName || el.dataBinding.tagId });
      }
      (el.extraBindings ?? []).forEach((b) => {
        if (b?.tagId && !seenTagIds.has(b.tagId)) {
          seenTagIds.add(b.tagId);
          tags.push({ id: b.tagId, name: b.tagName || b.tagId });
        }
      });
      if (tags.length > 0) {
        groups.push({ id: el.id, label: el.label || fallbackLabel, tags });
      }
    };

    elements.filter((el) => el.type !== "chart").forEach((el) => collect(el, "Без названия"));
    elements.filter((el) => el.type === "chart").forEach((el) => collect(el, "Тренды"));

    return groups;
  }, [elements]);
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
            onClick={() =>
              canEditScreen ? router.push(`/dashboard/screens/${screenId}`) : router.back()
            }
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {canEditScreen ? "← К редактированию" : "← Назад"}
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-sm font-semibold text-slate-100">{screen.name}</span>
          <div className="h-4 w-px bg-slate-700" />
          <ConnectionStatusBadge />
        </div>
        <div className="flex items-center gap-3">
          {tagGroups.length > 0 && (
            <button
              type="button"
              onClick={() => setIsArchiveOpen(true)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <HistoryRounded fontSize="small" />
              Архив
            </button>
          )}
          <FullscreenKiosk />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <RuntimeCanvas />
      </div>
      {isArchiveOpen && (
        <ScreenArchiveModal
          screenName={screen.name}
          groups={tagGroups}
          onClose={() => setIsArchiveOpen(false)}
        />
      )}
    </div>
  );
};

export default RuntimePage;
