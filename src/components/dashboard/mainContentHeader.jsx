import { useRouter } from "next/router";
import { findNavItem } from "@/constants/navigation";

/**
 * Слим-шапка раздела: где я нахожусь (крошка + заголовок) и чем управляю
 * (действия страницы). Поиск и живая сводка по системе теперь в TopNavBar
 * (общие для всех разделов, не дублируются здесь), поэтому шапка раздела —
 * одна строка.
 */
const MainContentHeader = ({ children, actions }) => {
  const router = useRouter();
  const navItem = findNavItem(router.pathname);

  return (
    <header className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex items-center gap-3 px-6 h-11 border-b border-surface-border bg-background-dark">
      <div className="min-w-0 flex-1">
        {navItem?.groupLabel && (
          <p className="text-[9.5px] uppercase tracking-wider text-text-faint leading-none mb-1">
            {navItem.groupLabel}
          </p>
        )}
        <h1 className="text-[14px] font-semibold font-ibmPlexSans text-text-primary truncate leading-none">
          {children}
        </h1>
      </div>

      {actions}
    </header>
  );
};

export default MainContentHeader;
