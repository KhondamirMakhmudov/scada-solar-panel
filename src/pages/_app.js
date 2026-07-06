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

// Обработчик ошибок сессии next-auth.
//
// Бэкенд (app.tpp.uz) глобально инвалидирует refresh-токен во всех
// проектах при параллельном логине одного и того же аккаунта
// (ies-dashboard, secure-monitor, secure-monitor-fer, employee-permission).
// Это backend-ограничение, которое в ближайшее время не починят, поэтому
// на фронте различаем два случая:
//
// 1. token.error === "RefreshTokenExpired" — refresh-токен реально истёк
//    по времени (>10 дней). Тут выход из системы оправдан, делаем его
//    сразу.
// 2. token.error === "RefreshTokenInvalidated" / "RefreshAccessTokenError"
//    — "мягкая" ошибка, вероятно коллизия с другим проектом или временный
//    сбой сети. Не выкидываем пользователя сразу: один раз тихо пробуем
//    обновить сессию через useSession().update() (это ещё раз прогоняет
//    jwt-колбэк на сервере с несколькими внутренними retry-попытками) и
//    только если ошибка сохранилась — выходим из системы.
function SessionErrorHandler() {
  const { data: session, update } = useSession();

  // Защита от одновременных/повторных вызовов signOut()
  const isSigningOutRef = useRef(false);
  // Защита от повторного запуска update(), пока предыдущая попытка не завершилась
  const isRetryingRef = useRef(false);

  useEffect(() => {
    const error = session?.error;

    if (!error || isSigningOutRef.current) {
      return undefined;
    }

    const doSignOut = (reason) => {
      if (isSigningOutRef.current) return;
      isSigningOutRef.current = true;
      console.error(`[Auth] Выход из системы: ${reason}`);
      signOut({ callbackUrl: "/" });
    };

    // Случай 1: токен истёк по времени — мягкость тут неуместна
    if (error === "RefreshTokenExpired") {
      doSignOut("refresh-токен истёк по времени (>10 дней)");
      return undefined;
    }

    // Случай 2: "мягкая" ошибка — пробуем один раз тихо восстановиться
    if (isRetryingRef.current) {
      return undefined;
    }
    isRetryingRef.current = true;

    console.warn(
      `[Auth] Мягкая ошибка сессии (${error}) — вероятно, коллизия с логином в другом проекте. Пробуем тихое восстановление...`,
    );

    let cancelled = false;

    update()
      .then((refreshed) => {
        if (cancelled) return;

        if (refreshed?.error) {
          doSignOut(
            `тихое восстановление не помогло, ошибка сохранилась (${refreshed.error})`,
          );
        } else {
          console.log("[Auth] Сессия восстановлена без выхода из системы");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Auth] Исключение при тихом обновлении сессии:", err);
        doSignOut("исключение при попытке тихого обновления сессии");
      })
      .finally(() => {
        isRetryingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [session?.error, update]);

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
