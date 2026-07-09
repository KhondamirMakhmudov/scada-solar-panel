import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Hydrate, QueryClientProvider } from "@tanstack/react-query";
import ClientOnlyToaster from "@/components/toast";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import reactQueryClient from "@/config/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { getAppSettings, applyAppSettings } from "@/lib/appSettings";

import CssBaseline from "@mui/material/CssBaseline";
import "@/styles/globals.css";
import "@/styles/loader.css";

import Layout from "@/components/layout";

// Обработчик ошибок сессии next-auth: если jwt-колбэк на сервере не смог
// обновить access-токен (см. [...nextauth].js), сессия приходит с
// session.error — разлогиниваем сразу.
//
// isSigningOutRef — не косметика, а фикс реального бага: без него, если
// signOut() не успевает довести до конца свой редирект/размонтирование
// раньше, чем эффект перезапустится (сессия/провайдер могут переотрисовать
// несколько раз подряд), signOut() вызывается повторно — это и была причина
// "бесконечного цикла" в логине (пачки session/csrf запросов без остановки).
function SessionErrorHandler() {
  const { data: session } = useSession();
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    if (isSigningOutRef.current) return;

    if (
      session?.error === "RefreshAccessTokenError" ||
      session?.error === "RefreshTokenExpired"
    ) {
      isSigningOutRef.current = true;
      console.error(`[Auth] Выход из системы: ${session.error}`);
      signOut({ callbackUrl: "/" });
    }
  }, [session]);

  return null;
}

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  const [queryClient] = useState(() => reactQueryClient);
  const router = useRouter();

  // Применяем сохранённые настройки (автообновление данных и т.д.)
  // к QueryClient при старте приложения
  useEffect(() => {
    applyAppSettings(queryClient, getAppSettings());
  }, [queryClient]);

  const isHomePage = router.pathname === "/";

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Hydrate state={pageProps?.dehydratedState}>
            <div className="dark">
              <CssBaseline />
              <SessionErrorHandler />
              {isHomePage ? (
                <Component {...pageProps} />
              ) : (
                <Layout
                  bgColor={pageProps.bgColor}
                  headerBg={pageProps.headerBg}
                >
                  <Component {...pageProps} />
                </Layout>
              )}
              <ClientOnlyToaster />
            </div>
          </Hydrate>
        </AuthProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
