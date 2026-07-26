import { useEffect, useRef, useState } from "react";
import { useUiStore } from "../store/uiStore";
import { useScreenAlarms } from "../hooks/useScreenAlarms";

/**
 * Единая цветовая семантика состояний, общая для ленты состояния и
 * индикаторов на фигурах: зелёный — работа, янтарный — требует внимания,
 * красный — авария, серый — штатный останов. Янтарный намеренно отличается
 * от красного по светлоте, а не только по тону, — чтобы счётчики различались
 * при дейтеранопии и на выцветших операторских панелях.
 */
const COUNTER_STYLES = {
  alarm: {
    idle: "border-slate-800 text-slate-500",
    active: "border-rose-500/50 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
  warning: {
    idle: "border-slate-800 text-slate-500",
    active: "border-amber-500/50 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
} as const;

interface CounterProps {
  kind: keyof typeof COUNTER_STYLES;
  label: string;
  count: number;
  onClick?: () => void;
}

const Counter = ({ kind, label, count, onClick }: CounterProps) => {
  const styles = COUNTER_STYLES[kind];
  const isActive = count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isActive}
      title={label}
      className={`flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11px] font-medium transition-colors ${
        isActive ? styles.active : styles.idle
      } ${isActive ? "hover:brightness-125 cursor-pointer" : "cursor-default"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isActive ? styles.dot : "bg-slate-700"} ${
          kind === "alarm" && isActive ? "animate-pulse" : ""
        }`}
      />
      <span className="font-mono tabular-nums">{count}</span>
      <span className="hidden xl:inline opacity-80">{label}</span>
    </button>
  );
};

/** Счётчики аварий и предупреждений схемы со списком: клик по записи прокручивает холст к проблемному элементу. */
const AlarmSummary = () => {
  const { alarms, alarmCount, warningCount, okCount, boundCount } = useScreenAlarms();
  const requestFocus = useUiStore((state) => state.requestFocus);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  // Список нечего показывать — закрываем, иначе после устранения последней
  // аварии остаётся висеть пустая панель
  useEffect(() => {
    if (alarms.length === 0) setIsOpen(false);
  }, [alarms.length]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      <Counter
        kind="alarm"
        label="аварий"
        count={alarmCount}
        onClick={() => setIsOpen((open) => !open)}
      />
      <Counter
        kind="warning"
        label="внимание"
        count={warningCount}
        onClick={() => setIsOpen((open) => !open)}
      />
      <span
        className="flex items-center gap-1.5 h-6 px-2 rounded-md border border-slate-800 text-[11px] text-slate-500"
        title={`В работе ${okCount} из ${boundCount} привязанных элементов`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
        <span className="font-mono tabular-nums">{okCount}</span>
        <span className="hidden xl:inline opacity-80">в работе</span>
      </span>

      {isOpen && alarms.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-80 max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl shadow-black/50">
          {alarms.map((alarm) => (
            <button
              key={`${alarm.elementId}-${alarm.severity}`}
              type="button"
              onClick={() => {
                requestFocus(alarm.elementId);
                setIsOpen(false);
              }}
              className="w-full flex items-start gap-2 px-3 py-2 border-b border-slate-800/70 last:border-b-0 hover:bg-slate-800/60 text-left transition-colors"
            >
              <span
                className={`mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full ${
                  alarm.severity === "alarm" ? "bg-rose-400" : "bg-amber-400"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-200 truncate">
                  {alarm.elementLabel}
                </span>
                <span className="block text-[10px] text-slate-500 truncate">
                  {alarm.message}
                  {alarm.tagName ? ` · ${alarm.tagName}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlarmSummary;
