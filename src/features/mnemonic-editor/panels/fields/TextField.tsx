import { useEffect, useRef, useState } from "react";
import { snapshotDocumentArrays, commitSnapshotDiff } from "../../store/history/historyActions";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const TextField = ({ label, value, onChange }: TextFieldProps) => {
  const [draft, setDraft] = useState(value);
  const beforeRef = useRef<ReturnType<typeof snapshotDocumentArrays> | null>(null);

  useEffect(() => setDraft(value), [value]);

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        value={draft}
        onFocus={() => {
          beforeRef.current = snapshotDocumentArrays();
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        }}
        onBlur={() => {
          if (beforeRef.current) {
            commitSnapshotDiff(beforeRef.current);
            beforeRef.current = null;
          }
        }}
        className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500"
      />
    </div>
  );
};

export default TextField;
