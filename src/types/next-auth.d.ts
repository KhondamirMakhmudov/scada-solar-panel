import "next-auth";

/**
 * Augments next-auth's default Session type with the custom fields this
 * app's `session` callback attaches (see src/pages/api/auth/[...nextauth].js).
 * Without this, any .tsx file reading session.accessToken/session.error
 * fails to type-check even though it works fine at runtime.
 */
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
