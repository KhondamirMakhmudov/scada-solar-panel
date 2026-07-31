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
          className={`block mb-1 text-[11px] uppercase tracking-wide text-text-muted ${labelClass}`}
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
          w-full h-9 border bg-background-dark text-text-primary text-[12.5px]
          placeholder:text-text-faint
          ${error ? "border-status-fault" : "border-surface-border"}
          rounded-[2px] px-2.5 pr-9 focus:outline-none
          transition-colors duration-150
          hover:border-surface-border-hover
          ${inputClass}
        `}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2.5 top-[50%] transform -translate-y-1/2 text-text-faint hover:text-primary transition-colors duration-200"
        >
          {showPassword ? (
            <VisibilityOffIcon sx={{ fontSize: 18 }} />
          ) : (
            <VisibilityIcon sx={{ fontSize: 18 }} />
          )}
        </button>
      )}

      {error && (
        <p className="text-status-fault text-[11px] mt-1 flex items-center gap-1">
          <span className="text-status-fault">•</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
