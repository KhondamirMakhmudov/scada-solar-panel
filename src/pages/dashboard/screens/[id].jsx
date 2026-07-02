import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { EditorPage } from "@/features/mnemonic-editor";

const ScreenEditorRoute = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();

  if (!id) return null;

  return <EditorPage screenId={id} accessToken={session?.accessToken} />;
};

export default ScreenEditorRoute;
