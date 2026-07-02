import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { RuntimePage } from "@/features/mnemonic-editor";

const ScreenRuntimeRoute = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();

  if (!id) return null;

  return <RuntimePage screenId={id} accessToken={session?.accessToken} />;
};

export default ScreenRuntimeRoute;
