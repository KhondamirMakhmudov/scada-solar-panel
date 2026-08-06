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
    <header className="top-0 z-30 -mx-2.5 -mt-2.5  flex items-center gap-3 px-2.5 h-8 border-b border-surface-border bg-surface-dark my-3">
      <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
        {navItem?.groupLabel && (
          <p className="text-[9.5px] uppercase tracking-wider text-text-faint leading-none flex-shrink-0 ">
            {navItem.groupLabel} ·
          </p>
        )}
        <h1 className="text-[12px] font-semibold font-ibmPlexSans text-text-primary truncate leading-none">
          {children}
        </h1>
      </div>

      {actions}
    </header>
  );
};

export default MainContentHeader;
