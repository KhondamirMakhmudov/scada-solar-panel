import { useRef } from "react";
import { snapshotDocumentArrays, commitSnapshotDiff } from "../../store/history/historyActions";

interface RangeFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const RangeField = ({ label, value, onChange }: RangeFieldProps) => {
  const beforeRef = useRef<ReturnType<typeof snapshotDocumentArrays> | null>(null);

  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="flex-shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onPointerDown={() => {
          beforeRef.current = snapshotDocumentArrays();
        }}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={() => {
          if (beforeRef.current) {
            commitSnapshotDiff(beforeRef.current);
            beforeRef.current = null;
          }
        }}
        className="flex-1"
      />
      <span className="w-9 text-right text-slate-300">{value}%</span>
    </label>
  );
};

export default RangeField;
