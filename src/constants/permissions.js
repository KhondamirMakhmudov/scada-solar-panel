// Мелкогранулярный контроль доступа к действиям (кнопкам) внутри страницы,
// на основе session.user.permissions — массива { resource, action, role },
// который [...nextauth].js собирает из ролей пользователя (extractPermissions).
//
// В отличие от routeAccess.js (доступ к странице целиком, по ролям), это
// про то, какие кнопки/действия видны НА странице, к которой доступ уже
// разрешён. action === "*" — доступны все действия над ресурсом.
export function hasPermission(permissions, resource, action) {
  if (!Array.isArray(permissions) || !permissions.length) return false;
  const requiredActions = Array.isArray(action) ? action : [action];
  return permissions.some(
    (p) => p?.resource === resource && (p.action === "*" || requiredActions.includes(p.action)),
  );
}
