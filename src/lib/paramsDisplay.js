/**
 * Generic "render whatever this protocol-shaped params bag contains" helpers
 * — shared by connections (features/connections/connectionDisplay.js) and
 * devices (features/devices/deviceDisplay.js). Both `/connections` and
 * `/devices` return a `params` object whose keys depend entirely on the
 * protocol (Modbus device: {type, slave_address}; OPC UA connection:
 * {endpoint_url, security_mode, ...}), so a details view that hardcodes a
 * fixed set of fields silently drops whatever doesn't match. This renders
 * every key actually present instead, labeled from a shared dictionary when
 * known and humanized from the raw key otherwise.
 */

export const PARAM_LABELS = {
  host: "Хост",
  port: "Порт",
  timeout_ms: "Таймаут",
  serial_port: "COM-порт",
  baud_rate: "Скорость (baud)",
  data_bits: "Биты данных",
  stop_bits: "Стоп-биты",
  parity: "Чётность",
  unit_id: "Unit ID",
  common_address: "Common address",
  endpoint_url: "Endpoint URL",
  security_policy: "Политика безопасности",
  security_mode: "Режим безопасности",
  session_timeout: "Таймаут сессии",
  session_timeout_ms: "Таймаут сессии",
  username: "Имя пользователя",
  password: "Пароль",
  certificate_path: "Путь к сертификату",
  private_key_path: "Путь к приватному ключу",
  type: "Протокол",
  slave_address: "Slave address",
  node_id: "Node ID",
  register_type: "Тип регистра",
  address: "Адрес регистра",
  data_type: "Тип данных",
  word_order: "Порядок слов",
  byte_order: "Порядок байт",
  scale: "Масштаб",
  offset: "Смещение",
};

const TECHNICAL_KEYS = new Set([
  "host",
  "endpoint_url",
  "serial_port",
  "certificate_path",
  "private_key_path",
  "username",
  "node_id",
]);

export function humanizeParamKey(key) {
  return PARAM_LABELS[key] || key.split("_").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}

export function isTechnicalParamKey(key) {
  return TECHNICAL_KEYS.has(key);
}

export function isSecretParamKey(key) {
  return key === "password";
}

/**
 * Rows to render for a `params` object, in backend insertion order (not
 * alphabetized — that order tends to already read protocol → address →
 * auth → timeouts, which is the order an operator scans for).
 * `hiddenKeys` lets a caller drop a field it renders elsewhere (e.g. a
 * connection's `type` already sits in the header badge).
 */
export function buildParamRows(params, hiddenKeys = []) {
  if (!params || typeof params !== "object") return [];
  const hidden = new Set(hiddenKeys);
  return Object.entries(params)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => ({ key, label: humanizeParamKey(key), value }));
}
