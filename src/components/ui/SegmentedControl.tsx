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
  const text = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div
      className={`inline-flex flex-shrink-0 rounded-[2px] border border-surface-border bg-surface-1 p-0.5 ${className}`}
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
            className={`${height} ${text} px-2.5 rounded-md transition-colors whitespace-nowrap ${
              isActive
                ? "bg-primary/20 text-[#93c5fd]"
                : "text-[#6b7280] hover:text-[#e5e2e1]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
