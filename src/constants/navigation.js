import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LanRoundedIcon from "@mui/icons-material/LanRounded";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import MonitorRoundedIcon from "@mui/icons-material/MonitorRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";

/**
 * Единственное описание навигации: из него строятся боковое меню, глобальный
 * поиск и «хлебные крошки» в шапке. Раньше список жил только внутри
 * sidebar.jsx, и любой другой навигационный элемент неизбежно завёл бы себе
 * вторую, расходящуюся копию.
 *
 * Пункты сгруппированы по роду занятий: наблюдение за процессом отделено от
 * настройки оборудования, служебные инструменты — от того и другого.
 *
 * `Icon` — компонент, а не готовый элемент: боковое меню и поиск рисуют
 * значки в разных размерах.
 *
 * Роли заданы статически. Держите в согласии с ROUTE_ACCESS_RULES
 * (src/constants/routeAccess.js): скрытие пункта — только косметика, реальный
 * доступ к URL закрывает Layout по тем же правилам.
 */
export const NAV_GROUPS = [
  {
    label: "Мониторинг",
    items: [
      {
        text: "Главная",
        Icon: HomeRoundedIcon,
        path: "/dashboard/main",
        hint: "Сводка по системе",
        roles: ["admin", "super_admin", "user"],
      },
      {
        text: "Экраны",
        Icon: MonitorRoundedIcon,
        path: "/dashboard/screens",
        hint: "Мнемосхемы и редактор",
        roles: ["admin", "super_admin", "scada-user"],
      },
      {
        text: "Архивы",
        Icon: HistoryRoundedIcon,
        path: "/dashboard/archive",
        hint: "История значений",
        roles: ["admin", "super_admin", "user", "scada-user"],
      },
    ],
  },
  {
    label: "Конфигурация",
    items: [
      {
        text: "Подключения",
        Icon: LanRoundedIcon,
        path: "/dashboard/connects",
        hint: "Modbus и OPC UA",
        roles: ["admin", "super_admin"],
      },
      {
        text: "Устройства",
        Icon: MemoryRoundedIcon,
        path: "/dashboard/devices",
        hint: "Контроллеры и модули",
        roles: ["admin", "super_admin"],
      },
      {
        text: "Теги",
        Icon: SellRoundedIcon,
        path: "/dashboard/tags",
        hint: "Параметры опроса",
        roles: ["admin", "super_admin"],
      },
      {
        text: "Пользователи",
        Icon: PeopleAltRoundedIcon,
        path: "/dashboard/users",
        hint: "Учётные записи и роли",
        roles: ["admin", "super_admin"],
      },
    ],
  },
  {
    label: "Диагностика",
    items: [
      {
        text: "Тест WebSocket",
        Icon: BoltRoundedIcon,
        path: "/dashboard/test/websocket",
        hint: "Проверка потока данных",
        roles: ["admin", "super_admin"],
      },
      {
        text: "Настройки",
        Icon: SettingsRoundedIcon,
        path: "/dashboard/settings",
        hint: "Параметры учётной записи",
        roles: ["admin", "super_admin", "user", "scada-user"],
        // В боковом меню не показывается: настройки учётной записи живут в
        // меню профиля внизу, как принято. В списке нужны, чтобы глобальный
        // поиск и «хлебные крошки» знали об этом маршруте.
        hiddenInSidebar: true,
      },
    ],
  },
];

/** Плоский список пунктов — для поиска и разрешения текущего маршрута. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, groupLabel: group.label })),
);

/** Пункт меню, соответствующий пути (для «хлебных крошек» и подсветки). */
export function findNavItem(pathname) {
  return NAV_ITEMS.find((item) => item.path === pathname) || null;
}
