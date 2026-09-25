import { useEffect, useRef, useState } from "react";
import { KeyboardArrowDown } from "@mui/icons-material";

/**
 * Компактный фильтр-чип «ЛЕЙБЛ: ЗНАЧЕНИЕ».
 *
 * Раньше это был настоящий нативный <select>, спрятанный под invisible
 * overlay — рабочий, но с одним неустранимым изъяном: сам выпадающий список
 * рисует браузер/ОС, а не CSS страницы, поэтому на Windows он всегда
 * получался светлым и никак не подчинялся тёмной теме. Сделан своим
 * dropdown'ом (как CustomSelect), чтобы список тоже был тёмным.
 */
const ChipSelect = ({ value, onChange, label, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);
  const display = selected ? selected.label : options[0]?.label;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex items-center gap-1.5 h-9 rounded-[8px] border px-3 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
          isOpen
            ? "border-primary bg-[#2c2c32] ring-2 ring-primary"
            : "border-white/15 bg-[#1c1b1e] hover:border-white/25"
        }`}
      >
        <span
          className="whitespace-nowrap"
          style={{ font: "500 13px/1.2 'IBM Plex Mono'", color: "#c3c7d1" }}
        >
          {label}: <span style={{ color: "#e5e2e1" }}>{display}</span>
        </span>
        <KeyboardArrowDown
          sx={{ fontSize: 16 }}
          className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ul className="absolute z-[9999] mt-1.5 min-w-full w-max bg-[#2c2c32] text-text-primary border border-white/15 rounded-[8px] shadow-xl shadow-black/50 max-h-60 overflow-auto py-1">
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`px-3 py-2 text-[14.5px] whitespace-nowrap cursor-pointer transition-colors hover:bg-primary/10 active:bg-primary/20 ${
                option.value === value ? "bg-primary/10 text-primary font-medium" : ""
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChipSelect;
