import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { get } from "lodash";
import {
  EditRounded,
  SchemaRounded,
  ShowChartRounded,
  TableChartRounded,
} from "@mui/icons-material";
import ContentLoader from "@/components/loader";
import ScreenDataPanel from "../runtime/ScreenDataPanel";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { hasPermission } from "@/constants/permissions";

import { useScreensBackend } from "../context/ScreensBackendContext";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useHistoryStore } from "../store/history/historyStore";
import { useRuntimeStore } from "../store/runtimeStore";
import { useMnemonicWebSocket } from "../hooks/useMnemonicWebSocket";
import { useSeedLatestTagValues } from "../hooks/useSeedLatestTagValues";
import { useTagCatalog } from "../hooks/useTagCatalog";
import type { DataBinding } from "../types";
import { createEmptyDocument } from "../document/defaults";
import { parseMnemonicParams } from "../document/documentSchema";
import { migrateMnemonicParams } from "../document/migrate";
import RuntimeCanvas from "../runtime/RuntimeCanvas";
import FullscreenKiosk from "../runtime/FullscreenKiosk";
import ConnectionStatusBadge from "../runtime/ConnectionStatusBadge";
import AlarmBanner from "../runtime/AlarmBanner";

interface RuntimePageProps {
  screenId: string;
  accessToken?: string;
}

/** Read-only live view of a screen — no edit chrome, fits any monitor via viewBox scaling, fullscreen kiosk toggle. */
const RuntimePage = ({ screenId, accessToken }: RuntimePageProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  const { apiClient, basePath, backendId } = useScreensBackend();

  // Редактирование мнемосхемы — не операторская задача (см. routeAccess.js:
  // /dashboard/screens/[id] и так закрыт для не-админов на уровне маршрута,
  // это лишь скрывает саму ссылку, чтобы её не предлагать без доступа).
  const canEditScreen = hasPermission(
    session?.user?.permissions || [],
    "scada_storage",
    "update",
  );

  const { data: screenResp, isLoading: isLoadingScreen } = useGetQuery({
    key: `${KEYS.screens}:detail:${backendId}:${screenId}`,
    url: `${URLS.screens}/${screenId}`,
    apiClient,
    headers: { ...authHeaders, Accept: "application/json" },
    enabled: Boolean(screenId),
  });

  const screen = get(screenResp, "data.data", get(screenResp, "data", null));
  const loadDocument = useDocumentStore((state) => state.loadDocument);
  const elements = useDocumentStore((state) => state.document.elements);
  // "Схема" — единственная вкладка, доступная всегда; "Тренды"/"Таблица"
  // появляются, только если на схеме вообще есть привязанные теги (см. их
  // условный рендер в панели вкладок ниже) — раньше это была одна кнопка
  // "Архив", открывавшая то же самое во всплывающем окне.
  const [activeTab, setActiveTab] = useState<"scheme" | "trends" | "table">(
    "scheme",
  );

  // Теги этого экрана для вкладок «Тренды» и «Таблица», сгруппированные по
  // УСТРОЙСТВУ, которому тег принадлежит (одна группа = один прибор). Раньше
  // группировали по фигуре на схеме и называли группу подписью фигуры — а у
  // большинства фигур подписи нет, и вкладка превращалась в россыпь одинаковых
  // заголовков «Без названия» (набор групп зависел от того, как нарисован
  // экран). Устройство от рисунка не зависит, поэтому два экрана с одними и
  // теми же приборами выглядят одинаково. Порядок тегов — как на схеме:
  // сначала оборудование, затем тренды и таблицы.
  const { placementByTagId } = useTagCatalog();
  const tagGroups = useMemo(() => {
    const seenTagIds = new Set<string>();
    const ordered: Array<{ id: string; name: string }> = [];
    const push = (binding?: DataBinding | null) => {
      if (!binding?.tagId || seenTagIds.has(binding.tagId)) return;
      seenTagIds.add(binding.tagId);
      ordered.push({ id: binding.tagId, name: binding.tagName || binding.tagId });
    };

    const isWidget = (el: (typeof elements)[number]) =>
      el.type === "chart" || el.type === "dataTable";
    [
      ...elements.filter((el) => !isWidget(el)),
      ...elements.filter((el) => el.type === "chart"),
      ...elements.filter((el) => el.type === "dataTable"),
    ].forEach((el) => {
      push(el.dataBinding);
      (el.extraBindings ?? []).forEach(push);
    });

    // Каталог устройств ещё не загружен — одна общая группа, без «Без устройства»
    if (placementByTagId.size === 0) {
      return ordered.length > 0
        ? [{ id: "all", label: "Теги экрана", tags: ordered }]
        : [];
    }

    const byDevice = new Map<
      string,
      { id: string; label: string; connection: string; tags: Array<{ id: string; name: string }> }
    >();
    ordered.forEach((tag) => {
      const placement = placementByTagId.get(tag.id);
      const key = placement?.deviceId ?? "none";
      if (!byDevice.has(key)) {
        byDevice.set(key, {
          id: key,
          label: placement?.deviceName ?? "Без устройства",
          connection: placement?.connectionName ?? "",
          tags: [],
        });
      }
      byDevice.get(key)!.tags.push(tag);
    });

    // Одноимённые устройства на разных подключениях различаем подключением
    const groups = [...byDevice.values()];
    const labelCount = new Map<string, number>();
    groups.forEach((g) => labelCount.set(g.label, (labelCount.get(g.label) ?? 0) + 1));
    return groups.map(({ id, label, connection, tags }) => ({
      id,
      label: (labelCount.get(label) ?? 0) > 1 && connection ? `${connection} → ${label}` : label,
      tags,
    }));
  }, [elements, placementByTagId]);

  const boundTagIds = useMemo(
    () => tagGroups.flatMap((g) => g.tags.map((t) => t.id)),
    [tagGroups],
  );

  // Гидратация привязана к id экрана: клик-переход между экранами в режиме
  // просмотра — клиентская навигация в тот же компонент, документ нужно
  // перезагрузить для нового id.
  const hydratedFor = useRef<string | null>(null);

  useMnemonicWebSocket(screenId, accessToken);
  // Экранный WS-канал шлёт только изменения, без начальной истории (в
  // отличие от ws/devices и ws/tags) — без этого снапшота каждое поле
  // показывает "—", пока что-то не изменится хотя бы раз.
  useSeedLatestTagValues(boundTagIds, accessToken);

  useEffect(() => {
    // Сверяем id из ответа: при клиентской навигации хук может ещё отдавать
    // закэшированные данные предыдущего экрана (keepPreviousData)
    if (
      screen &&
      get(screen, "id") === screenId &&
      hydratedFor.current !== screenId
    ) {
      const raw = get(screen, "params.mnemonic");
      const parsed = raw ? parseMnemonicParams(raw) : null;
      const doc = parsed
        ? migrateMnemonicParams(parsed).document
        : createEmptyDocument();
      loadDocument(doc);
      useHistoryStore.getState().clear();
      useUiStore.getState().clearSelection();
      useRuntimeStore.getState().clear();
      setActiveTab("scheme");
      hydratedFor.current = screenId;
    }
  }, [screen, screenId, loadDocument]);

  if (isLoadingScreen || !screen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e0e0e] font-ibmPlexSans">
        <Head>
          <title>Экран | SCADA</title>
        </Head>
        <ContentLoader classNames="" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0e0e0e] text-[#e5e2e1] font-ibmPlexSans">
      <Head>
        <title>{`${screen.name} — просмотр | SCADA`}</title>
      </Head>
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-dark/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="h-8 px-4 text-[13px] font-medium text-text-secondary border border-surface-border hover:border-surface-border-hover hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.96] transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-dark"
          >
            Назад
          </button>
          {canEditScreen && (
            <button
              type="button"
              onClick={() => router.push(`${basePath}/${screenId}`)}
              title="Открыть редактор мнемосхемы"
              className="h-8 flex items-center gap-1.5 px-3 text-[13px] font-medium text-blue-300 border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400/60 hover:text-blue-200 active:scale-[0.96] transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-dark"
            >
              <EditRounded sx={{ fontSize: 16 }} />
              Редактировать
            </button>
          )}
          <div className="h-4 w-px bg-surface-border" />
          <span className="text-sm font-semibold text-text-primary">
            {screen.name}
          </span>
          <div className="h-4 w-px bg-surface-border" />
          <ConnectionStatusBadge />
        </div>
        <div className="flex items-center gap-3">
          <FullscreenKiosk />
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 h-9 border-b border-surface-border bg-surface-dark/40 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("scheme")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-[2px] text-[12px] font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 ${
            activeTab === "scheme"
              ? "bg-blue-500/15 text-blue-300 border border-blue-500/40"
              : "text-text-muted border border-transparent hover:text-text-primary hover:bg-white/[0.03]"
          }`}
        >
          <SchemaRounded fontSize="small" />
          Схема
        </button>

        {tagGroups.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("trends")}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-[2px] text-[12px] font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 ${
                activeTab === "trends"
                  ? "bg-blue-500/15 text-blue-300 border border-blue-500/40"
                  : "text-text-muted border border-transparent hover:text-text-primary hover:bg-white/[0.03]"
              }`}
            >
              <ShowChartRounded fontSize="small" />
              Тренды
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-[2px] text-[12px] font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 ${
                activeTab === "table"
                  ? "bg-blue-500/15 text-blue-300 border border-blue-500/40"
                  : "text-text-muted border border-transparent hover:text-text-primary hover:bg-white/[0.03]"
              }`}
            >
              <TableChartRounded fontSize="small" />
              Таблица
            </button>
          </>
        )}
      </div>

      {activeTab === "scheme" ? (
        <div className="flex-1 min-h-0">
          <RuntimeCanvas />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ScreenDataPanel
            groups={tagGroups}
            mode={activeTab === "trends" ? "chart" : "table"}
            screenName={screen.name}
          />
        </div>
      )}

      <AlarmBanner />
    </div>
  );
};

export default RuntimePage;
