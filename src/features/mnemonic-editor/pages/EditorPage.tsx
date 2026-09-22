import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { get } from "lodash";
import toast from "react-hot-toast";
import ContentLoader from "@/components/loader";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import { translateApiError } from "@/lib/apiErrorTranslation";

import { useScreensBackend } from "../context/ScreensBackendContext";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useHistoryStore } from "../store/history/historyStore";
import { useRuntimeStore } from "../store/runtimeStore";
import { useMnemonicWebSocket } from "../hooks/useMnemonicWebSocket";
import EditorToolbar from "../toolbar/EditorToolbar";
import ShapePalette from "../toolbar/ShapePalette";
import WorkspaceTabs from "../toolbar/WorkspaceTabs";
import EditorCanvas from "../canvas/EditorCanvas";
import PropertiesPanel from "../panels/PropertiesPanel";
import { createEmptyDocument } from "../document/defaults";
import { parseDiagramClipboard, parseMnemonicParams } from "../document/documentSchema";
import { migrateMnemonicParams } from "../document/migrate";
import { serializeDocument } from "../document/serialize";
import { mergeTagIds } from "../document/tagSync";
import { buildDiagramClipboardPayload, remapDiagramForPaste } from "../document/diagramClipboard";
import { commitImmediate } from "../store/history/historyActions";

interface EditorPageProps {
  screenId: string;
  accessToken?: string;
}

const EditorPage = ({ screenId, accessToken }: EditorPageProps) => {
  const router = useRouter();
  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const { apiClient, basePath, backendId } = useScreensBackend();

  const { data: screenResp, isLoading: isLoadingScreen } = useGetQuery({
    key: `${KEYS.screens}:detail:${backendId}:${screenId}`,
    url: `${URLS.screens}/${screenId}`,
    apiClient,
    headers: { ...authHeaders, Accept: "application/json" },
    enabled: Boolean(screenId),
  });

  const screen = get(screenResp, "data.data", get(screenResp, "data", null));

  const document = useDocumentStore((state) => state.document);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const loadDocument = useDocumentStore((state) => state.loadDocument);
  const markSaved = useDocumentStore((state) => state.markSaved);

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  // Гидратация по id экрана (см. RuntimePage): клиентская навигация между
  // редакторами разных экранов должна перезагружать документ
  const hydratedFor = useRef<string | null>(null);

  useMnemonicWebSocket(screenId, accessToken);

  useEffect(() => {
    if (screen && get(screen, "id") === screenId && hydratedFor.current !== screenId) {
      const raw = get(screen, "params.mnemonic");
      const parsed = raw ? parseMnemonicParams(raw) : null;
      const doc = parsed
        ? migrateMnemonicParams(parsed).document
        : createEmptyDocument();
      loadDocument(doc);
      // documentStore/uiStore/historyStore/runtimeStore are module-level
      // singletons, not per-mount state — navigating between two different
      // screens' editors without a full page reload would otherwise leak
      // the previous screen's undo history, selection, and live tag values
      // into this one.
      useHistoryStore.getState().clear();
      useUiStore.getState().clearSelection();
      useUiStore.getState().setWorkspace("all");
      useRuntimeStore.getState().clear();
      hydratedFor.current = screenId;
    }
  }, [screen, screenId, loadDocument]);

  const persistScreen = async () => {
    if (!screen) return false;

    try {
      const existingParams = get(screen, "params", {}) || {};
      const existingTagIds: string[] = Array.isArray(screen.tagIds) ? screen.tagIds : [];

      await apiClient.patch(
        `${URLS.screens}/${screenId}`,
        {
          name: screen.name,
          description: screen.description || "",
          isActive: Boolean(screen.isActive),
          tagIds: mergeTagIds(existingTagIds, document),
          params: {
            ...existingParams,
            mnemonic: serializeDocument(document),
          },
        },
        { headers: authHeaders },
      );

      markSaved();
      return true;
    } catch (error) {
      toast.error(
        (translateApiError(get(error, "response.data.message")) as string) ||
          "Ошибка сохранения схемы",
      );
      return false;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await persistScreen();
    setIsSaving(false);
    if (ok) toast.success("Схема сохранена");
  };

  // Preview always saves first — the runtime view is loaded via a fresh GET,
  // so opening it without saving would just show the last-saved state, not
  // what's currently on the canvas. Uses a named target (not literal
  // "_blank") so repeated clicks reuse the same preview tab instead of
  // piling up a new blank tab every time — the browser navigates the
  // existing "scada_runtime_preview" window if one is already open.
  const handlePreview = async () => {
    setIsPreviewing(true);
    const ok = await persistScreen();
    setIsPreviewing(false);
    if (ok) {
      window.open(`${basePath}/${screenId}/runtime`, "scada_runtime_preview");
    }
  };

  // Копирует только нарисованное (элементы + связи между ними) — не имя, не
  // теги экрана, не настройки холста. Работает между любыми двумя экранами,
  // включая черновой ↔ прод: id тегов общие для обоих бэкендов (см.
  // ScreensBackendContext), так что привязки переносятся рабочими как есть.
  const handleCopyDiagram = async () => {
    if (document.elements.length === 0) {
      toast.error("На схеме нет элементов для копирования");
      return;
    }
    try {
      const payload = buildDiagramClipboardPayload(document.elements, document.connections);
      await navigator.clipboard.writeText(JSON.stringify(payload));
      toast.success(`Скопировано элементов: ${document.elements.length}`);
    } catch {
      toast.error("Буфер обмена недоступен в этом браузере");
    }
  };

  const handlePasteDiagram = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseDiagramClipboard(JSON.parse(text));
      if (!parsed) {
        toast.error("В буфере обмена нет схемы, скопированной из редактора");
        return;
      }

      const { elements: newElements, connections: newConnections } = remapDiagramForPaste(
        parsed.elements,
        parsed.connections,
      );

      commitImmediate(() => {
        const current = useDocumentStore.getState().document;
        useDocumentStore.getState().setElementsAndConnections(
          [...current.elements, ...newElements],
          [...current.connections, ...newConnections],
        );
      });

      useUiStore.getState().select(null);
      newElements.forEach((el) => useUiStore.getState().toggleSelect(el.id));

      toast.success(`Вставлено элементов: ${newElements.length} — не забудьте сохранить`);
    } catch {
      toast.error("Буфер обмена пуст или содержит не JSON");
    }
  };

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
        <title>{`${screen.name} | SCADA`}</title>
      </Head>
      <EditorToolbar
        title={screen.name}
        onBack={() => router.push(basePath)}
        onSave={handleSave}
        isSaving={isSaving}
        isDirty={isDirty}
        onPreview={handlePreview}
        isPreviewing={isPreviewing}
        rightSlot={
          <>
            <button
              type="button"
              onClick={handleCopyDiagram}
              title="Скопировать нарисованные элементы схемы в буфер обмена"
              className="h-8 flex items-center gap-1.5 border border-surface-border hover:border-surface-border-hover text-text-secondary hover:text-text-primary text-[14.5px] px-3 rounded-[2px] transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-dark"
            >
              Копировать
            </button>
            <button
              type="button"
              onClick={handlePasteDiagram}
              title="Вставить элементы схемы, скопированные с другого экрана"
              className="h-8 flex items-center gap-1.5 border border-surface-border hover:border-surface-border-hover text-text-secondary hover:text-text-primary text-[14.5px] px-3 rounded-[2px] transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-dark"
            >
              Вставить
            </button>
          </>
        }
      />
      <WorkspaceTabs />
      <div className="flex flex-1 min-h-0">
        <ShapePalette />
        <div className="flex-1 min-w-0">
          <EditorCanvas />
        </div>
        <PropertiesPanel
          screenTagIds={Array.isArray(screen.tagIds) ? screen.tagIds : []}
          screenId={screenId}
        />
      </div>
    </div>
  );
};

export default EditorPage;
