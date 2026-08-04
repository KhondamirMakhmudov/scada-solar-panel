import type { ReactNode } from "react";

interface PanelProps {
  /** Заголовок панели. Без него шапка не рисуется вовсе */
  title?: ReactNode;
  /** Пояснение под заголовком */
  description?: ReactNode;
  /** Кнопки и переключатели в правой части шапки */
  toolbar?: ReactNode;
  /** Убрать внутренние отступы — для таблиц, которые рисуют их сами */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Базовая поверхность второго яруса: карточка на фоне страницы.
 *
 * Введена, чтобы прекратить расхождение оформления между разделами — каждая
 * страница объявляла свой набор классов рамки, скругления и фона, из-за чего
 * на соседних экранах отличались и радиус, и цвет границы.
 */
const Panel = ({
  title,
  description,
  toolbar,
  flush = false,
  className = "",
  children,
}: PanelProps) => (
  <section
    className={`rounded-[2px] border border-surface-border bg-surface-2 ${className}`}
  >
    {(title || toolbar) && (
      <header className="flex items-start gap-3 px-4 py-3 border-b border-surface-border">
        <div className="min-w-0 flex-1">
          {title && (
            <h3 className="text-[13px] font-semibold text-[#e5e2e1] leading-tight truncate">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-0.5 text-[11px] text-[#6b7280] leading-snug">{description}</p>
          )}
        </div>
        {toolbar && <div className="flex-shrink-0 flex items-center gap-2">{toolbar}</div>}
      </header>
    )}
    <div className={flush ? "" : "p-4"}>{children}</div>
  </section>
);

export default Panel;
