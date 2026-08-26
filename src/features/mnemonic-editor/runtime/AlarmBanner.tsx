import { useMemo, useState } from "react";
import { NotificationsActiveRounded, NotificationsNoneRounded } from "@mui/icons-material";
import { useActiveAlarms } from "../hooks/useActiveAlarms";
import { useRuntimeStore } from "../store/runtimeStore";
import AlarmListModal from "./AlarmListModal";

function formatClock(iso: string | null): string {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("ru-RU", { hour12: false });
}

/**
 * WinCC-style permanent alarm line, pinned to the bottom of the runtime
 * view: red/pulsing while there's at least one unacknowledged alarm, shows
 * the most recent one inline, otherwise collapses to a quiet "нет тревог"
 * state. Click opens the full list (active + recent history) for
 * acknowledgment — see AlarmListModal.
 */
const AlarmBanner = () => {
  const alarms = useActiveAlarms();
  const ackAllAlarms = useRuntimeStore((state) => state.ackAllAlarms);
  const [isListOpen, setIsListOpen] = useState(false);

  const unackedCount = useMemo(() => alarms.filter((a) => !a.acked).length, [alarms]);
  const mostRecent = alarms[0];

  const isAlarmed = unackedCount > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsListOpen(true)}
        className={`flex-shrink-0 flex items-center gap-2.5 h-8 px-3 border-t text-left transition-colors ${
          isAlarmed
            ? "border-status-fault/50 bg-status-fault/15 hover:bg-status-fault/25"
            : "border-surface-border bg-surface-dark/60 hover:bg-surface-dark"
        }`}
      >
        {isAlarmed ? (
          <NotificationsActiveRounded fontSize="small" className="text-status-fault flex-shrink-0 animate-pulse" />
        ) : (
          <NotificationsNoneRounded fontSize="small" className="text-text-dim flex-shrink-0" />
        )}

        <span
          className={`text-[11px] font-ibmPlexMono font-semibold uppercase tracking-wide flex-shrink-0 ${
            isAlarmed ? "text-status-fault" : "text-text-dim"
          }`}
        >
          {isAlarmed ? `Тревог: ${unackedCount}` : "Тревог нет"}
        </span>

        {mostRecent && (
          <span className="text-[11px] text-text-secondary truncate min-w-0 flex-1">
            <span className="text-text-faint font-ibmPlexMono">{formatClock(mostRecent.since)}</span>{" "}
            {mostRecent.elementLabel} — {mostRecent.message || "ошибка тега"}
          </span>
        )}

        {alarms.length > 0 && (
          <span className="text-[10px] text-text-faint flex-shrink-0 ml-auto">Открыть список →</span>
        )}
      </button>

      {isListOpen && (
        <AlarmListModal
          alarms={alarms}
          onAckAll={ackAllAlarms}
          onClose={() => setIsListOpen(false)}
        />
      )}
    </>
  );
};

export default AlarmBanner;
