import { useRef } from "react";
import { snapshotDocumentArrays, commitSnapshotDiff } from "../../store/history/historyActions";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorField = ({ label, value, onChange }: ColorFieldProps) => {
  const beforeRef = useRef<ReturnType<typeof snapshotDocumentArrays> | null>(null);

  return (
    <label className="flex items-center justify-between gap-2 text-xs text-text-muted">
      {label}
      <input
        type="color"
        value={value === "none" ? "#000000" : value}
        onFocus={() => {
          beforeRef.current = snapshotDocumentArrays();
        }}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (beforeRef.current) {
            commitSnapshotDiff(beforeRef.current);
            beforeRef.current = null;
          }
        }}
        className="w-9 h-7 rounded border border-surface-border bg-background-dark cursor-pointer"
      />
    </label>
  );
};

export default ColorField;
