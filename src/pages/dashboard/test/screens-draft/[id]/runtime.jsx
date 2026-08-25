import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { RuntimePage } from "@/features/mnemonic-editor";
import { ScreensBackendProvider } from "@/features/mnemonic-editor/context/ScreensBackendContext";
import { config } from "@/config";
import { requestScreensDraft } from "@/services/api";

// Черновой вариант /dashboard/screens/[id]/runtime: живой просмотр экрана
// с чернового сервиса экранов (8103).
const DRAFT_BACKEND = {
  apiClient: requestScreensDraft,
  baseHttpUrl: config.SCREENS_API_DRAFT_URL,
  basePath: "/dashboard/test/screens-draft",
  backendId: "draft",
};

const ScreenRuntimeDraftRoute = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();

  if (!id) return null;

  return (
    <ScreensBackendProvider value={DRAFT_BACKEND}>
      <RuntimePage screenId={id} accessToken={session?.accessToken} />
    </ScreensBackendProvider>
  );
};

export default ScreenRuntimeDraftRoute;
