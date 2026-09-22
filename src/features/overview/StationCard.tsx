import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleRounded, ErrorOutlineRounded, HelpOutlineRounded, ExpandMoreRounded } from "@mui/icons-material";
import { STATUS_COLOR } from "@/constants/statusPalette";
import DeviceStatusBar from "./DeviceStatusBar";
import {
  DEVICE_STATUS_LABELS,
  formatEnergy,
  formatPower,
  formatRelativeToNow,
  groupStatusToSystemStatus,
  deviceStatusToSystemStatus,
  humanizeDriverId,
  GROUP_STATUS_LABELS,
} from "./overviewDisplay";
import LiveDot from "./LiveDot";
import type { OverviewStation } from "./overviewStationsTypes";

interface StationCardProps {
  station: OverviewStation;
  generatedAt: string;
  /** Stagger delay for the card's own entrance — see StationsOverviewSection's map(). */
  index?: number;
}

function PollerLine({ station }: { station: OverviewStation }) {
  if (station.pollerReachable === null) {
    return (
      <span className="flex items-center gap-1.5 text-[14px] text-text-faint">
        <HelpOutlineRounded sx={{ fontSize: 17 }} />
        Адрес поллера не настроен
      </span>
    );
  }
  if (station.pollerReachable === false) {
    return (
      <span className="flex items-center gap-1.5 text-[14px] text-status-warn" title={station.pollerError ?? undefined}>
        <ErrorOutlineRounded sx={{ fontSize: 17 }} />
        Поллер недоступен{station.pollerError ? `: ${station.pollerError}` : ""}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[14px] text-status-ok">
      <CheckCircleRounded sx={{ fontSize: 17 }} />
      Поллер отвечает
    </span>
  );
}

/**
 * One station's status/energy/poller summary, expandable into its
 * connections → devices (per main_page.md's own nesting) so an operator can
 * go from "Fergana is degraded" straight to "which of its 30 inverters, and
 * why" without leaving the dashboard.
 */
const StationCard = ({ station, generatedAt, index = 0 }: StationCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const status = groupStatusToSystemStatus(station.status);
  const deviceTotal = Object.values(station.deviceCounts).reduce((sum, n) => sum + (n ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className="rounded-[2px] border border-surface-border bg-surface-dark hover:border-surface-border-hover transition-colors"
      style={{ borderLeftWidth: 2, borderLeftColor: STATUS_COLOR[status] }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 rounded-[2px]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-text-primary text-[18px] font-semibold truncate">{humanizeDriverId(station.driverId)}</p>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[12.5px] font-semibold uppercase tracking-wide"
              style={{ color: STATUS_COLOR[status], background: `${STATUS_COLOR[status]}1a` }}
            >
              {/* online gets the infinite "live" ping, offline gets the same
                  pulsing-fault blink as the mnemonic editor's StatusDot
                  (urgent, distinct rhythm) — degraded/disabled/unknown stay
                  a plain static dot, since neither "still live" nor "active
                  alarm" is true for them */}
              {station.status === "online" ? (
                <LiveDot color={STATUS_COLOR[status]} size={6} />
              ) : station.status === "offline" ? (
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: STATUS_COLOR[status] }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
              )}
              {GROUP_STATUS_LABELS[station.status]}
            </span>
          </div>
          <p className="text-[14px] font-ibmPlexMono text-text-faint mt-1">
            {deviceTotal} устройств · {formatRelativeToNow(station.lastSeen, generatedAt)}
          </p>
        </div>
        <ExpandMoreRounded
          sx={{ fontSize: 24 }}
          className="text-text-faint flex-shrink-0 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "none" }}
        />
      </button>

      <div className="px-3.5 pb-3.5 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[12.5px] uppercase tracking-wide text-text-faint">Мощность</p>
            <p className="text-[18px] font-ibmPlexMono font-semibold text-text-primary">
              {formatPower(station.energy.currentPowerW)}
            </p>
          </div>
          <div>
            <p className="text-[12.5px] uppercase tracking-wide text-text-faint">Сегодня</p>
            <p className="text-[18px] font-ibmPlexMono font-semibold text-text-primary">
              {formatEnergy(station.energy.todayKwh)}
            </p>
          </div>
          <div>
            <p className="text-[12.5px] uppercase tracking-wide text-text-faint">Всего</p>
            <p className="text-[18px] font-ibmPlexMono font-semibold text-text-primary">
              {formatEnergy(station.energy.totalKwh)}
            </p>
          </div>
        </div>

        <DeviceStatusBar counts={station.deviceCounts} compact />
        <PollerLine station={station} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
            className="border-t border-surface-border/70"
          >
            <div className="px-3.5 py-3 space-y-3">
              {station.connections.map((connection) => (
                <div key={connection.id}>
                  <p className="text-[14px] font-ibmPlexMono text-text-secondary truncate mb-2" title={connection.name}>
                    {connection.name} <span className="text-text-faint">· {connection.type}</span>
                  </p>
                  <div className="space-y-1">
                    {connection.devices.map((device) => {
                      const deviceStatus = deviceStatusToSystemStatus(device.status);
                      return (
                        <div
                          key={device.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-[2px] bg-background-dark/60"
                          title={device.errorMessage ?? undefined}
                        >
                          {device.status === "online" ? (
                            <LiveDot color={STATUS_COLOR[deviceStatus]} size={5} />
                          ) : device.status === "offline" ? (
                            <motion.span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: STATUS_COLOR[deviceStatus] }}
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                            />
                          ) : (
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: STATUS_COLOR[deviceStatus] }}
                            />
                          )}
                          <span className="flex-1 min-w-0 text-[14.5px] text-text-secondary truncate">{device.name}</span>
                          <span className="text-[13px] font-ibmPlexMono text-text-faint flex-shrink-0">
                            {device.statusLabel ?? DEVICE_STATUS_LABELS[device.status]}
                          </span>
                          <span className="text-[13px] font-ibmPlexMono text-text-faint flex-shrink-0 w-16 text-right">
                            {formatPower(device.energy.currentPowerW)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StationCard;
