import { useRouter } from "next/router";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import { findNavItem } from "@/constants/navigation";
import GlobalSearch from "./GlobalSearch";
import SystemStatusRibbon from "./SystemStatusRibbon";

/**
 * Шапка раздела в два яруса вместо одной строки с заголовком:
 *   • верхний — где я нахожусь (крошки, заголовок) и чем управляю (поиск,
 *     действия страницы);
 *   • нижний — что происходит в системе прямо сейчас.
 *
 * Раньше здесь были только кнопка меню и название страницы: состояние
 * соединений и устройств можно было увидеть, лишь вернувшись на «Главную».
 *
 * Прежняя подсветка при прокрутке слушала событие scroll на window, тогда как
 * прокручивается контейнер <main> в DashboardLayout, — обработчик не срабатывал
 * никогда. Вместо починки слушателя шапка просто всегда непрозрачна: она
 * закреплена сверху, и постоянный фон надёжнее, чем зависящий от прокрутки.
 */
const MainContentHeader = ({ children, toggleSidebar, isSidebarOpen, actions }) => {
  const router = useRouter();
  const navItem = findNavItem(router.pathname);

  return (
    <header className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 border-b border-[#2a2a2a] bg-[#131313]">
      {/* Ярус 1 — местоположение и управление разделом */}
      <div className="flex items-center gap-3 px-6 h-[52px]">
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarOpen ? "Свернуть меню" : "Развернуть меню"}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1c1b1b] text-[#bfc7d4] hover:text-[#3b82f6] hover:border-[#3b82f6]/35 transition-colors"
        >
          {isSidebarOpen ? (
            <MenuOpenRoundedIcon sx={{ fontSize: 18 }} />
          ) : (
            <MenuRoundedIcon sx={{ fontSize: 18 }} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {navItem?.groupLabel && (
            <p className="text-[10px] uppercase tracking-wider text-[#6b7280] leading-none mb-1">
              {navItem.groupLabel}
            </p>
          )}
          <h1 className="text-[15px] font-semibold text-[#e5e2e1] truncate leading-none">
            {children}
          </h1>
        </div>

        {actions}
        <GlobalSearch />
      </div>

      {/* Ярус 2 — живое состояние системы, одинаковое на всех страницах */}
      <div className="flex items-center gap-4 px-6 h-8 border-t border-[#2a2a2a]/70 bg-[#0e0e0e]/40 overflow-x-auto">
        <SystemStatusRibbon />
      </div>
    </header>
  );
};

export default MainContentHeader;
