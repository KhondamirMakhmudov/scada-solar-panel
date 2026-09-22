import { motion } from "framer-motion";

interface LiveDotProps {
  color: string;
  size?: number;
}

/**
 * "This is actually live" indicator — an expanding, fading ring around a
 * solid dot, looping forever (the classic radar-ping). Distinct on purpose
 * from StatusDot's fault blink (a same-size opacity flash reserved for
 * alarms): this one says "still updating," that one says "something's
 * wrong" — using the same animation for both would blur the two signals
 * together.
 */
const LiveDot = ({ color, size = 7 }: LiveDotProps) => (
  <span className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
    <motion.span
      className="absolute inset-0 rounded-full"
      style={{ background: color }}
      animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
    />
    <span className="relative inline-block rounded-full" style={{ width: size, height: size, background: color }} />
  </span>
);

export default LiveDot;
