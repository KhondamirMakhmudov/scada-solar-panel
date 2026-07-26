import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Подсказка-действие: кнопка, снимающая причину пустоты */
  action?: ReactNode;
  icon?: ReactNode;
  /** Совсем компактный вариант — внутри панели или ячейки графика */
  compact?: boolean;
}

/**
 * Пустое состояние внутри панели.
 *
 * Отдельно от компонента NoData: тот рисует иллюстрацию 400×400 и заголовок
 * 24 px, что уместно для пустой страницы целиком, но внутри панели с
 * фильтрами такой блок вытесняет сами фильтры за пределы экрана. Здесь
 * сообщение занимает столько места, сколько нужно, чтобы его прочитали.
 */
const EmptyState = ({ title, description, action, icon, compact = false }: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center justify-center text-center ${
      compact ? "py-6 px-3" : "py-12 px-4"
    }`}
  >
    {icon && <div className="mb-2 text-[#475569]">{icon}</div>}
    <p className={`font-medium text-[#bfc7d4] ${compact ? "text-[12px]" : "text-sm"}`}>{title}</p>
    {description && (
      <p
        className={`mt-1 text-[#6b7280] max-w-md ${compact ? "text-[11px]" : "text-[12px]"}`}
      >
        {description}
      </p>
    )}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export default EmptyState;
