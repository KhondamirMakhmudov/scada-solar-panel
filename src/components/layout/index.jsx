import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import ContentLoader from "@/components/loader";

// Session gate for every non-home page (see src/pages/_app.js) — waits for
// next-auth to resolve, then bounces unauthenticated users back to "/".
// Not a visual page-chrome component; each dashboard page still owns its
// own DashboardLayout for sidebar/header.
const Layout = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Редиректим немедленно только при окончательном истечении токена.
  // "Мягкие" ошибки (RefreshTokenInvalidated / RefreshAccessTokenError —
  // вероятная коллизия с логином в другом проекте) не блокируют рендер:
  // SessionErrorHandler в _app.js сам решает, разлогинивать ли, после
  // попытки тихого восстановления сессии.
  const isHardSessionError = session?.error === "RefreshTokenExpired";

  useEffect(() => {
    if (status === "unauthenticated" || isHardSessionError) {
      router.replace("/");
    }
  }, [status, isHardSessionError, router]);

  if (status === "loading" || status === "unauthenticated" || isHardSessionError) {
    return <ContentLoader />;
  }

  return children;
};

export default Layout;
