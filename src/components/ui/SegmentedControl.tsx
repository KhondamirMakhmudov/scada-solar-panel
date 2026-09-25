import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Переключатель взаимоисключающих режимов (график/таблица, диапазоны).
 *
 * Обобщает точечные реализации, которые до этого заводил под себя каждый
 * раздел: у архива и редактора мнемосхем были свои копии с разной высотой,
 * скруглением и цветом активного сегмента.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
}: SegmentedControlProps<T>) {
  const height = size === "sm" ? "h-7" : "h-8";
  const text = size === "sm" ? "text-[13px]" : "text-xs";
  // Заливка активного сегмента — один общий элемент, переезжающий между
  // кнопками (layoutId), а не отдельный фон у каждой. Переезд показывает,
  // откуда и куда переключились: при мгновенной перекраске на широком
  // переключателе глаз теряет, какой сегмент стал активным.
  const indicatorId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`inline-flex flex-shrink-0 rounded-[8px] border border-surface-border bg-surface-1 p-0.5 ${className}`}
      role="group"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.title}
            aria-pressed={isActive}
            className={`relative ${height} ${text} px-2.5 rounded-[8px] transition-colors whitespace-nowrap active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1 ${
              isActive ? "text-[#93c5fd]" : "text-[#6b7280] hover:text-[#e5e2e1]"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={indicatorId}
                aria-hidden="true"
                className="absolute inset-0 rounded-[8px] bg-primary/20"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
