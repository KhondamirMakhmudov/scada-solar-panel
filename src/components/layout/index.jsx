import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import ContentLoader from "@/components/loader";
import { hasRouteAccess, getFirstAccessiblePath } from "@/constants/routeAccess";

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

  // Статический контроль доступа по ролям (см. src/constants/routeAccess.js):
  // скрытый пункт меню не защищает от ручного ввода URL — проверяем здесь.
  const isRouteDenied =
    status === "authenticated" &&
    !isHardSessionError &&
    !hasRouteAccess(router.pathname, session?.user?.roles);

  useEffect(() => {
    if (status === "unauthenticated" || isHardSessionError) {
      router.replace("/");
      return;
    }
    if (isRouteDenied) {
      toast.error("У вас нет доступа к этому разделу", { id: "route-denied" });
      router.replace(getFirstAccessiblePath(session?.user?.roles));
    }
  }, [status, isHardSessionError, isRouteDenied, router, session?.user?.roles]);

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    isHardSessionError ||
    isRouteDenied
  ) {
    return <ContentLoader />;
  }

  return children;
};

export default Layout;
