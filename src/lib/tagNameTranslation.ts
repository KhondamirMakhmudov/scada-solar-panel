/**
 * Tag names in this system come straight from the field devices in English
 * (e.g. `totalenergy`, `today_generate_energy`) and there's no translation
 * API for them — they're technical identifiers, not free text. This is a
 * small hand-maintained dictionary covering the tag names actually seen in
 * this deployment plus common solar/energy-monitoring vocabulary, with a
 * best-effort fallback for unseen snake_case tags built from the same word
 * list. Unknown/smashed-together names (no separator, not in the exact
 * list) are left untranslated rather than guessed at.
 */

const EXACT_TRANSLATIONS: Record<string, string> = {
  totalenergy: "Общая энергия",
  todayenergy: "Энергия за сегодня",
  densityco: "Плотность CO",
  densityno: "Плотность NO",
  densityo2: "Плотность O2",
  fixeddensityco: "Фиксированная плотность CO",
  iheat: "Тепловая мощность",
  current_power: "Текущая мощность",
  status: "Статус",
  temperature: "Температура",
  today_generate_energy: "Выработка за сегодня",
  total_generate_energy: "Общая выработка",
  work_time_total: "Общее время работы",
};

const WORD_DICTIONARY: Record<string, string> = {
  total: "общая",
  today: "сегодня",
  energy: "энергия",
  generate: "выработка",
  current: "текущая",
  power: "мощность",
  status: "статус",
  temperature: "температура",
  density: "плотность",
  fixed: "фиксированная",
  work: "работа",
  time: "время",
  heat: "тепло",
  voltage: "напряжение",
  frequency: "частота",
  pressure: "давление",
  flow: "расход",
  level: "уровень",
  alarm: "авария",
  fault: "неисправность",
  battery: "аккумулятор",
  grid: "сеть",
  inverter: "инвертор",
  panel: "панель",
  solar: "солнечная",
  output: "выход",
  input: "вход",
  ambient: "окружающая",
  module: "модуль",
  wind: "ветер",
  speed: "скорость",
  efficiency: "КПД",
  code: "код",
  running: "работает",
  state: "состояние",
  communication: "связь",
  soc: "заряд АКБ",
};

function translateExact(name: string): string | null {
  return EXACT_TRANSLATIONS[name.toLowerCase()] ?? null;
}

/** Only splits on explicit separators (snake_case/kebab-case) — smashed-together compounds without a separator aren't guessed at, to avoid mistranslating something like "iheat" as "i" + "heat". */
function translateBySegments(name: string): string | null {
  const segments = name.split(/[_\-]+/).filter(Boolean);
  if (segments.length < 2) return null;

  const words: string[] = [];
  for (const segment of segments) {
    const word = WORD_DICTIONARY[segment.toLowerCase()];
    if (!word) return null;
    words.push(word);
  }
  const translated = words.join(" ");
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

/** Returns a Russian translation for a tag name, or null if none is known. */
export function translateTagName(name: string): string | null {
  if (!name) return null;
  return translateExact(name) ?? translateBySegments(name);
}

/** Formats as "Russian (english)" when a translation exists, otherwise just the raw name. */
export function formatTagLabel(name: string): string {
  const translated = translateTagName(name);
  return translated ? `${translated} (${name})` : name;
}
