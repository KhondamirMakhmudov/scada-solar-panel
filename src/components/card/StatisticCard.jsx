import { motion } from "framer-motion";
import CountUp from "react-countup";

function StatCard({ title, percent, value, unit, subtitle }) {
  return (
    <motion.div
      className="col-span-3"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-white">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {percent && (
            <p className="bg-[#F4F5F9] text-[#6E39CB] inline items-center px-1 rounded-md text-sm">
              {percent}
            </p>
          )}
        </div>
        <p className="text-[28px] text-[#6E39CB] font-bold">
          <CountUp end={value} decimals={0} separator="," duration={2} /> {unit}
        </p>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

export default StatCard;
