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
 * Левое боковое меню — сгруппировано так же, как `NAV_GROUPS` (см.
 * constants/navigation.js): «Мониторинг» / «Конфигурация» / «Диагностика».
 * Маршрутизация и ролевая фильтрация (`hasRequiredRole`) не поменялись —
 * только визуальный слой.
 *
 * Active-состояние — плавающая акцентная полоска слева (не прилегает к
 * краям строки, со скруглением) плюс залитый фон и цвет текста/иконки/
 * бейджа, а не голая рамка на всю высоту строки: так активный пункт читается
 * с одного взгляда, а не только по тонкой линии у самого края меню. Группы
 * разделены тонкой линией сверху (кроме первой), а не только отступом —
 * иначе на глаз группы сливаются в один длинный список без пауз.
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
    <nav
      className="flex-shrink-0 w-[212px] h-full overflow-y-auto bg-surface-dark border-r border-surface-border font-ibmPlexSans py-3
        [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent"
    >
      {visibleGroups.length === 0 && (
        <span className="flex items-center text-[13px] text-text-faint italic px-3.5 py-2">
          Нет доступных разделов
        </span>
      )}

      {visibleGroups.map((group, groupIndex) => (
        <div key={group.label} className={groupIndex > 0 ? "mt-4 pt-4 border-t border-surface-border/60" : ""}>
          <p className="px-3.5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5 px-2">
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
                  className={`group relative flex items-center gap-2.5 h-9 pl-3.5 pr-2.5 rounded-[4px] text-[13.5px] font-medium transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 ${
                    isActive
                      ? "bg-primary/[0.12] text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/[0.035]"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors ${
                      isActive ? "bg-primary" : "bg-transparent"
                    }`}
                  />
                  {Icon && (
                    <Icon
                      sx={{ fontSize: 17 }}
                      className={`flex-shrink-0 transition-colors ${
                        isActive ? "text-primary" : "text-text-faint group-hover:text-text-secondary"
                      }`}
                    />
                  )}
                  <span className="flex-1 text-left truncate">{item.text}</span>
                  {badge !== undefined && badge !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full font-ibmPlexMono text-[10.5px] leading-none flex-shrink-0 transition-colors ${
                        isActive ? "bg-primary/20 text-primary" : "bg-white/5 text-text-faint group-hover:bg-white/[0.07]"
                      }`}
                    >
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
