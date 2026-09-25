import { getToken } from "next-auth/jwt";

/**
 * Диагностика сессии: почему пользователя выкидывает на страницу входа.
 *
 * Читает серверный JWT next-auth из cookie запроса и показывает СРОКИ ЖИЗНИ
 * токенов — по ним сразу видно, на чьей стороне проблема:
 *
 *   • refreshLifetimeMinutes ≈ accessLifetimeMinutes (около 15)
 *       → refresh-токен живёт столько же, сколько access. Продлевать сессию
 *         нечем, выход неизбежен — чинить надо на стороне auth-сервиса.
 *   • refreshLifetimeMinutes заметно больше (часы/сутки)
 *       → сроки нормальные, причина в самом обновлении: смотрите error и
 *         refreshFailCount ниже и лог dev-сервера.
 *
 * Сами токены НЕ возвращаются — только их сроки и длины, чтобы вывод можно
 * было спокойно скопировать в переписку.
 *
 * Временный отладочный маршрут: удалите его, когда разберётесь.
 */
export default async function handler(req, res) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return res.status(401).json({
      ok: false,
      message:
        "Сессии нет. Откройте этот адрес в той же вкладке браузера, где вы залогинены.",
    });
  }

  const now = Date.now();
  const decode = (jwt) => {
    try {
      return JSON.parse(
        Buffer.from(jwt.split(".")[1], "base64").toString("utf8"),
      );
    } catch {
      return null;
    }
  };

  const accessPayload = token.accessToken ? decode(token.accessToken) : null;
  const refreshPayload = token.refreshToken ? decode(token.refreshToken) : null;

  // iat/exp внутри самого токена — источник правды о сроке жизни, выданном
  // auth-сервисом, в отличие от accessTokenExpires, который мы считаем сами.
  const lifetime = (payload) =>
    payload?.exp && payload?.iat
      ? Math.round((payload.exp - payload.iat) / 60)
      : null;

  const remaining = (ms) =>
    Number.isFinite(ms) ? Math.round((ms - now) / 1000) : null;

  return res.status(200).json({
    ok: true,
    now: new Date(now).toISOString(),

    access: {
      lifetimeMinutes: lifetime(accessPayload),
      secondsRemaining: remaining(token.accessTokenExpires),
      expiresAt: token.accessTokenExpires
        ? new Date(token.accessTokenExpires).toISOString()
        : null,
    },

    refresh: {
      present: Boolean(token.refreshToken),
      lifetimeMinutes: lifetime(refreshPayload),
      secondsRemaining: remaining(token.refreshTokenExpires),
      expiresAt: token.refreshTokenExpires
        ? new Date(token.refreshTokenExpires).toISOString()
        : null,
    },

    // Состояние цикла обновления из [...nextauth].js
    error: token.error || null,
    refreshFailCount: token.refreshFailCount ?? 0,

    verdict:
      lifetime(refreshPayload) !== null && lifetime(accessPayload) !== null
        ? lifetime(refreshPayload) <= lifetime(accessPayload) + 1
          ? "Refresh-токен не живёт дольше access — продлевать сессию нечем. Причина на стороне auth-сервиса."
          : "Сроки жизни нормальные — причина в процессе обновления, а не в сроках."
        : "Не удалось прочитать exp/iat из токенов.",
  });
}
