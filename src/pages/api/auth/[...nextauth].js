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
    console.error("Error decoding JWT:", error);
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
      console.error("Failed to fetch user details:", response.status);
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error fetching user details:", error);
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

const refreshLocks = new Map();

async function refreshAccessToken(token) {
  const lockKey = token.refreshToken;

  if (refreshLocks.has(lockKey)) {
    console.log("Refresh locked — waiting for existing refresh...");

    return refreshLocks.get(lockKey);
  }

  let resolveLock;
  const lockPromise = new Promise((res) => {
    resolveLock = res;
  });
  refreshLocks.set(lockKey, lockPromise);

  try {
    console.log("=== STARTING TOKEN REFRESH ===");

    if (!token.refreshToken) throw new Error("No refresh token available");

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
      console.error("Refresh token failed:", response.status, errorText);
      if (response.status === 401) throw new Error("RefreshTokenExpired");
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const refreshedTokens = await response.json();
    const tokens = refreshedTokens.data;

    if (!tokens?.accessToken)
      throw new Error("No access token in refresh response");

    const newDecoded = decodeJWT(tokens.accessToken);
    if (!newDecoded || !newDecoded.exp)
      throw new Error("Invalid token received");

    const accessTokenExpires = newDecoded.exp * 1000;
    console.log(
      `New token expires in ${Math.floor((accessTokenExpires - Date.now()) / 1000)} seconds`,
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

    // ✅ ҳамма ҳолатда resolve — reject йўқ
    resolveLock(newToken);
    return newToken;
  } catch (error) {
    console.error("=== TOKEN REFRESH FAILED ===", error.message);
    const isExpired = error.message === "RefreshTokenExpired";

    const errorToken = {
      ...token,
      error: isExpired ? "RefreshTokenExpired" : "RefreshAccessTokenError",
    };

    // ✅ reject эмас, resolve билан error token қайтарамиз
    resolveLock(errorToken);
    return errorToken;
  } finally {
    setTimeout(() => refreshLocks.delete(lockKey), 15000);
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
          console.log("=== STARTING LOGIN PROCESS ===");

          const res = await fetch(
            `${config.GENERAL_AUTH_URL}/auth/api/v2/sessions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            },
          );

          if (!res.ok) {
            console.error("Login failed:", res.status);
            return null;
          }

          const data = await res.json();
          const tokens = data.data;

          if (!tokens?.accessToken || !tokens?.refreshToken) {
            console.error("Missing tokens in login response");
            return null;
          }

          const decoded = decodeJWT(tokens.accessToken);
          if (!decoded || !decoded.exp) {
            console.error("Invalid token structure");
            return null;
          }

          const accessTokenExpires = decoded.exp * 1000;
          const userDetails = await fetchUserDetails(tokens.accessToken);

          if (!userDetails) {
            console.error("Failed to fetch user details");
            return null;
          }

          const sanitizedRoles = sanitizeRoles(userDetails.roles || []);

          const decodedRefresh = decodeJWT(tokens.refreshToken);
          const refreshTokenExpires = decodedRefresh?.exp
            ? decodedRefresh.exp * 1000
            : null;

          console.log(
            `Access token expires in ${Math.floor((accessTokenExpires - Date.now()) / 1000)}s`,
          );
          if (refreshTokenExpires) {
            console.log(
              `Refresh token expires in ${Math.floor((refreshTokenExpires - Date.now()) / 1000)}s`,
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
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("=== INITIAL JWT CREATION ===", user.name);
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

      if (token.error === "RefreshTokenExpired") {
        return token;
      }

      if (token.refreshTokenExpires && token.refreshTokenExpires < Date.now()) {
        console.log("Refresh token expired locally");
        return { ...token, error: "RefreshTokenExpired" };
      }

      const now = Date.now();
      const secondsUntilExpiry = Math.floor(
        (token.accessTokenExpires - now) / 1000,
      );
      console.log(
        `JWT callback: Token expires in ${secondsUntilExpiry} seconds`,
      );

      if (secondsUntilExpiry >= 60) {
        return token;
      }

      console.log("=== TOKEN REFRESH NEEDED ===");
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      console.log("=== BUILDING SESSION ===");

      if (token.error === "RefreshTokenExpired") {
        return { ...session, error: "RefreshTokenExpired", user: null };
      }

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

      console.log("Session roles:", session.user.roles);
      console.log(
        "Session permissions count:",
        session.user.permissions.length,
      );
      console.log("=== SESSION BUILT SUCCESSFULLY ===");

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
      console.log("=== USER SIGNED OUT ===");
      try {
        await fetch(`${config.GENERAL_AUTH_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `${token.tokenType || "Bearer"} ${token.accessToken}`,
          },
        });
        console.log("Logout API called successfully");
      } catch (error) {
        console.error("Logout error:", error);
      }
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/",
    signOut: `${process.env.NEXTAUTH_URL}/` || "/",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
