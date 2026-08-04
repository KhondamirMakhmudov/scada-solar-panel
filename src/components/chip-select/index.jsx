/**
 * Компактный фильтр-чип «ЛЕЙБЛ: ЗНАЧЕНИЕ» в духе референсного макета —
 * там это выглядит как обычный bordered span, но должно оставаться
 * настоящим select'ом. Нативный <select> с сброшенным appearance даёт
 * точный вид без велосипеда с выпадающим списком.
 */
const ChipSelect = ({ value, onChange, label, options }) => {
  const selected = options.find((o) => o.value === value);
  const display = selected ? selected.label : options[0]?.label;

  return (
    <div
      className="relative"
      style={{
        padding: "5px 9px",
        border: "1px solid #2a2a2a",
        borderRadius: 2,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          font: "500 10.5px/1.2 'IBM Plex Mono'",
          color: "#7c8290",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {label}: {display}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ChipSelect;
