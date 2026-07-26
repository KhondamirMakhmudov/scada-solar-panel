import type { ShapeKind } from "../types";

export interface ShapeCategory {
  id: string;
  label: string;
  /** Порядок внутри группы задаётся вручную, а не порядком ключей реестра */
  kinds: ShapeKind[];
}

/**
 * Группировка палитры по инженерным дисциплинам вместо одного плоского
 * списка из 20 кнопок: оператор ищет «клапан» среди механики, а не
 * пролистывая солнечные панели. Порядок групп — от самых частых на
 * технологической схеме к оформительским.
 *
 * `freehand` и `basicShape` сюда не входят намеренно: они создаются
 * инструментами «Кисть» и «Фигуры» на панели инструментов (см. комментарий
 * к AVAILABLE_SHAPE_KINDS в shapes/registry.ts).
 */
export const SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    id: "mechanical",
    label: "Механика и поток",
    kinds: ["pump", "valve", "pipe", "tank", "motor"],
  },
  {
    id: "electrical",
    label: "Электрооборудование",
    kinds: ["breaker", "switch", "transformer", "grid", "meter"],
  },
  {
    id: "power",
    label: "Генерация и накопление",
    kinds: ["solarPanel", "inverter", "battery"],
  },
  {
    id: "instrumentation",
    label: "КИПиА",
    kinds: ["sensor", "gauge", "lamp"],
  },
  {
    id: "annotation",
    label: "Оформление",
    kinds: ["chart", "text", "image", "building"],
  },
];

/**
 * Синонимы для поиска по палитре — оператор набирает «насос», «pump» или
 * «двигатель», и находит нужный элемент, даже если подпись сформулирована
 * иначе (например, «Электродвигатель» по запросу «мотор»).
 */
export const SHAPE_SEARCH_ALIASES: Partial<Record<ShapeKind, string[]>> = {
  pump: ["pump", "перекачка"],
  valve: ["valve", "задвижка", "вентиль"],
  tank: ["tank", "бак", "ёмкость", "емкость"],
  pipe: ["pipe", "трубопровод", "линия"],
  motor: ["motor", "мотор", "привод", "двигатель"],
  sensor: ["sensor", "температура", "давление", "измерение"],
  lamp: ["lamp", "светофор", "индикация", "led"],
  gauge: ["gauge", "шкала", "стрелка", "манометр"],
  breaker: ["breaker", "автомат", "выключатель"],
  switch: ["switch", "рубильник", "ключ"],
  transformer: ["transformer", "тр-р", "подстанция"],
  solarPanel: ["solar", "фэс", "фотомодуль", "панель"],
  inverter: ["inverter", "преобразователь"],
  battery: ["battery", "батарея", "накопитель", "акб"],
  grid: ["grid", "лэп", "энергосистема", "сеть"],
  meter: ["meter", "учёт", "учет", "квтч"],
  image: ["image", "картинка", "фото"],
  text: ["text", "подпись", "надпись"],
  building: ["building", "цех", "сооружение"],
  chart: ["chart", "тренд", "trend", "история"],
};

/** Подсказка под названием в палитре — что элемент делает на схеме. */
export const SHAPE_HINTS: Partial<Record<ShapeKind, string>> = {
  pump: "Вращение лопастей по тегу пуска",
  valve: "Открыт / закрыт",
  tank: "Уровень заполнения 0–100 %",
  pipe: "Связь с анимацией потока",
  motor: "Вращение по тегу пуска",
  sensor: "Показание с единицей измерения",
  lamp: "Цветовая индикация состояния",
  gauge: "Стрелочная шкала с диапазоном",
  breaker: "Включён / отключён",
  switch: "Двухпозиционный ключ",
  transformer: "Наличие напряжения",
  solarPanel: "Выработка активна",
  inverter: "Работа / ожидание",
  battery: "Заряд и режим зарядки",
  grid: "Связь с внешней сетью",
  meter: "Счётчик энергии",
  image: "Подложка или фото объекта",
  text: "Статическая подпись",
  building: "Контур здания или площадки",
  chart: "Исторический тренд по тегу",
};

/** MIME-тип для перетаскивания из палитры на холст. */
export const SHAPE_DRAG_MIME = "application/x-scada-shape";
