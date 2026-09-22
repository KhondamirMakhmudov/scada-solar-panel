import { LIVE_STATUS_COLORS } from "../../runtime/resolveVisual";
import type { LiveStatus } from "../../runtime/resolveVisual";

interface StatusDotProps {
  cx: number;
  cy: number;
  status: LiveStatus;
  /** Optional hover text — e.g. the overview endpoint's fault reason/staleness, see useOverviewStatusForTag. Plain SVG <title>, same pattern as the "click to navigate" icon elsewhere in ElementInstance. */
  title?: string;
}

/** WinCC-style status LED, standardized across every device shape — see resolveVisual.deriveLiveStatus for the color rules. */
const StatusDot = ({ cx, cy, status, title }: StatusDotProps) => (
  <circle cx={cx} cy={cy} r={5} fill={LIVE_STATUS_COLORS[status]} stroke="#0f172a" strokeWidth={1.5}>
    {title && <title>{title}</title>}
    {status === "fault" && (
      <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
    )}
  </circle>
);

export default StatusDot;
