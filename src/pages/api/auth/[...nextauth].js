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

// Короткий TTL блокировки — схлопывает несколько ПАРАЛЛЕЛЬНЫХ вызовов
// jwt-колбэка в один запрос к бэкенду.
const REFRESH_LOCK_TTL_MS = 15000;

const refreshLocks = new Map();

// Один HTTP-запрос на обновление токена к app.tpp.uz — без внутренних
// повторов: если бэкенд отказал, jwt-колбэк просто помечает токен ошибкой
// и не пробует снова, пока пользователь не залогинится заново (см. guard
// `if (token.error) return token;` ниже — это то, что реально останавливает
// цикл, а не количество попыток здесь).
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

    if (!token.refreshToken) throw new Error("Отсутствует refresh-токен");

    const decodedRefresh = decodeJWT(token.refreshToken);
    if (decodedRefresh?.exp && decodedRefresh.exp * 1000 < Date.now()) {
      throw new Error("RefreshTokenExpired");
    }

    const response = await fetch(
      `${config.GENERAL_AUTH_URL}/auth/api/v2/sessions:refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.refreshToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Обновление токена не удалось:", response.status, errorText);
      if (response.status === 401) throw new Error("RefreshTokenExpired");
      throw new Error(`Обновление не удалось: ${response.status}`);
    }

    const refreshedTokens = await response.json();
    const tokens = refreshedTokens.data;

    if (!tokens?.accessToken) throw new Error("В ответе нет accessToken");

    const newDecoded = decodeJWT(tokens.accessToken);
    if (!newDecoded || !newDecoded.exp) throw new Error("Некорректный accessToken в ответе");

    const accessTokenExpires = newDecoded.exp * 1000;
    console.log(
      `Новый токен истекает через ${Math.floor((accessTokenExpires - Date.now()) / 1000)} сек`,
    );

    const userDetails = await fetchUserDetails(tokens.accessToken);
    const sanitizedRoles = sanitizeRoles(userDetails?.roles || []);

    const newDecodedRefresh = decodeJWT(tokens.refreshToken ?? token.refreshToken);
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

    resolveLock(newToken);
    return newToken;
  } catch (error) {
    console.error("=== ОБНОВЛЕНИЕ ТОКЕНА НЕ УДАЛОСЬ ===", error.message);
    const isExpired = error.message === "RefreshTokenExpired";
    const errorToken = {
      ...token,
      error: isExpired ? "RefreshTokenExpired" : "RefreshAccessTokenError",
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
    async jwt({ token, user }) {
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

      // Уже есть незакрытая ошибка от предыдущей попытки обновления — не
      // повторяем обновление на каждой проверке сессии. Это и есть фикс
      // бесконечного цикла: без этой проверки каждый /api/auth/session
      // снова пытался бы обновить токен, снова получал ошибку и снова
      // разлогинивал через SessionErrorHandler — цикл без остановки.
      // SessionErrorHandler на клиенте разлогинит пользователя на
      // следующем рендере; новую попытку обновления даст только новый вход.
      if (token.error) {
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
      console.log(`JWT callback: токен истекает через ${secondsUntilExpiry} сек`);

      if (secondsUntilExpiry >= 60) {
        return token;
      }

      console.log("=== ТРЕБУЕТСЯ ОБНОВЛЕНИЕ ТОКЕНА ===");
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      console.log("=== ФОРМИРОВАНИЕ СЕССИИ ===");

      // Токен истёк окончательно по времени — это точно повод для выхода.
      if (token.error === "RefreshTokenExpired") {
        return { ...session, error: "RefreshTokenExpired", user: null };
      }

      // RefreshAccessTokenError — не обнуляем пользователя сразу, оставляем
      // последние известные данные сессии, чтобы интерфейс не мигал пустым
      // состоянием на тот единственный рендер до signOut() в SessionErrorHandler.
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
