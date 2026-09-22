import { useState } from "react";
import { KeyboardArrowDown, VisibilityRounded, VisibilityOffRounded } from "@mui/icons-material";

const ROW_CLASS =
  "flex items-start gap-3 px-3.5 py-2.5 border-b border-surface-border/70 last:border-b-0 hover:bg-white/[0.02] transition-colors";
const CONTROL_CLASS =
  "w-full h-7 bg-transparent text-right text-[14.5px] font-ibmPlexMono text-text-primary placeholder:text-text-faint focus:outline-none";

function FieldControl({ field, value, onChange }) {
  const isPassword = field.name === "password";
  const [revealed, setRevealed] = useState(false);

  if (field.type === "select") {
    return (
      <div className="relative w-full">
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className={`${CONTROL_CLASS} appearance-none pr-5 cursor-pointer`}
        >
          <option value="" disabled hidden>
            {field.placeholder || "Выберите значение"}
          </option>
          {(field.options || []).map((opt) => (
            <option key={String(opt.value)} value={opt.value} className="bg-surface-dark text-text-primary">
              {opt.label}
            </option>
          ))}
        </select>
        <KeyboardArrowDown
          sx={{ fontSize: 15 }}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-text-faint"
        />
      </div>
    );
  }

  if (isPassword) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          type={revealed ? "text" : "password"}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={CONTROL_CLASS}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-[2px] text-text-faint hover:text-text-primary hover:bg-white/[0.06] active:scale-90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
        >
          {revealed ? <VisibilityOffRounded sx={{ fontSize: 14 }} /> : <VisibilityRounded sx={{ fontSize: 14 }} />}
        </button>
      </div>
    );
  }

  return (
    <input
      type={field.type === "number" ? "number" : "text"}
      value={value ?? ""}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={CONTROL_CLASS}
    />
  );
}

/**
 * "Параметры подключения" as a dense row list — label left, control right,
 * one hairline-divided row per field — instead of a grid of full labeled
 * input boxes. Deliberately mirrors ConnectionDetailsModal's read-only
 * ParamRow layout (same 38% label column, same row height/borders) so a
 * connection looks the same shape whether you're viewing or editing it; the
 * only thing that changes is whether the right side is static text or a
 * live control.
 */
const ConnectionParamFields = ({ fields, values, errors = {}, onChange }) => {
  if (fields.length === 0) {
    return (
      <p className="px-3.5 py-4 text-center text-[13.5px] text-text-faint rounded-[2px] border border-surface-border bg-background-dark/40">
        У этого типа подключения нет настраиваемых параметров
      </p>
    );
  }

  return (
    <div className="rounded-[2px] border border-surface-border bg-background-dark/40 overflow-hidden">
      {fields.map((field) => (
        <div key={field.name} className={ROW_CLASS}>
          <label
            htmlFor={field.name}
            className="w-[38%] flex-shrink-0 text-[14px] text-text-muted pt-1"
          >
            {field.label}
            {field.required && <span className="text-status-fault ml-1">*</span>}
          </label>
          <div className="flex-1 min-w-0">
            <FieldControl
              field={field}
              value={values[field.name]}
              onChange={(next) => onChange(field.name, next)}
            />
            {errors[field.name] && (
              <p className="text-status-fault text-[13px] mt-1 text-right">{errors[field.name]}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConnectionParamFields;
