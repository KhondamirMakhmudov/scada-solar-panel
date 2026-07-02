import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { get } from "lodash";
import toast from "react-hot-toast";
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
import EditorToolbar from "../toolbar/EditorToolbar";
import ShapePalette from "../toolbar/ShapePalette";
import EditorCanvas from "../canvas/EditorCanvas";
import PropertiesPanel from "../panels/PropertiesPanel";
import { createEmptyDocument } from "../document/defaults";
import { parseMnemonicParams } from "../document/documentSchema";
import { migrateMnemonicParams } from "../document/migrate";
import { serializeDocument } from "../document/serialize";
import { mergeTagIds } from "../document/tagSync";

interface EditorPageProps {
  screenId: string;
  accessToken?: string;
}

const EditorPage = ({ screenId, accessToken }: EditorPageProps) => {
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

  const document = useDocumentStore((state) => state.document);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const loadDocument = useDocumentStore((state) => state.loadDocument);
  const markSaved = useDocumentStore((state) => state.markSaved);

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const hydrated = useRef(false);

  useMnemonicWebSocket(screenId, accessToken);

  useEffect(() => {
    if (screen && !hydrated.current) {
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
      useRuntimeStore.getState().clear();
      hydrated.current = true;
    }
  }, [screen, loadDocument]);

  const persistScreen = async () => {
    if (!screen) return false;

    try {
      const existingParams = get(screen, "params", {}) || {};
      const existingTagIds: string[] = Array.isArray(screen.tagIds) ? screen.tagIds : [];

      await requestScreens.patch(
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
        get(error, "response.data.message", "Ошибка сохранения схемы") as string,
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
      window.open(`/dashboard/screens/${screenId}/runtime`, "scada_runtime_preview");
    }
  };

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
        <title>{`${screen.name} | SCADA`}</title>
      </Head>
      <EditorToolbar
        title={screen.name}
        onBack={() => router.push("/dashboard/screens")}
        onSave={handleSave}
        isSaving={isSaving}
        isDirty={isDirty}
        onPreview={handlePreview}
        isPreviewing={isPreviewing}
      />
      <div className="flex flex-1 min-h-0">
        <ShapePalette />
        <div className="flex-1 min-w-0">
          <EditorCanvas />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
};

export default EditorPage;
