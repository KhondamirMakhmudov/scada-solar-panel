// components/card/RegionCard.jsx

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
const StatItem = ({ value, label }) => (
  <div className="text-center">
    <div className="text-[1.3rem] font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-gray-500 font-medium">{label}</div>
  </div>
);

const Metric = ({ value, label }) => (
  <div className="text-center">
    <div className="text-lg font-semibold text-gray-800">{value}</div>
    <div className="text-xs text-gray-500 mt-1">{label}</div>
  </div>
);

const InverterCard = ({ inverter }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case "Онлайн":
        return "bg-green-100 text-green-900";
      case "Предупреждение":
        return "bg-orange-200 text-orange-900";
      case "Офлайн":
        return "bg-red-200 text-red-900";
      default:
        return "bg-green-100 text-green-900";
    }
  };

  const getCardClass = (status) => {
    switch (status) {
      case "Предупреждение":
        return "bg-white rounded-xl p-5 shadow-md border-l-4 border-orange-500";
      case "Офлайн":
        return "bg-white rounded-xl p-5 shadow-md border-l-4 border-red-500";
      default:
        return "bg-white rounded-xl p-5 shadow-md border-l-4 border-green-500";
    }
  };

  return (
    <div className={getCardClass(inverter.status)}>
      <div className="flex justify-between items-center mb-4">
        <div className="font-semibold text-gray-800">{inverter.name}</div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(
            inverter.status
          )}`}
        >
          {inverter.status}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metric value={inverter.currentPower} label="Текущая мощность" />
        <Metric value={inverter.earnings} label="Заработано" />
        <Metric value={inverter.totalGeneration} label="Общая выработка" />
        <Metric value={inverter.efficiency} label="Эффективность" />
      </div>
    </div>
  );
};

const RegionCard = ({ region, isExpanded, onToggle }) => (
  <div className="border border-[#555555] rounded-2xl overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-0.5 manrope">
    <div
      className="bg-gradient-to-br bg-[#A877FD] text-white px-6 py-5 cursor-pointer flex justify-between items-center"
      onClick={onToggle}
    >
      <div className="text-[1.4rem] font-semibold">{region.name}</div>
      <div
        className={`transition-transform duration-300 ${
          isExpanded ? "rotate-180" : ""
        }`}
      >
        <KeyboardArrowDownIcon />
      </div>
    </div>
    <div className="grid gap-4 px-6 py-5 bg-[#1A132A] text-white  sm:grid-cols-2 md:grid-cols-3">
      <StatItem value={region.inverterCount} label="Инверторов" />
      <StatItem value={region.projectCapacity} label="Проектная мощность" />
      <StatItem value={region.totalGeneration} label="Общая выработка" />
      <StatItem value={region.dailyGeneration} label="Суточная выработка" />
      <StatItem value={region.currentGeneration} label="Текущая выработка" />
    </div>
    {isExpanded && (
      <div className="grid gap-4 p-6 bg-gray-200 sm:grid-cols-2 md:grid-cols-3">
        {region.inverters.map((inverter, index) => (
          <InverterCard key={index} inverter={inverter} />
        ))}
      </div>
    )}
  </div>
);

export default RegionCard;
