import axios from "axios";
import { getSession, signOut } from "next-auth/react";
import { config } from "@/config";

let isSigningOut = false;
// Одно обновление сессии на пачку параллельных 401. На дашборде в полёте
// одновременно висит с десяток запросов (обзор, теги, значения), и без этого
// протухший токен породил бы десяток одновременных обновлений.
let sessionRefreshPromise = null;

function refreshSessionOnce() {
  if (!sessionRefreshPromise) {
    // getSession() дёргает /api/auth/session, а тот — jwt-колбэк, который и
    // обновляет access-токен (см. pages/api/auth/[...nextauth].js).
    sessionRefreshPromise = getSession().finally(() => {
      sessionRefreshPromise = null;
    });
  }
  return sessionRefreshPromise;
}

/**
 * 401 больше не означает «выйти из системы».
 *
 * Раньше любой единственный ответ 401 немедленно вызывал signOut, и
 * пользователь оказывался на странице входа. Но 401 приходит и в совершенно
 * рядовой ситуации: access-токен живёт 15 минут, а запрос ушёл с тем, что
 * истёк секунду назад — обновить сессию и повторить запрос здесь достаточно.
 *
 * Теперь на 401 мы один раз обновляем сессию и повторяем исходный запрос с
 * новым токеном. Выходим только если сессия действительно мертва
 * (RefreshTokenExpired или токена в ней нет). Повтор ровно один: флаг на
 * конфиге запроса не даёт зациклиться, если сервер отдаёт 401 и с новым
 * токеном.
 */
const handleAuthError = async (error) => {
  const status = error?.response?.status;
  const original = error?.config;

  if (
    status !== 401 ||
    typeof window === "undefined" ||
    isSigningOut ||
    !original ||
    original._retriedAfterRefresh
  ) {
    return Promise.reject(error);
  }

  original._retriedAfterRefresh = true;

  let session = null;
  try {
    session = await refreshSessionOnce();
  } catch {
    return Promise.reject(error);
  }

  if (!session?.accessToken || session.error === "RefreshTokenExpired") {
    if (!isSigningOut) {
      isSigningOut = true;
      signOut({ callbackUrl: "/" });
    }
    return Promise.reject(error);
  }

  // Повтор идёт через голый axios, а не через тот же инстанс: baseURL и
  // заголовки в config уже развёрнуты, а обходя перехватчики инстанса мы
  // гарантируем, что второй 401 не запустит всё заново.
  original.headers = {
    ...original.headers,
    Authorization: `Bearer ${session.accessToken}`,
  };
  return axios(original);
};

const request = axios.create({
  baseURL: config.JAVA_API_URL,
  params: {},
  headers: {
    common: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});

request.interceptors.response.use((response) => response, handleAuthError);

const requestPython = axios.create({
  baseURL: config.PYTHON_API_URL,
  params: {},
  headers: {
    common: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});

requestPython.interceptors.response.use(
  (response) => response,
  handleAuthError,
);

const requestScreens = axios.create({
  baseURL: config.SCREENS_API_URL,
  params: {},
  headers: {
    common: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});

requestScreens.interceptors.response.use(
  (response) => response,
  handleAuthError,
);

const requestScreensDraft = axios.create({
  baseURL: config.SCREENS_API_DRAFT_URL,
  params: {},
  headers: {
    common: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});

requestScreensDraft.interceptors.response.use(
  (response) => response,
  handleAuthError,
);

export { request, requestPython, requestScreens, requestScreensDraft };
