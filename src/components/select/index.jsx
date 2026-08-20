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
        <label className="block mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-[#d1d5db]">
          {label}
          {required && <span className="text-status-fault"> *</span>}
        </label>
      )}

      <button
        type="button"
        onClick={toggleDropdown}
        className={clsx(
          "w-full h-11 border text-[13.5px] rounded-lg px-3.5 text-left bg-[#2c2c32] text-text-primary flex items-center justify-between focus:outline-none transition-colors active:scale-[0.99]",
          error
            ? "border-status-fault"
            : isOpen
              ? "border-primary ring-2 ring-primary"
              : "border-white/15 hover:border-white/25"
        )}
      >
        <span className={clsx("truncate", !value && "text-text-faint")}>
          {selectedLabel || placeholder}
        </span>
        <KeyboardArrowDown
          sx={{ fontSize: 18 }}
          className={`flex-shrink-0 ml-2 transition-transform duration-200 text-text-muted ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul className="absolute z-[9999] mt-1.5 w-full bg-[#2c2c32] text-text-primary border border-white/15 rounded-lg shadow-xl shadow-black/50 max-h-60 overflow-auto py-1">
          {finalOptions.map((opt, idx) => (
            <li
              key={idx}
              className={clsx(
                "px-3 py-2 text-[13px] hover:bg-primary/10 active:bg-primary/20 cursor-pointer transition-colors",
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
