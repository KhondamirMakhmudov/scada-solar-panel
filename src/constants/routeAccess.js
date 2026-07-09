// Статический контроль доступа к страницам по ролям — в том же стиле, что
// пункты меню: у каждого правила список ролей, которым страница разрешена.
//
// ВАЖНО: скрыть пункт в сайдбаре недостаточно — пользователь может ввести
// URL вручную. Эти правила проверяются в src/components/layout/index.jsx
// для КАЖДОЙ страницы дашборда: нет роли — редирект на главную.
//
// Правило сопоставляется по префиксу пути, поэтому "/dashboard/test"
// закрывает и "/dashboard/test/websocket". Путь, не попавший ни под одно
// правило, доступен любому аутентифицированному пользователю.
// "/dashboard/main" должен оставаться без ограничений — туда уводит редирект.
export const ROUTE_ACCESS_RULES = [
  // --- Конфигурация системы: только администраторы ---
  {
    prefix: "/dashboard/connects",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/devices",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/tags",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/users",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/modbus",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/opc",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/nodes",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/archive",
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/test",
    roles: ["admin", "super_admin"],
  },
  // --- Операторские страницы: просмотр разрешён и роли user ---
  {
    prefix: "/dashboard/screens",
    roles: ["admin", "super_admin", "user"],
  },
  {
    prefix: "/dashboard/solar",
    roles: ["admin", "super_admin", "user"],
  },
  {
    prefix: "/dashboard/eco-system-stations",
    roles: ["admin", "super_admin", "user"],
  },
  {
    prefix: "/dashboard/settings",
    roles: ["admin", "super_admin", "user"],
  },
  // "/dashboard/main" намеренно без правила — это цель редиректа при отказе
  // в доступе, ограничивать её нельзя (получится цикл).
];

/** Роль подходит, если список правила пуст/отсутствует или есть пересечение (без учёта регистра) */
export function hasRequiredRole(requiredRoles, userRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const normalized = (userRoles || []).map((role) =>
    typeof role === "string" ? role.toLowerCase() : "",
  );
  return requiredRoles.some((role) => normalized.includes(role.toLowerCase()));
}

/** Доступен ли путь пользователю с данными ролями (первое совпавшее по префиксу правило решает) */
export function hasRouteAccess(pathname, userRoles) {
  if (!pathname) return true;
  const rule = ROUTE_ACCESS_RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return true;
  return hasRequiredRole(rule.roles, userRoles);
}
