import { useEffect, useRef, useState } from "react";
import { snapshotDocumentArrays, commitSnapshotDiff } from "../../store/history/historyActions";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

/** Live-updates the store on every keystroke (uncommitted), captures a snapshot on focus, and pushes exactly one undo/redo entry on blur — mirroring how drag/resize commit. */
const NumberField = ({ label, value, onChange, step = 1 }: NumberFieldProps) => {
  const [draft, setDraft] = useState(String(value));
  const beforeRef = useRef<ReturnType<typeof snapshotDocumentArrays> | null>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <label className="flex items-center justify-between gap-2 text-xs text-text-muted">
      {label}
      <input
        type="number"
        step={step}
        value={draft}
        onFocus={() => {
          beforeRef.current = snapshotDocumentArrays();
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={() => {
          if (beforeRef.current) {
            commitSnapshotDiff(beforeRef.current);
            beforeRef.current = null;
          }
        }}
        className="w-16 h-7 rounded-[2px] bg-background-dark border border-surface-border px-2 text-right text-text-primary outline-none focus:border-blue-500"
      />
    </label>
  );
};

export default NumberField;
