import { CheckCircle, WarningAmber, ErrorOutline } from "@mui/icons-material";
import { STATUS_COLOR, STATUS_LABEL, deriveGroupStatus } from "@/constants/statusPalette";

const STATUS_ICON = { ok: CheckCircle, warn: WarningAmber, alarm: ErrorOutline, idle: WarningAmber };

/**
 * "N of M active" as a meter, not a chart — dataviz's own guidance for "a
 * single ratio against a limit" is a meter, never a pie of two slices (the
 * previous plain text row read fine but didn't visualize anything). Fill
 * carries the status color; the track is the same hue at low opacity ("a
 * lighter step of the same ramp") rather than a separate palette, so the
 * whole bar reads as one state, not two competing colors.
 */
const StatusMeter = ({ label, active, total }) => {
  const status = deriveGroupStatus(active, total);
  const color = STATUS_COLOR[status];
  const Icon = STATUS_ICON[status];
  const pct = total > 0 ? Math.min(100, (active / total) * 100) : 0;

  return (
    <div className="py-2.5 px-3 border-b border-surface-border last:border-b-0">
      <div className="flex items-center gap-3 mb-1.5">
        <p className="flex-1 text-[14px] font-ibmPlexSans text-text-secondary truncate">{label}</p>
        <span className="text-[14px] font-ibmPlexMono text-text-muted tabular-nums">
          {active}/{total}
        </span>
        <span
          className="flex items-center gap-1 min-w-[86px] justify-end text-[13px] font-ibmPlexMono font-medium"
          style={{ color }}
        >
          <Icon sx={{ fontSize: 14 }} />
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: `${color}22` }}>
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
};

export default StatusMeter;
