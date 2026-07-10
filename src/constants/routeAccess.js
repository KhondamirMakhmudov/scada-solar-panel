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
    prefix: "/dashboard/test",
    roles: ["admin", "super_admin"],
  },
  // --- Операторские страницы: просмотр разрешён и операторским ролям ---
  // Редактор экрана (/dashboard/screens/[id], без /runtime) — только админы:
  // редактирование мнемосхемы не операторская задача. `router.pathname` —
  // это файловый шаблон маршрута ("/dashboard/screens/[id]"), а не путь с
  // подставленным id, поэтому сравниваем с ним буквально. Правило на точный
  // путь должно стоять ПЕРЕД общим префиксом ниже — оба совпадают по
  // startsWith ("/dashboard/screens/[id]/runtime" тоже начинается с этой
  // строки), а find() берёт первое совпадение по порядку.
  {
    pattern: /^\/dashboard\/screens\/\[id\]$/,
    roles: ["admin", "super_admin"],
  },
  {
    prefix: "/dashboard/screens",
    roles: ["admin", "super_admin", "user", "scada-user"],
  },
  {
    prefix: "/dashboard/archive",
    roles: ["admin", "super_admin", "user", "scada-user"],
  },
  {
    prefix: "/dashboard/solar",
    roles: ["admin", "super_admin", "user", "scada-user"],
  },
  {
    prefix: "/dashboard/eco-system-stations",
    roles: ["admin", "super_admin", "user", "scada-user"],
  },
  {
    prefix: "/dashboard/settings",
    roles: ["admin", "super_admin", "user", "scada-user"],
  },
  // "/dashboard/main" намеренно без правила — это последний запасной адрес
  // редиректа, ограничивать его нельзя (получится цикл).
];

// Упорядоченный список разделов для выбора «первой доступной страницы»
// после входа (и при отказе в доступе). Роли должны совпадать с пунктами
// меню в sidebar.jsx.
export const NAVIGATION_PRIORITY = [
  { path: "/dashboard/main", roles: ["admin", "super_admin", "user"] },
  { path: "/dashboard/screens", roles: ["admin", "super_admin", "user", "scada-user"] },
  { path: "/dashboard/connects", roles: ["admin", "super_admin"] },
  { path: "/dashboard/devices", roles: ["admin", "super_admin"] },
  { path: "/dashboard/tags", roles: ["admin", "super_admin"] },
];

/** Первая страница, доступная пользователю с данными ролями — сюда ведём
 * после логина и при отказе в доступе к разделу. */
export function getFirstAccessiblePath(userRoles) {
  const entry = NAVIGATION_PRIORITY.find((item) =>
    hasRequiredRole(item.roles, userRoles),
  );
  return entry ? entry.path : "/dashboard/main";
}

/** Роль подходит, если список правила пуст/отсутствует или есть пересечение (без учёта регистра) */
export function hasRequiredRole(requiredRoles, userRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const normalized = (userRoles || []).map((role) =>
    typeof role === "string" ? role.toLowerCase() : "",
  );
  return requiredRoles.some((role) => normalized.includes(role.toLowerCase()));
}

/** Доступен ли путь пользователю с данными ролями (первое совпавшее правило решает — по regex `pattern`, если задан, иначе по префиксу) */
export function hasRouteAccess(pathname, userRoles) {
  if (!pathname) return true;
  const rule = ROUTE_ACCESS_RULES.find((r) =>
    r.pattern ? r.pattern.test(pathname) : pathname.startsWith(r.prefix),
  );
  if (!rule) return true;
  return hasRequiredRole(rule.roles, userRoles);
}
