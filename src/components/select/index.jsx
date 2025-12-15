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
  sortOptions = true, // ✅ yangi prop: true => alfavit bo‘yicha sort
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
    <div className={`relative w-full rounded-md ${className}`} ref={selectRef}>
      {label && (
        <label className="block mb-1 text-sm text-gray-400">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <button
        type="button"
        onClick={toggleDropdown}
        className={clsx(
          "w-full h-[55px] border rounded-md p-2 text-[15px] text-left bg-[#374151] text-gray-100 flex items-center justify-between focus:outline-none focus:ring-2",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        )}
      >
        <span className={clsx("truncate", !value && "text-gray-400")}>
          {selectedLabel || placeholder}
        </span>
        <KeyboardArrowDown
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul className="absolute z-9999 mt-2 w-full bg-[#374151] text-gray-100 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {finalOptions.map((opt, idx) => (
            <li
              key={idx}
              className={clsx(
                "px-4 py-2 hover:bg-[#555b64] cursor-pointer",
                (returnObject ? value?.value : value) === opt.value &&
                  "bg-[#555b64] font-medium"
              )}
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default CustomSelect;
