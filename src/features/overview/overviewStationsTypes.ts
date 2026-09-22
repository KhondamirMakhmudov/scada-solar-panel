/**
 * Shape of GET /api/v1/overview/stations — see main_page.md at the repo
 * root for the full spec this was built from (statuses, thresholds, the
 * online/idle/offline distinction, poller semantics). Kept as its own
 * module since both the dashboard overview section and the mnemonic
 * runtime's status-dot enrichment (features/mnemonic-editor) consume it.
 */

export interface OverviewEnergy {
  currentPowerW: number;
  todayKwh: number;
  totalKwh: number;
}

export type OverviewDeviceStatus = "online" | "idle" | "error" | "offline" | "unknown" | "disabled";
export type OverviewGroupStatus = "online" | "degraded" | "offline" | "disabled" | "unknown";

export interface OverviewPoller {
  connection_id: string;
  name: string;
  type: string;
  connected: boolean;
  circuit_breaker: "CLOSED" | "HALF_OPEN" | "OPEN";
  failures: number;
  last_success_age_seconds: number;
  tags: number;
}

export interface OverviewDevice {
  id: string;
  name: string;
  status: OverviewDeviceStatus;
  lastSeen: string | null;
  staleSeconds: number | null;
  errorMessage: string | null;
  statusLabel: string | null;
  energy: OverviewEnergy;
}

export interface OverviewConnection {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  status: OverviewGroupStatus;
  poller: OverviewPoller | null;
  devices: OverviewDevice[];
}

export interface OverviewStation {
  driverId: string;
  status: OverviewGroupStatus;
  deviceCounts: Partial<Record<OverviewDeviceStatus, number>>;
  lastSeen: string | null;
  energy: OverviewEnergy;
  pollerReachable: boolean | null;
  pollerError: string | null;
  connections: OverviewConnection[];
}

export interface OverviewStationsResponse {
  generatedAt: string;
  totals: {
    stations: number;
    devices: number;
    deviceCounts: Partial<Record<OverviewDeviceStatus, number>>;
    energy: OverviewEnergy;
  };
  stations: OverviewStation[];
}

/** A device with its owning station/connection folded in — for lookups keyed by device id, not nested traversal. */
export interface FlatOverviewDevice extends OverviewDevice {
  stationDriverId: string;
  connectionId: string;
  connectionName: string;
}
