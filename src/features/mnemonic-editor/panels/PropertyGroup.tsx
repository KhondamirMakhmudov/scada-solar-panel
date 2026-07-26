import { useState } from "react";
import type { ReactNode } from "react";

interface PropertyGroupProps {
  title: string;
  /** Краткая сводка справа от заголовка — видна и в свёрнутом виде (например имя привязанного тега) */
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Сворачиваемая группа свойств. Панель элемента содержит пять разделов; без
 * сворачивания настройка привязки на невысоком экране требует прокрутки мимо
 * геометрии и стиля, которые при этом уже настроены.
 *
 * Состояние раскрытия локальное и намеренно сбрасывается при смене выбранного
 * элемента (PropertiesPanel монтирует панель заново по key): у нового элемента
 * актуальны разделы по умолчанию, а не те, что были открыты у предыдущего.
 */
const PropertyGroup = ({ title, badge, defaultOpen = true, children }: PropertyGroupProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center gap-1.5 px-2.5 py-2 text-[11px] uppercase tracking-wide text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span
          className="text-[9px] text-slate-600 transition-transform duration-150"
          style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
        >
          ▶
        </span>
        <span className="flex-1 text-left">{title}</span>
        {badge && (
          <span className="max-w-[7rem] truncate normal-case tracking-normal text-[10px] text-slate-600">
            {badge}
          </span>
        )}
      </button>
      {isOpen && <div className="px-2.5 pb-2.5 space-y-2">{children}</div>}
    </div>
  );
};

export default PropertyGroup;
