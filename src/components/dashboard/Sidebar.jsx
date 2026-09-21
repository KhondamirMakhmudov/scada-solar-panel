import { useMemo } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { hasRequiredRole } from "@/constants/routeAccess";
import { NAV_GROUPS } from "@/constants/navigation";

/**
 * Левое боковое меню — вернули из горизонтальной ленты вкладок обратно в
 * список, сгруппированный так же, как в `NAV_GROUPS` (см.
 * constants/navigation.js): «Мониторинг» / «Конфигурация» / «Диагностика».
 * Маршрутизация и ролевая фильтрация (`hasRequiredRole`) не поменялись —
 * поменялось только представление, поэтому прямые ссылки и
 * `routeAccess.js` продолжают работать как раньше.
 *
 * Иконки (`item.Icon`) в старом TopNavBar не рисовались вообще — плоская
 * лента вкладок обходилась текстом. Здесь они наконец используются.
 */
export default function Sidebar() {
  const router = useRouter();
  const { data: session } = useSession();

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  // Тот же ключ запроса, что и у «Обзора» (systemOverview) — общий кэш
  // react-query, счётчики-бейджи не добавляют лишнего сетевого запроса.
  // Modbus/OPC UA сознательно не запрашиваются здесь — см. подробное
  // объяснение в TopNavBar.jsx (отдельный Java-бэкенд со строгой моделью
  // прав; 401 на нём разлогинивает всё приложение через общий интерцептор).
  const { data: systemOverview } = useGetPythonQuery({
    key: KEYS.systemOverview,
    url: URLS.systemOverview,
    headers: authHeaders,
    enabled: !!session?.accessToken,
  });

  const overviewData = get(systemOverview, "data.data", {});
  const badgeCounts = {
    "/dashboard/connects": get(overviewData, "connections.total"),
    "/dashboard/devices": get(overviewData, "devices.total"),
    "/dashboard/tags": get(overviewData, "tags.total"),
  };

  const visibleGroups = useMemo(() => {
    const userRoles = session?.user?.roles || [];
    if (!Array.isArray(userRoles) || userRoles.length === 0) return [];
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.hiddenInSidebar && hasRequiredRole(item.roles, userRoles),
      ),
    })).filter((group) => group.items.length > 0);
  }, [session?.user?.roles]);

  return (
    <nav className="flex-shrink-0 w-[196px] h-full overflow-y-auto bg-surface-dark border-r border-surface-border font-ibmPlexSans py-2">
      {visibleGroups.length === 0 && (
        <span className="flex items-center text-[11px] text-text-faint italic px-3 py-2">
          Нет доступных разделов
        </span>
      )}

      {visibleGroups.map((group) => (
        <div key={group.label} className="mb-3">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5 px-1.5">
            {group.items.map((item) => {
              const isActive = router.pathname === item.path;
              const badge = badgeCounts[item.path];
              const Icon = item.Icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => router.push(item.path)}
                  title={item.hint}
                  className={`flex items-center gap-2.5 h-9 px-2.5 rounded-[2px] text-[12.5px] font-medium border-l-2 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 ${
                    isActive
                      ? "border-primary text-primary bg-primary/[0.08]"
                      : "border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
                  }`}
                >
                  {Icon && <Icon sx={{ fontSize: 17 }} className="flex-shrink-0" />}
                  <span className="flex-1 text-left truncate">{item.text}</span>
                  {badge !== undefined && badge !== null && (
                    <span className="px-1 rounded-[2px] bg-background-dark font-ibmPlexMono text-[9.5px] text-text-muted flex-shrink-0">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
