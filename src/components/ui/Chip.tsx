import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  /** Приглушённая приписка справа от основного текста */
  meta?: ReactNode;
  /** Цветная метка слева — например цвет линии тега на графике */
  dotColor?: string;
  title?: string;
}

/**
 * Компактный переключаемый элемент выбора — тег, устройство, фильтр.
 *
 * Выбранное состояние помечено и заливкой, и цветом текста: одной заливки
 * недостаточно, когда рядом стоит полсотни чипов и глазу не за что зацепиться.
 */
const Chip = ({ children, selected = false, onClick, meta, dotColor, title }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={selected}
    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors ${
      selected
        ? "border-primary/60 bg-primary/15 text-[#bfdbfe]"
        : "border-surface-border bg-surface-1 text-[#bfc7d4] hover:border-[#475569] hover:text-[#e5e2e1]"
    }`}
  >
    {dotColor && (
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
    )}
    <span className="truncate max-w-[16rem]">{children}</span>
    {meta && <span className="text-[10px] text-[#6b7280] flex-shrink-0">{meta}</span>}
  </button>
);

export default Chip;
