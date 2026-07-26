import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { NAV_ITEMS } from "@/constants/navigation";
import { hasRequiredRole } from "@/constants/routeAccess";

/**
 * Переход к разделу по названию — без возврата в боковое меню и без
 * запоминания, в какой группе он лежит. Ctrl+K открывает поиск с любой
 * страницы.
 *
 * Результаты фильтруются по ролям теми же правилами, что и боковое меню:
 * подсказывать раздел, на который пользователя всё равно не пустит Layout,
 * значит обещать несуществующий доступ.
 */
const GlobalSearch = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const allowedItems = useMemo(() => {
    const userRoles = session?.user?.roles || [];
    if (!Array.isArray(userRoles) || userRoles.length === 0) return [];
    return NAV_ITEMS.filter((item) => hasRequiredRole(item.roles, userRoles));
  }, [session?.user?.roles]);

  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) return allowedItems;
    return allowedItems.filter((item) =>
      `${item.text} ${item.hint || ""} ${item.groupLabel}`.toLowerCase().includes(normalized),
    );
  }, [allowedItems, normalized]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalized]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const go = (item) => {
    if (!item) return;
    setIsOpen(false);
    setQuery("");
    router.push(item.path);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      event.currentTarget.blur();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (event.key === "Enter") go(results[activeIndex]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <SearchRoundedIcon
          sx={{ fontSize: 16, color: "#6b7280" }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск раздела"
          className="w-52 xl:w-64 h-8 pl-8 pr-10 rounded-lg bg-[#0e0e0e] border border-[#2a2a2a] focus:border-[#3b82f6]/60 focus:outline-none text-xs text-[#e5e2e1] placeholder:text-[#6b7280] transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#6b7280] border border-[#2a2a2a] rounded px-1 py-0.5 pointer-events-none">
          Ctrl K
        </kbd>
      </div>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-72 max-h-80 overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#1c1b1b] shadow-xl shadow-black/60">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-[#6b7280]">Разделов не найдено</p>
          ) : (
            results.map((item, index) => {
              const { Icon } = item;
              return (
                <button
                  key={item.path}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    index === activeIndex ? "bg-[rgba(59,130,246,0.12)]" : "hover:bg-[#242424]"
                  }`}
                >
                  <Icon sx={{ fontSize: 17, color: "#bfc7d4" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-[#e5e2e1] truncate">{item.text}</span>
                    <span className="block text-[10px] text-[#6b7280] truncate">
                      {item.groupLabel}
                      {item.hint ? ` · ${item.hint}` : ""}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
