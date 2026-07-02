// /pages/api/auth/[...nextauth].js
import { config } from "@/config";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

function decodeJWT(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Ошибка декодирования JWT:", error);
    return null;
  }
}

async function fetchUserDetails(accessToken) {
  try {
    const response = await fetch(
      `${config.GENERAL_AUTH_URL}/auth/api/v2/users/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error("Не удалось получить данные пользователя:", response.status);
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Ошибка при получении данных пользователя:", error);
    return null;
  }
}

const PERMISSION_SEPARATOR = "::";

function buildPermissionKey(permission) {
  const resourceName = permission.resource?.name || "";
  const actionName = permission.action?.name || "";
  if (!resourceName && !actionName) return null;
  return `${resourceName}${PERMISSION_SEPARATOR}${actionName}`;
}

function parsePermissionKey(permissionKey) {
  if (typeof permissionKey !== "string") {
    return { resource: null, action: null };
  }
  const [resourceName = "", actionName = ""] =
    permissionKey.split(PERMISSION_SEPARATOR);
  return {
    resource: resourceName ? { name: resourceName } : null,
    action: actionName ? { name: actionName } : null,
  };
}

function sanitizeRoles(rolesArray) {
  if (!Array.isArray(rolesArray)) return [];
  return rolesArray.map((role) => ({
    name: role.name,
    permissions: Array.isArray(role.permissions)
      ? role.permissions.map(buildPermissionKey).filter(Boolean)
      : [],
  }));
}

function expandRolesDetail(rolesArray) {
  if (!Array.isArray(rolesArray)) return [];
  return rolesArray.map((role) => ({
    name: role.name,
    permissions: Array.isArray(role.permissions)
      ? role.permissions.map(parsePermissionKey)
      : [],
  }));
}

function extractRoles(rolesArray) {
  if (!Array.isArray(rolesArray)) return [];
  return rolesArray.map((role) => role.name);
}

function extractPermissions(rolesArray) {
  if (!Array.isArray(rolesArray)) return [];
  const allPermissions = [];
  rolesArray.forEach((role) => {
    if (Array.isArray(role.permissions)) {
      role.permissions.forEach((permission) => {
        allPermissions.push({
          resource: permission.resource?.name || null,
          action: permission.action?.name || null,
          role: role.name,
        });
      });
    }
  });
  return allPermissions;
}

function isAdmin(rolesArray) {
  if (!Array.isArray(rolesArray)) return false;
  return rolesArray.some((role) => {
    const name = (role.name || "").toLowerCase();
    return name === "admin" || name === "super_admin";
  });
}

// ==== Настройки повторных попыток обновления токена ====
// Бэкенд (app.tpp.uz) глобально инвалидирует refresh-токен во всех
// проектах при параллельном логине одного аккаунта (ies-dashboard,
// secure-monitor, secure-monitor-fer, employee-permission и т.д.).
// Поэтому первая неудача — не всегда "токен реально умер": часто это
// временная коллизия с обновлением в другом проекте. Даём бэкенду
// несколько попыток, прежде чем окончательно считать сессию мёртвой.
const REFRESH_MAX_ATTEMPTS = 3; // 1 обычная попытка + 2 повторные
const REFRESH_RETRY_DELAY_MS = 2500; // пауза между попытками, мс

// Короткий TTL блокировки: она нужна только чтобы схлопнуть несколько
// ПАРАЛЛЕЛЬНЫХ вызовов jwt-колбэка в один запрос к бэкенду, а не чтобы
// кэшировать результат надолго — иначе повторная попытка через
// useSession().update() на клиенте (см. _app.js) просто получит старую
// закэшированную ошибку без реального нового обращения к бэкенду.
const REFRESH_LOCK_TTL_MS = 2000;

const refreshLocks = new Map();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Один HTTP-запрос на обновление токена к app.tpp.uz
async function requestTokenRefresh(refreshToken) {
  const response = await fetch(
    `${config.GENERAL_AUTH_URL}/auth/api/v2/sessions:refresh`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return { ok: false, status: response.status, errorText };
  }

  const body = await response.json();
  return { ok: true, data: body.data };
}

// Классифицируем причину неудачи, чтобы отличить "реально истёк по
// времени" (>10 дней, signOut оправдан) от "инвалидирован параллельным
// логином в другом проекте" (стоит попробовать ещё раз позже).
//
// ВАЖНО: это эвристика по HTTP-статусу и тексту ответа. Если бэкенд
// начнёт отдавать явный код/поле для "инвалидирован другим логином" —
// замените проверку text.includes(...) на разбор этого поля.
function classifyRefreshFailure({ status, errorText }) {
  const text = (errorText || "").toLowerCase();

  if (text.includes("expired")) {
    return "RefreshTokenExpired";
  }

  if (status === 401 || text.includes("invalid") || text.includes("revoked")) {
    return "RefreshTokenInvalidated";
  }

  return "RefreshAccessTokenError";
}

async function refreshAccessToken(token) {
  const lockKey = token.refreshToken;

  if (refreshLocks.has(lockKey)) {
    console.log("Обновление токена уже выполняется — ждём результат существующего запроса...");
    return refreshLocks.get(lockKey);
  }

  let resolveLock;
  const lockPromise = new Promise((res) => {
    resolveLock = res;
  });
  refreshLocks.set(lockKey, lockPromise);

  try {
    console.log("=== НАЧАЛО ОБНОВЛЕНИЯ ТОКЕНА ===");

    if (!token.refreshToken) {
      throw Object.assign(new Error("Отсутствует refresh-токен"), {
        classification: "RefreshTokenExpired",
      });
    }

    // Локальная проверка по exp — если refresh-токен реально истёк по
    // времени, повторные попытки к бэкенду бессмысленны, фейлимся сразу.
    const decodedRefresh = decodeJWT(token.refreshToken);
    if (decodedRefresh?.exp && decodedRefresh.exp * 1000 < Date.now()) {
      throw Object.assign(new Error("Refresh-токен истёк по времени (exp в прошлом)"), {
        classification: "RefreshTokenExpired",
      });
    }

    let lastFailure = null;

    for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt += 1) {
      console.log(`Попытка обновления токена ${attempt}/${REFRESH_MAX_ATTEMPTS}...`);

      let result;
      try {
        result = await requestTokenRefresh(token.refreshToken);
      } catch (networkError) {
        result = { ok: false, status: null, errorText: networkError.message };
      }

      if (result.ok) {
        const tokens = result.data;

        if (!tokens?.accessToken) {
          lastFailure = { status: null, errorText: "В ответе нет accessToken" };
          console.error(`Попытка ${attempt}: ответ без accessToken`);
        } else {
          const newDecoded = decodeJWT(tokens.accessToken);

          if (!newDecoded || !newDecoded.exp) {
            lastFailure = { status: null, errorText: "Некорректный accessToken в ответе" };
            console.error(`Попытка ${attempt}: некорректный accessToken`);
          } else {
            const accessTokenExpires = newDecoded.exp * 1000;
            console.log(
              `Новый токен истекает через ${Math.floor((accessTokenExpires - Date.now()) / 1000)} сек`,
            );

            const userDetails = await fetchUserDetails(tokens.accessToken);
            const sanitizedRoles = sanitizeRoles(userDetails?.roles || []);

            const newDecodedRefresh = decodeJWT(
              tokens.refreshToken ?? token.refreshToken,
            );
            const refreshTokenExpires = newDecodedRefresh?.exp
              ? newDecodedRefresh.exp * 1000
              : token.refreshTokenExpires;

            const newToken = {
              ...token,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken ?? token.refreshToken,
              tokenType: tokens.tokenType || token.tokenType || "Bearer",
              accessTokenExpires,
              refreshTokenExpires,
              userData: {
                username: newDecoded.username,
                employee_id: newDecoded.employeeId,
                unit_code: newDecoded.unitCode,
              },
              rolesDetail: sanitizedRoles,
              error: undefined,
            };

            console.log(
              `=== ТОКЕН УСПЕШНО ОБНОВЛЁН ===${attempt > 1 ? ` (с попытки ${attempt})` : ""}`,
            );

            // Успех — на все случаи error нет
            resolveLock(newToken);
            return newToken;
          }
        }
      } else {
        lastFailure = result;
        console.error(
          `Попытка ${attempt}/${REFRESH_MAX_ATTEMPTS} не удалась: статус=${result.status}, ответ=${result.errorText}`,
        );
      }

      if (attempt < REFRESH_MAX_ATTEMPTS) {
        console.log(`Пауза ${REFRESH_RETRY_DELAY_MS}мс перед повторной попыткой...`);
        await wait(REFRESH_RETRY_DELAY_MS);
      }
    }

    // Все попытки исчерпаны — классифицируем финальную ошибку
    const classification = classifyRefreshFailure({
      status: lastFailure?.status,
      errorText: lastFailure?.errorText,
    });

    throw Object.assign(
      new Error(`Обновление токена не удалось после ${REFRESH_MAX_ATTEMPTS} попыток`),
      { classification },
    );
  } catch (error) {
    const classification = error.classification || "RefreshAccessTokenError";

    if (classification === "RefreshTokenExpired") {
      console.error(
        "=== ОБНОВЛЕНИЕ НЕ УДАЛОСЬ: refresh-токен истёк по времени (>10 дней) — выход из системы оправдан ===",
      );
    } else if (classification === "RefreshTokenInvalidated") {
      console.error(
        "=== ОБНОВЛЕНИЕ НЕ УДАЛОСЬ: похоже, токен инвалидирован параллельным логином в другом проекте (ies-dashboard / secure-monitor / secure-monitor-fer / employee-permission) ===",
      );
    } else {
      console.error(
        "=== ОБНОВЛЕНИЕ НЕ УДАЛОСЬ: техническая ошибка ===",
        error.message,
      );
    }

    const errorToken = {
      ...token,
      error: classification,
    };

    resolveLock(errorToken);
    return errorToken;
  } finally {
    setTimeout(() => refreshLocks.delete(lockKey), REFRESH_LOCK_TTL_MS);
  }
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { username, password } = credentials;
          console.log("=== НАЧАЛО ПРОЦЕССА ЛОГИНА ===");

          const res = await fetch(
            `${config.GENERAL_AUTH_URL}/auth/api/v2/sessions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            },
          );

          if (!res.ok) {
            console.error("Логин не удался:", res.status);
            return null;
          }

          const data = await res.json();
          const tokens = data.data;

          if (!tokens?.accessToken || !tokens?.refreshToken) {
            console.error("В ответе логина отсутствуют токены");
            return null;
          }

          const decoded = decodeJWT(tokens.accessToken);
          if (!decoded || !decoded.exp) {
            console.error("Некорректная структура токена");
            return null;
          }

          const accessTokenExpires = decoded.exp * 1000;
          const userDetails = await fetchUserDetails(tokens.accessToken);

          if (!userDetails) {
            console.error("Не удалось получить данные пользователя");
            return null;
          }

          const sanitizedRoles = sanitizeRoles(userDetails.roles || []);

          const decodedRefresh = decodeJWT(tokens.refreshToken);
          const refreshTokenExpires = decodedRefresh?.exp
            ? decodedRefresh.exp * 1000
            : null;

          console.log(
            `Access-токен истекает через ${Math.floor((accessTokenExpires - Date.now()) / 1000)}с`,
          );
          if (refreshTokenExpires) {
            console.log(
              `Refresh-токен истекает через ${Math.floor((refreshTokenExpires - Date.now()) / 1000)}с`,
            );
          }

          return {
            id: decoded.sub,
            name: decoded.username || username,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenType: tokens.tokenType || "Bearer",
            accessTokenExpires,
            refreshTokenExpires,
            userData: {
              username: decoded.username,
              employee_id: decoded.employeeId,
              unit_code: decoded.unitCode,
            },
            rolesDetail: sanitizedRoles,
          };
        } catch (error) {
          console.error("Ошибка авторизации:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // Начальное создание токена сразу после логина
      if (user) {
        console.log("=== СОЗДАНИЕ НАЧАЛЬНОГО JWT ===", user.name);
        return {
          id: user.id,
          name: user.name,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          tokenType: user.tokenType,
          accessTokenExpires: user.accessTokenExpires,
          refreshTokenExpires: user.refreshTokenExpires,
          userData: user.userData,
          rolesDetail: user.rolesDetail,
        };
      }

      if (!token.accessToken) {
        return { ...token, error: "NoAccessToken" };
      }

      // trigger === "update" — это явный ручной повтор, который делает
      // SessionErrorHandler через useSession().update() в _app.js после
      // "мягкой" ошибки. В этом случае разрешаем повторную попытку даже
      // если формально ещё рано или уже была ошибка.
      const isManualRetry = trigger === "update";

      // Токен истёк по времени окончательно — бэкенд тут не поможет,
      // просто отдаём как есть. Разлогин делает SessionErrorHandler.
      if (token.error === "RefreshTokenExpired") {
        return token;
      }

      // Уже была "мягкая" ошибка (коллизия с другим проектом / временный
      // сбой сети). Не долбим бэкенд на каждый ре-рендер/поллинг сессии —
      // ждём явного запроса на обновление через update().
      const hasSoftError =
        token.error === "RefreshTokenInvalidated" ||
        token.error === "RefreshAccessTokenError";

      if (hasSoftError && !isManualRetry) {
        return token;
      }

      if (token.refreshTokenExpires && token.refreshTokenExpires < Date.now()) {
        console.log("Refresh-токен истёк по времени (локальная проверка exp)");
        return { ...token, error: "RefreshTokenExpired" };
      }

      const now = Date.now();
      const secondsUntilExpiry = Math.floor(
        (token.accessTokenExpires - now) / 1000,
      );

      if (secondsUntilExpiry >= 60 && !isManualRetry) {
        console.log(`JWT callback: токен ещё жив ${secondsUntilExpiry} сек, обновление не требуется`);
        return token;
      }

      console.log(
        isManualRetry
          ? "=== ПОВТОРНАЯ ПОПЫТКА ОБНОВЛЕНИЯ (запрошена вручную через update()) ==="
          : "=== ТРЕБУЕТСЯ ПЛАНОВОЕ ОБНОВЛЕНИЕ ТОКЕНА ===",
      );

      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      console.log("=== ФОРМИРОВАНИЕ СЕССИИ ===");

      // Токен истёк окончательно по времени — это точно повод для выхода.
      if (token.error === "RefreshTokenExpired") {
        return { ...session, error: "RefreshTokenExpired", user: null };
      }

      // "Мягкие" ошибки (RefreshTokenInvalidated / RefreshAccessTokenError)
      // не обнуляем пользователя сразу — оставляем последние известные
      // данные сессии, чтобы интерфейс не мигал пустым состоянием, пока
      // SessionErrorHandler тихо пробует восстановить сессию через update().
      if (token.error) {
        session.error = token.error;
      }

      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.tokenType = token.tokenType;
      session.accessTokenExpires = token.accessTokenExpires;

      const roles = expandRolesDetail(token.rolesDetail || []);

      session.user = {
        id: token.id,
        name: token.name,
        username: token.userData?.username,
        employee_id: token.userData?.employee_id,
        unit_code: token.userData?.unit_code,
        roles: extractRoles(roles),
        rolesDetail: roles,
        permissions: extractPermissions(roles),
        isAdmin: isAdmin(roles),
      };

      console.log("Роли сессии:", session.user.roles);
      console.log("Количество прав сессии:", session.user.permissions.length);
      console.log("=== СЕССИЯ СФОРМИРОВАНА УСПЕШНО ===");

      return session;
    },
  },

  cookies: {
    sessionToken: {
      name: "next-auth.session-token.project4",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },

  events: {
    async signOut({ token }) {
      console.log("=== ПОЛЬЗОВАТЕЛЬ ВЫШЕЛ ИЗ СИСТЕМЫ ===");
      try {
        await fetch(`${config.GENERAL_AUTH_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `${token.tokenType || "Bearer"} ${token.accessToken}`,
          },
        });
        console.log("Logout API успешно вызван");
      } catch (error) {
        console.error("Ошибка при вызове logout API:", error);
      }
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/",
    signOut: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/` : "/",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
