const OPTIONS = [
  { value: "chart", label: "График" },
  { value: "table", label: "Таблица" },
];

/** Chart/table tab switch shared by the archive page and the in-place archive modal. */
const ViewModeToggle = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1">
    {OPTIONS.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`rounded-md px-3 py-1.5 text-sm transition ${
          value === opt.value
            ? "bg-blue-500/20 text-blue-200"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default ViewModeToggle;
