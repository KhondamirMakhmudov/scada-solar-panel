import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: ReactNode;
  /**
   * Порядковый номер блока на экране — задаёт каскад появления. Задержка
   * ограничена сверху: при двух десятках плиток честный `index * step`
   * растянул бы появление последней на несколько секунд, и раздел выглядел
   * бы не «оживающим», а тормозящим.
   */
  index?: number;
  /** Дополнительная задержка поверх каскадной, секунды */
  delay?: number;
  /** Насколько блок приподнят в начале анимации */
  y?: number;
  className?: string;
}

/** Шаг каскада и его потолок — одни на весь проект, чтобы разделы появлялись в одном ритме. */
export const REVEAL_STEP = 0.04;
export const REVEAL_MAX_DELAY = 0.24;
export const REVEAL_DURATION = 0.22;

/**
 * Появление блока: короткий подъём с проявлением — тот же приём, что на
 * главной (`StationsOverviewSection`, `StationCard`), вынесенный в общий
 * набор, чтобы разделы не расходились в длительностях и смещениях.
 *
 * Анимация только на входе и нарочно короткая: на странице оператора
 * движение — это способ показать порядок появления данных, а не украшение;
 * всё, что длится дольше четверти секунды, начинает восприниматься как
 * задержка отрисовки.
 *
 * При включённом в системе «уменьшении движения» блок просто появляется:
 * анимация выключается целиком, а не ускоряется.
 */
const Reveal = ({ children, index = 0, delay = 0, y = 8, className }: RevealProps) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: REVEAL_DURATION,
        ease: "easeOut",
        delay: Math.min(index * REVEAL_STEP, REVEAL_MAX_DELAY) + delay,
      }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
