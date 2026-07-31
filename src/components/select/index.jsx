import React, { useState, useRef, useEffect } from "react";
import { KeyboardArrowDown } from "@mui/icons-material";
import clsx from "clsx";

const CustomSelect = ({
  label,
  required = false,
  error,
  options = [],
  value,
  onChange,
  placeholder = "Выберите роль",
  className = "",
  returnObject = false, // ✅ true => object qaytaradi, false => faqat value
  sortOptions = true, // ✅ yangi prop: true => alfavit bo'yicha sort
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (opt) => {
    onChange(returnObject ? opt : opt.value);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = returnObject
    ? value?.label
    : options.find((opt) => opt.value === value)?.label;

  // ✅ optionsni shartli tartiblash
  const finalOptions = sortOptions
    ? [...options].sort((a, b) =>
        a.label.localeCompare(b.label, "ru", { sensitivity: "base" })
      )
    : options;

  return (
    <div className={`relative w-full font-ibmPlexSans ${className}`} ref={selectRef}>
      {label && (
        <label className="block mb-[4px] text-[11px] uppercase tracking-wide text-text-muted">
          {label}
          {required && <span className="text-status-fault"> *</span>}
        </label>
      )}

      <button
        type="button"
        onClick={toggleDropdown}
        className={clsx(
          "w-full h-9 border text-[12.5px] rounded-[2px] px-2.5 text-left bg-background-dark text-text-primary flex items-center justify-between focus:outline-none transition-colors",
          error
            ? "border-status-fault"
            : "border-surface-border hover:border-surface-border-hover"
        )}
      >
        <span className={clsx("truncate", !value && "text-text-faint")}>
          {selectedLabel || placeholder}
        </span>
        <KeyboardArrowDown
          sx={{ fontSize: 16 }}
          className={`transition-transform duration-200 text-text-muted ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul className="absolute z-[9999] mt-1 w-full bg-surface-dark text-text-primary border border-surface-border rounded-[2px] shadow-xl shadow-black/40 max-h-60 overflow-auto">
          {finalOptions.map((opt, idx) => (
            <li
              key={idx}
              className={clsx(
                "px-3 py-1.5 text-[12.5px] hover:bg-background-dark cursor-pointer transition-colors",
                (returnObject ? value?.value : value) === opt.value &&
                  "bg-primary/10 text-primary font-medium border-l-2 border-primary"
              )}
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-status-fault text-[11px] mt-1">{error}</p>}
    </div>
  );
};

export default CustomSelect;
