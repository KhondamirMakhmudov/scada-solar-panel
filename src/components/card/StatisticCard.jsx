import { motion } from "framer-motion";
import CountUp from "react-countup";

const StatCard = ({
  icon = "timer",
  label = "Статистика",
  value = "0",
  trendIcon = "trending_up",
  delay = 0.1,
  iconColor = "primary",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="group relative bg-surface-dark border border-surface-dark rounded-2xl p-6 hover:border-primary/50 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative flex justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-xl bg-${iconColor}/10 border border-${iconColor}/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
            >
              <span
                className={`material-symbols-outlined text-2xl text-${iconColor}`}
              >
                {icon}
              </span>
            </div>
            {/* {trendIcon && (
            <span className="material-symbols-outlined text-white group-hover:text-primary transition-colors">
              {trendIcon}
            </span>
          )} */}
          </div>

          <p className="text-white text-sm font-medium mb-2">{label}</p>
        </div>

        <p className="text-white text-3xl font-bold">
          <CountUp end={value} />
        </p>
      </div>
    </motion.div>
  );
};

export default StatCard;
