import { motion } from "framer-motion";
import { ElectricBoltRounded, TodayRounded, BatteryChargingFullRounded } from "@mui/icons-material";
import ContentLoader from "@/components/loader";
import NoData from "@/components/no-data";
import { useOverviewStations } from "./useOverviewStations";
import StationCard from "./StationCard";
import DeviceStatusBar from "./DeviceStatusBar";
import { formatEnergy, formatPower, formatRelativeToNow } from "./overviewDisplay";
import LiveDot from "./LiveDot";
import { STATUS_COLOR } from "@/constants/statusPalette";

const HeroTile = ({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof ElectricBoltRounded;
  label: string;
  value: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay }}
    className="bg-surface-dark border border-surface-border rounded-[2px] p-4"
  >
    <div className="flex items-center gap-2.5 mb-3">
      <Icon sx={{ fontSize: 23, color: "#3987e5" }} />
      <p className="text-[14px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">{label}</p>
    </div>
    <p className="text-text-primary text-[42px] font-ibmPlexSans font-semibold leading-none">{value}</p>
  </motion.div>
);

/**
 * Live generation overview — GET /api/v1/overview/stations (see
 * main_page.md), the purpose-built endpoint for exactly this: every
 * station's status, its inverters, and running energy totals in one call,
 * polled every 20s. Placed above the static system-composition sections
 * below it (connections by type, config-derived counts) since this is the
 * one that actually answers "is the plant making power right now."
 */
const StationsOverviewSection = () => {
  const { response, stations, isLoading, isError } = useOverviewStations();

  if (isLoading) {
    return (
      <section className="bg-surface-dark border border-surface-border rounded-[2px] p-6">
        <ContentLoader classNames="" />
      </section>
    );
  }

  if (isError || !response) {
    return (
      <section className="bg-surface-dark border border-surface-border rounded-[2px]">
        <NoData
          title="Обзор станций недоступен"
          description="Не удалось получить /overview/stations — проверьте, что scada_storage доступен."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[14px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">
          Станции · выработка сейчас
        </h3>
        <span className="flex items-center gap-1.5 text-[13px] font-ibmPlexMono text-text-faint">
          <LiveDot color={STATUS_COLOR.ok} />
          Обновлено {formatRelativeToNow(response.generatedAt, new Date().toISOString())}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HeroTile icon={ElectricBoltRounded} label="Мощность сейчас" value={formatPower(response.totals.energy.currentPowerW)} delay={0} />
        <HeroTile icon={TodayRounded} label="Выработка сегодня" value={formatEnergy(response.totals.energy.todayKwh)} delay={0.05} />
        <HeroTile icon={BatteryChargingFullRounded} label="Выработка всего" value={formatEnergy(response.totals.energy.totalKwh)} delay={0.1} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="bg-surface-dark border border-surface-border rounded-[2px] p-3.5"
      >
        <p className="text-[13px] font-ibmPlexSans uppercase tracking-wide text-text-faint mb-3">
          {response.totals.devices} устройств на {response.totals.stations} {response.totals.stations === 1 ? "станции" : "станциях"}
        </p>
        <DeviceStatusBar counts={response.totals.deviceCounts} />
      </motion.div>

      {stations.length === 0 ? (
        <NoData title="Станций нет" description="В конфиге пока не заведено ни одной станции." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {stations.map((station, index) => (
            <StationCard key={station.driverId} station={station} generatedAt={response.generatedAt} index={index} />
          ))}
        </div>
      )}
    </section>
  );
};

export default StationsOverviewSection;
