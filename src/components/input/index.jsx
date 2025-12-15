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
    <div className={`relative ${classNames} font-spaceGrotesk`}>
      {label && (
        <label
          htmlFor={name}
          className={`block mb-1 text-sm text-gray-300 ${labelClass}`}
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
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
          w-full h-[55px] border bg-surface-dark text-white
          placeholder:text-gray-400
          ${error ? "border-red-500" : "border-gray-600"}
          rounded-[8px] p-2 pr-10 focus:outline-none focus:ring-2
          ${error ? "focus:ring-red-500" : "focus:ring-primary"}
          transition-all duration-200
          hover:border-gray-500
          ${inputClass}
        `}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-[50%] transform -translate-y-1/2 text-gray-400 hover:text-primary transition-colors duration-200"
        >
          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </button>
      )}

      {error && (
        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
          <span className="text-red-500">•</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
