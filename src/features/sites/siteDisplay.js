import { get } from "lodash";

/** SiteType из OpenAPI — пока единственное значение; подписи держим рядом, чтобы новый тип не пришлось искать по коду. */
export const SITE_TYPE_LABELS = {
  solar: "Солнечная",
};

export const SITE_TYPE_OPTIONS = Object.entries(SITE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const siteTypeLabel = (type) => SITE_TYPE_LABELS[type] || type || "—";

/** 1250 -> "1.25 МВт", 640 -> "640 кВт", null -> "—". Установленная мощность в API приходит в кВт. */
export function formatInstalledPower(kw) {
  if (kw === null || kw === undefined || kw === "") return "—";
  const value = Number(kw);
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2).replace(/\.?0+$/, "")} МВт`;
  }
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} кВт`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Паспорт — произвольный JSON (установки, панели, модели инверторов). В форме редактируется как текст. */
export function passportToText(passport) {
  if (!passport || typeof passport !== "object") return "{}";
  return JSON.stringify(passport, null, 2);
}

/** Разбор текста паспорта из формы: пустое поле = пустой паспорт, иначе обязателен JSON-объект (не массив/число). */
export function parsePassportText(text) {
  const raw = (text || "").trim();
  if (!raw) return { value: {}, error: "" };

  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: null, error: "Паспорт должен быть JSON-объектом: { ... }" };
    }
    return { value: parsed, error: "" };
  } catch (error) {
    return { value: null, error: `Некорректный JSON: ${error.message}` };
  }
}

/** Ключи паспорта приходят как camelCase/snake_case — для подписи режем на слова. */
export function humanizePassportKey(key) {
  const spaced = String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : String(key);
}

/** Короткая сводка паспорта для таблицы: сколько разделов заполнено. */
export function passportSummary(passport) {
  const keys = passport && typeof passport === "object" ? Object.keys(passport) : [];
  if (!keys.length) return "нет данных";
  return `${keys.length} ${pluralize(keys.length, ["раздел", "раздела", "разделов"])}`;
}

export function pluralize(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Текст ошибки бэкенда: у него встречаются и `message`, и FastAPI-шный `detail` (строка или список). */
export function apiErrorText(error, fallback) {
  const data = get(error, "response.data");
  const message = get(data, "message");
  if (typeof message === "string" && message) return message;

  const detail = get(data, "detail");
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((item) => get(item, "msg") || get(item, "message"))
      .filter(Boolean)
      .join("; ");
  }

  return fallback;
}

/** Код станции — slug, глобально уникальный (см. SiteCreate.code). */
export const SITE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
