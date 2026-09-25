import { useState } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const Input = ({
  label,
  required = false,
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  error,
  classNames = "",
  inputClass = "",
  labelClass = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`relative ${classNames} font-ibmPlexSans`}>
      {label && (
        <label
          htmlFor={name}
          className={`block mb-2 text-[14.5px] font-semibold uppercase tracking-wide text-[#d1d5db] ${labelClass}`}
        >
          {label}
          {required && <span className="text-status-fault ml-1">*</span>}
        </label>
      )}

      <input
        {...props}
        id={name}
        name={name}
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`
          w-full h-11 border bg-[#2c2c32] text-text-primary text-[15px]
          placeholder:text-text-faint
          ${error ? "border-status-fault" : "border-white/15"}
          rounded-[8px] px-3.5 pr-10 focus:outline-none
          transition-colors duration-150
          hover:border-white/25
          focus:border-primary focus:ring-2 focus:ring-primary
          ${inputClass}
        `}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-[50%] transform -translate-y-1/2 text-text-faint hover:text-primary active:scale-90 transition-all duration-150"
        >
          {showPassword ? (
            <VisibilityOffIcon sx={{ fontSize: 18 }} />
          ) : (
            <VisibilityIcon sx={{ fontSize: 18 }} />
          )}
        </button>
      )}

      {error && (
        <p className="text-status-fault text-[13px] mt-1 flex items-center gap-1">
          <span className="text-status-fault">•</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
