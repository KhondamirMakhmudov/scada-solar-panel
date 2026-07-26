import { STATUS_COLOR, STATUS_LABEL, type SystemStatus } from "@/constants/statusPalette";

interface StatusDotProps {
  status: SystemStatus;
  /** Подпись рядом с точкой; true — стандартная из STATUS_LABEL */
  label?: string | boolean;
  /** Пульсация — только для состояний, требующих вмешательства */
  pulse?: boolean;
}

/**
 * Индикатор состояния с единой семантикой цветов по всему проекту.
 *
 * Пульсация не включается автоматически для аварии: в таблице из сотни строк
 * десяток мигающих точек превращается в шум, из которого ничего не выделяется.
 * Решение о пульсации принимает вызывающая сторона, исходя из плотности.
 */
const StatusDot = ({ status, label, pulse = false }: StatusDotProps) => {
  const color = STATUS_COLOR[status];
  const text = label === true ? STATUS_LABEL[status] : label || null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: color }}
      />
      {text && (
        <span className="text-[11px]" style={{ color }}>
          {text}
        </span>
      )}
    </span>
  );
};

export default StatusDot;
