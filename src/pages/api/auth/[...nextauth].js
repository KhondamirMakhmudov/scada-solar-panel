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
    // Разделители убираем перед сравнением: бэкенд для одной и той же роли
    // встречался и как "super_admin", и как "superadmin", и прямое сравнение
    // строк молча пропускало второй вариант.
    const name = (role.name || "").toLowerCase().replace(/[\s_-]/g, "");
    return name === "admin" || name === "superadmin";
  });
}

// Короткий TTL блокировки — схлопывает несколько ПАРАЛЛЕЛЬНЫХ вызовов
// jwt-колбэка в один запрос к бэкенду.
const REFRESH_LOCK_TTL_MS = 15000;

// За сколько до истечения access-токена начинать его обновлять.
//
// Было 60 секунд при опросе сессии раз в минуту (refetchInterval в _app.js) —
// то есть на всё обновление приходилась ровно ОДНА попытка. Стоило ей не
// удаться (сетевой блип, auth-сервис моргнул), и токен истекал до следующего
// опроса: дальше каждый запрос к API получал 401, а перехватчик выкидывал
// пользователя на страницу входа. При токене в 15 минут пять минут запаса
// дают пять попыток вместо одной и не учащают обновления.
const REFRESH_MARGIN_SECONDS = 5 * 60;

const refreshLocks = new Map();

// Один HTTP-запрос на обновление токена к app.tpp.uz за вызов — без цикла
// повторов внутри самой функции. Стойкость к единичным сбоям обеспечивает
// вызывающий jwt-колбэк: он помечает токен как RefreshAccessTokenError (не
// останавливает цикл, см. guard `if (token.error === "RefreshTokenExpired")`
// там же) и просто вызовет эту функцию снова на следующей проверке сессии.
// refreshFailCount ниже — единственный источник истины о том, сколько раз
// подряд это уже не удавалось; после 3 подряд или явного 401 от бэкенда
// сессия помечается RefreshTokenExpired окончательно.
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

    // Локальной проверки exp здесь тоже нет — по той же причине, что и в
    // jwt-колбэке: она объявляла сессию мёртвой по таймеру, ни разу не
    // спросив сервер, и одна эта строка сводила бы правку на нет.

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
      // По коду статуса здесь ничего решать нельзя. Замеры на app.tpp.uz:
      // повреждённый токен — 400 «Неверный формат токена», структурно верный
      // но не прошедший проверку — 500. Ни 401, ни какого-либо отдельного
      // кода для «токен мёртв» сервис не отдаёт, так что отличить «отвергнут
      // окончательно» от «сервис моргнул» по ответу невозможно.
      //
      // Поэтому судим не по статусу, а по бюджету повторов (refreshFailCount
      // ниже): несколько неудач подряд — сессия мертва, единичная — нет.
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

    // Если /users/me при обновлении не ответил — оставляем прежние роли.
    // Пустой массив означал бы «прав нет», и Layout по ROUTE_ACCESS_RULES
    // увёл бы администратора с его раздела из-за одного сбоя справочного
    // запроса, хотя токен обновился успешно.
    const userDetails = await fetchUserDetails(tokens.accessToken);
    const sanitizedRoles = sanitizeRoles(userDetails?.roles || token.rolesDetail || []);

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
      lastRefreshedAt: Date.now(),
      userData: {
        username: newDecoded.username,
        employee_id: newDecoded.employeeId,
        unit_code: newDecoded.unitCode,
      },
      rolesDetail: sanitizedRoles,
      error: undefined,
      refreshFailCount: 0,
    };

    resolveLock(newToken);
    return newToken;
  } catch (error) {
    console.error("=== ОБНОВЛЕНИЕ ТОКЕНА НЕ УДАЛОСЬ ===", error.message);
    // 401 от бэкенда — надёжный сигнал "токен мёртв", доверяем ему сразу.
    // Для остального (сетевой сбой, 5xx, временная недоступность
    // auth-сервиса) даём несколько попыток на следующих циклах обновления,
    // прежде чем считать сессию окончательно неживой — один-единственный
    // сбой не должен разлогинивать пользователя, у которого accessToken
    // ещё валиден (см. SessionErrorHandler в _app.js).
    const failCount = (token.refreshFailCount || 0) + 1;
    const isExpired = error.message === "RefreshTokenExpired" || failCount >= 3;
    const errorToken = {
      ...token,
      refreshFailCount: failCount,
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
            lastRefreshedAt: Date.now(),
            userData: {
              username: decoded.username,
              employee_id: decoded.employeeId,
              unit_code: decoded.unitCode,
            },
            rolesDetail: sanitizedRoles,
            refreshFailCount: 0,
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
          lastRefreshedAt: user.lastRefreshedAt,
          userData: user.userData,
          rolesDetail: user.rolesDetail,
          refreshFailCount: 0,
        };
      }

      if (!token.accessToken) {
        return { ...token, error: "NoAccessToken" };
      }

      // RefreshTokenExpired — окончательно: сервер (или локальная проверка
      // exp ниже) подтвердил, что refresh-токен мёртв, дальше только новый
      // логин. RefreshAccessTokenError — временный сбой одной попытки
      // обновления; НЕ останавливаем цикл здесь, иначе пользователь
      // застревает навсегда с session.error, без выхода и без повторных
      // попыток. Повторы ограничены бюджетом refreshFailCount внутри
      // refreshAccessToken, поэтому зацикливание невозможно.
      if (token.error === "RefreshTokenExpired") {
        return token;
      }

      // Локальной проверки exp у refresh-токена здесь СОЗНАТЕЛЬНО нет.
      //
      // Раньше стояло `if (token.refreshTokenExpires < Date.now()) ->
      // RefreshTokenExpired`, и это выбрасывало пользователя на страницу
      // входа строго по таймеру, ни разу не спросив auth-сервис. Если
      // refresh-токен выдан с коротким exp (а по симптому — примерно тем же,
      // что у access), ветка срабатывала ровно через 15 минут после входа:
      // отсюда и «разлогинивает каждые 15 минут».
      //
      // Кто именно решает, жив ли токен, — сам auth-сервис. Он и ответит на
      // попытку обновления; бюджет повторов (refreshFailCount) ниже
      // защищает от бесконечного цикла, если токен действительно мёртв.

      const now = Date.now();
      const secondsUntilExpiry = Math.floor(
        (token.accessTokenExpires - now) / 1000,
      );
      console.log(`JWT callback: токен истекает через ${secondsUntilExpiry} сек`);

      if (secondsUntilExpiry >= REFRESH_MARGIN_SECONDS) {
        // Токен снова здоров — снимаем метку единичного сбоя, иначе
        // session.error навсегда оставался бы выставленным после одной
        // неудачной попытки, хотя обновление давно прошло успешно.
        if (token.error === "RefreshAccessTokenError") {
          const { error, refreshFailCount, ...healthy } = token;
          return healthy;
        }
        return token;
      }

      // Второй параллельный вызов, пришедший сразу после удачного обновления,
      // работает с ЕЩЁ СТАРЫМ токеном из своей cookie и попытался бы обновить
      // его повторно — уже использованным refresh-токеном. Блокировка внутри
      // refreshAccessToken живёт 15 секунд и такой случай не ловит, потому что
      // ключ у неё — сам refresh-токен, а он тут старый.
      if (token.lastRefreshedAt && now - token.lastRefreshedAt < 10000) {
        console.log("Обновление пропущено — токен обновлён только что");
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

      // RefreshAccessTokenError — временный сбой одной попытки обновления;
      // accessToken мог остаться валидным, поэтому не обнуляем пользователя.
      // SessionErrorHandler в _app.js на этот статус не разлогинивает —
      // только помечает session.error, а jwt-колбэк сам повторит попытку
      // на следующем цикле.
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
        // Было /auth/logout — такого эндпоинта в API нет вовсе (см.
        // app.tpp.uz/auth/openapi.json), поэтому серверная сессия при выходе
        // не отзывалась и продолжала числиться активной. В v2 текущую сессию
        // закрывает :revoke-current по access-токену.
        if (!token.accessToken) return;
        const response = await fetch(
          `${config.GENERAL_AUTH_URL}/auth/api/v2/sessions:revoke-current`,
          {
            method: "POST",
            headers: {
              Authorization: `${token.tokenType || "Bearer"} ${token.accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
        console.log("Отзыв сессии:", response.status);
      } catch (error) {
        console.error("Ошибка при отзыве сессии:", error);
      }
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60,
    // Как часто next-auth перевыпускает cookie сессии. По умолчанию сутки:
    // обновлённый в jwt-колбэке токен мог подолгу не доезжать до браузера, и
    // вкладка продолжала слать уже протухший access-токен.
    updateAge: 60,
  },

  pages: {
    signIn: "/",
    signOut: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/` : "/",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
