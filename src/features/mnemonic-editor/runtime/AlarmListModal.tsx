import { Close, NotificationsActiveRounded, CheckCircleOutlineRounded, HistoryRounded } from "@mui/icons-material";
import { useRuntimeStore } from "../store/runtimeStore";
import type { ActiveAlarm } from "../hooks/useActiveAlarms";

interface AlarmListModalProps {
  alarms: ActiveAlarm[];
  onAckAll: () => void;
  onClose: () => void;
}

function formatClock(iso: string | null): string {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("ru-RU", { hour12: false });
}

/**
 * Full alarm view opened from AlarmBanner: active alarms (unacked first,
 * newest first) with per-row and bulk acknowledge, plus a short log of
 * recently cleared ones. Session-only — the storage service has no alarm/ack
 * concept of its own (just a per-reading isError flag), so acknowledgment
 * state lives in runtimeStore and resets with the screen like the rest of
 * its live values.
 */
const AlarmListModal = ({ alarms, onAckAll, onClose }: AlarmListModalProps) => {
  const alarmLog = useRuntimeStore((state) => state.alarmLog);
  const ackAlarm = useRuntimeStore((state) => state.ackAlarm);

  const hasUnacked = alarms.some((a) => !a.acked);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 font-ibmPlexSans">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[8px] border border-surface-border/70 bg-[#0e0e0e] shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <NotificationsActiveRounded className="text-status-fault flex-shrink-0" fontSize="small" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">Тревоги экрана</p>
              <p className="text-xs text-text-dim">Активные и недавно снятые тревоги по тегам этого экрана</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] text-text-muted transition hover:bg-background-dark hover:text-text-primary active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            <Close fontSize="small" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12.5px] text-text-muted tracking-widest font-bold uppercase">
                Активные · {alarms.length}
              </p>
              {hasUnacked && (
                <button
                  type="button"
                  onClick={onAckAll}
                  className="inline-flex items-center gap-1.5 text-[13px] font-ibmPlexMono text-primary hover:underline active:opacity-70"
                >
                  <CheckCircleOutlineRounded style={{ fontSize: 13 }} />
                  Подтвердить все
                </button>
              )}
            </div>

            {alarms.length === 0 ? (
              <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-4 text-center text-xs text-text-dim">
                Активных тревог нет.
              </div>
            ) : (
              <div className="space-y-1.5">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.tagId}
                    className={`rounded-[8px] border p-2.5 flex items-start gap-3 ${
                      alarm.acked
                        ? "border-surface-border bg-surface-dark/50"
                        : "border-status-fault/40 bg-status-fault/10"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-ibmPlexMono text-text-faint">{formatClock(alarm.since)}</span>
                        <span className="text-[14px] font-semibold text-text-primary truncate">{alarm.elementLabel}</span>
                        <span className="text-[13px] font-ibmPlexMono text-text-dim truncate">{alarm.tagName}</span>
                      </div>
                      <p className="text-[13px] text-status-fault mt-0.5">{alarm.message || "Ошибка тега"}</p>
                      {alarm.value !== null && (
                        <p className="text-[13px] font-ibmPlexMono text-text-muted mt-0.5">
                          Значение: {String(alarm.value)}
                          {alarm.unit ? ` ${alarm.unit}` : ""}
                        </p>
                      )}
                    </div>
                    {alarm.acked ? (
                      <span className="flex-shrink-0 text-[12px] font-semibold uppercase tracking-wide text-text-dim border border-surface-border rounded-[8px] px-1.5 py-0.5">
                        Подтверждено
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => ackAlarm(alarm.tagId)}
                        className="flex-shrink-0 text-[12.5px] font-semibold uppercase tracking-wide text-primary border border-primary/50 rounded-[8px] px-2 py-1 hover:bg-primary/10 active:scale-95 transition-colors"
                      >
                        Подтвердить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[12.5px] text-text-muted tracking-widest font-bold uppercase mb-2 flex items-center gap-1.5">
              <HistoryRounded style={{ fontSize: 13 }} />
              Недавно снятые
            </p>
            {alarmLog.length === 0 ? (
              <div className="rounded-[8px] border border-surface-border bg-surface-dark/70 p-4 text-center text-xs text-text-dim">
                Пока ничего не зафиксировано в этой сессии.
              </div>
            ) : (
              <div className="space-y-1">
                {alarmLog.map((entry, idx) => (
                  <div
                    key={`${entry.tagId}-${entry.clearedAt}-${idx}`}
                    className="rounded-[8px] border border-surface-border/70 bg-surface-dark/40 px-2.5 py-1.5 flex items-center gap-3 text-[13px]"
                  >
                    <span className="font-ibmPlexMono text-text-faint flex-shrink-0">
                      {formatClock(entry.since)} → {formatClock(entry.clearedAt)}
                    </span>
                    <span className="text-text-secondary truncate">{entry.message || "Ошибка тега снята"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlarmListModal;
