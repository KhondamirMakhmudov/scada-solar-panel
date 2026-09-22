/**
 * Categorical palette for the system overview page (connection-type bars).
 * Dark-mode steps from the validated default palette — order is fixed and
 * assigned to connection-type NAMES (alphabetically), not to their rank by
 * count, so a type never repaints when others grow/shrink past it. Validated
 * against this app's actual card background (#1c1b1b, tailwind
 * `surface-dark`) with `dataviz`'s validate_palette.js: all four slots clear
 * the lightness band, chroma floor, CVD/normal-vision separation, and 3:1
 * contrast — see the skill for the full report.
 *
 * Kept separate from statusPalette.ts on purpose: status colors (ok/warn/
 * alarm) mean "state" and must never double as a series identity, and vice
 * versa — mixing them would make a fault-red bar read as an alarm.
 */
export const CATEGORICAL_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9"];

export function categoricalColorFor(keys, key) {
  // Стабильный порядок присвоения — по алфавиту ключей, а не по текущему
  // значению/рангу — иначе один и тот же тип соединения менял бы цвет при
  // изменении счётчиков.
  const sorted = [...keys].sort();
  const index = sorted.indexOf(key);
  return CATEGORICAL_DARK[index % CATEGORICAL_DARK.length];
}
