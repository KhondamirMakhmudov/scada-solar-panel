import type { ReactNode } from "react";
import { STATUS_COLOR, type SystemStatus } from "@/constants/statusPalette";

interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Единица измерения — рисуется мельче и приглушённее рядом со значением */
  unit?: string;
  /** Состояние: красит значение и зажигает точку слева от подписи */
  status?: SystemStatus;
  hint?: ReactNode;
  /** Плотный вариант для полосы показателей над графиками */
  dense?: boolean;
}

/**
 * Одно числовое показание: подпись, значение, единица.
 *
 * Значения выводятся моноширинно с табличными цифрами — в полосе показателей
 * соседние плитки обновляются независимо, и без фиксированной ширины цифры
 * числа дёргались бы при каждом обновлении.
 */
const StatTile = ({ label, value, unit, status, hint, dense = false }: StatTileProps) => {
  const color = status ? STATUS_COLOR[status] : undefined;

  return (
    <div
      className={`rounded-[2px] border border-surface-border bg-surface-1 ${
        dense ? "px-3 py-2" : "p-3.5"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {status && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: STATUS_COLOR[status] }}
          />
        )}
        <p className="text-[10px] uppercase tracking-wide text-[#6b7280] truncate">{label}</p>
      </div>
      <p
        className={`font-ibmPlexMono tabular-nums leading-none text-[#e5e2e1] ${
          dense ? "text-[15px]" : "text-xl"
        }`}
        style={color ? { color } : undefined}
      >
        {value}
        {unit && <span className="ml-1 text-[11px] text-[#6b7280] font-normal">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-[10px] text-[#6b7280] truncate">{hint}</p>}
    </div>
  );
};

export default StatTile;
