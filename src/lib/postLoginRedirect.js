import { requestScreens } from "@/services/api";
import { URLS } from "@/constants/url";
import { getFirstAccessiblePath, hasRequiredRole } from "@/constants/routeAccess";

const ADMIN_ROLES = ["admin", "super_admin"];

/**
 * Where to land right after login (or when bounced off a forbidden page).
 * Admins get the dashboard shell as before; everyone else has no reason to
 * see it at all — they skip straight to the first screen's live view, so
 * "logging in" and "watching the plant" are the same action for operators.
 */
export async function resolvePostLoginPath(userRoles, accessToken) {
  if (hasRequiredRole(ADMIN_ROLES, userRoles)) {
    return getFirstAccessiblePath(userRoles);
  }

  try {
    const response = await requestScreens.get(URLS.screens, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    const list = response?.data?.data ?? response?.data ?? [];
    const firstScreen = Array.isArray(list) ? list[0] : null;
    if (firstScreen?.id) {
      return `/dashboard/screens/${firstScreen.id}/runtime`;
    }
  } catch (error) {
    console.error("Не удалось получить список экранов для редиректа после входа:", error);
  }

  return getFirstAccessiblePath(userRoles);
}
