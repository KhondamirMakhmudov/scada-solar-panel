import { motion } from "framer-motion";
import { STATUS_COLOR } from "@/constants/statusPalette";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_ORDER,
  deviceStatusToSystemStatus,
} from "./overviewDisplay";
import type { OverviewDeviceStatus } from "./overviewStationsTypes";

interface DeviceStatusBarProps {
  counts: Partial<Record<OverviewDeviceStatus, number>>;
  /** Compact drops the legend row — for a station card where the bar itself plus the numbers on hover are enough. */
  compact?: boolean;
}

/**
 * Part-to-whole device counts as one stacked bar — status colors (the app's
 * fixed ok/warn/alarm/idle palette, not a generated categorical hue) since
 * each segment literally *is* a status, not an arbitrary series. A 2px gap
 * (the container's own background showing through a flex `gap`) separates
 * touching segments instead of a stroke, per the usual stacked-bar spec.
 */
const DeviceStatusBar = ({ counts, compact = false }: DeviceStatusBarProps) => {
  const total = DEVICE_STATUS_ORDER.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const segments = DEVICE_STATUS_ORDER.map((status) => ({ status, count: counts[status] ?? 0 })).filter(
    (s) => s.count > 0,
  );

  if (total === 0) {
    return (
      <div className="h-3 w-full rounded-full bg-white/5" title="Устройств нет" />
    );
  }

  return (
    <div>
      <div className="flex gap-[2px] h-3 w-full rounded-full overflow-hidden bg-background-dark">
        {segments.map(({ status, count }) => (
          // Grows from 0 on first mount, then eases to whatever the next
          // 20s poll reports — one motion value covers both the initial
          // reveal and every later count change, no separate CSS transition
          // to keep in sync with it.
          <motion.div
            key={status}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ background: STATUS_COLOR[deviceStatusToSystemStatus(status)] }}
            title={`${DEVICE_STATUS_LABELS[status]}: ${count}`}
          />
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
          {segments.map(({ status, count }) => (
            <span key={status} className="flex items-center gap-1.5 text-[14px] font-ibmPlexMono text-text-muted">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLOR[deviceStatusToSystemStatus(status)] }}
              />
              {DEVICE_STATUS_LABELS[status]} <span className="text-text-primary">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceStatusBar;
