export const CONNECTION_TYPES = [
  "MODBUS_TCP",
  "MODBUS_RTU",
  "MODBUS_RTU_OVER_TCP",
  "OPC_UA",
  "IEC_104",
];

export const PARAM_FIELDS = {
  MODBUS_TCP: [
    {
      name: "host",
      label: "Хост",
      type: "text",
      required: true,
      placeholder: "192.168.1.100",
    },
    {
      name: "port",
      label: "Порт",
      type: "number",
      required: true,
      placeholder: "502",
    },
    {
      name: "timeout_ms",
      label: "Таймаут (ms)",
      type: "number",
      required: true,
      placeholder: "1000",
    },
  ],
  MODBUS_RTU: [
    {
      name: "serial_port",
      label: "COM порт",
      type: "text",
      required: true,
      placeholder: "COM1",
    },
    {
      name: "baud_rate",
      label: "Baud rate",
      type: "number",
      required: true,
      placeholder: "9600",
    },
    {
      name: "data_bits",
      label: "Data bits",
      type: "number",
      required: true,
      placeholder: "8",
    },
    {
      name: "stop_bits",
      label: "Stop bits",
      type: "number",
      required: true,
      placeholder: "1",
    },
    {
      name: "parity",
      label: "Parity",
      type: "select",
      required: true,
      options: [
        { label: "None", value: "none" },
        { label: "Even", value: "even" },
        { label: "Odd", value: "odd" },
      ],
    },
    {
      name: "timeout_ms",
      label: "Таймаут (ms)",
      type: "number",
      required: true,
      placeholder: "1000",
    },
    {
      name: "unit_id",
      label: "Unit ID",
      type: "number",
      required: true,
      placeholder: "1",
    },
  ],
  MODBUS_RTU_OVER_TCP: [
    {
      name: "host",
      label: "TCP хост",
      type: "text",
      required: true,
      placeholder: "192.168.1.100",
    },
    {
      name: "port",
      label: "TCP порт",
      type: "number",
      required: true,
      placeholder: "502",
    },
    {
      name: "serial_port",
      label: "COM порт",
      type: "text",
      required: true,
      placeholder: "COM1",
    },
    {
      name: "baud_rate",
      label: "Baud rate",
      type: "number",
      required: true,
      placeholder: "9600",
    },
    {
      name: "data_bits",
      label: "Data bits",
      type: "number",
      required: true,
      placeholder: "8",
    },
    {
      name: "stop_bits",
      label: "Stop bits",
      type: "number",
      required: true,
      placeholder: "1",
    },
    {
      name: "parity",
      label: "Parity",
      type: "select",
      required: true,
      options: [
        { label: "None", value: "none" },
        { label: "Even", value: "even" },
        { label: "Odd", value: "odd" },
      ],
    },
    {
      name: "timeout_ms",
      label: "Таймаут (ms)",
      type: "number",
      required: true,
      placeholder: "1000",
    },
    {
      name: "unit_id",
      label: "Unit ID",
      type: "number",
      required: true,
      placeholder: "1",
    },
  ],
  OPC_UA: [
    {
      name: "endpoint_url",
      label: "Endpoint URL",
      type: "text",
      required: true,
      placeholder: "opc.tcp://127.0.0.1:4840",
    },
    {
      name: "security_policy",
      label: "Security policy",
      type: "select",
      required: true,
      options: [
        { label: "None", value: "None" },
        { label: "Basic128Rsa15", value: "Basic128Rsa15" },
        { label: "Basic256", value: "Basic256" },
        { label: "Basic256Sha256", value: "Basic256Sha256" },
      ],
    },
    {
      name: "security_mode",
      label: "Security mode",
      type: "select",
      required: true,
      options: [
        { label: "None", value: "None" },
        { label: "Sign", value: "Sign" },
        { label: "SignAndEncrypt", value: "SignAndEncrypt" },
      ],
    },
    {
      name: "session_timeout",
      label: "Session timeout (ms)",
      type: "number",
      required: true,
      placeholder: "60000",
    },
  ],
  IEC_104: [
    {
      name: "host",
      label: "Хост",
      type: "text",
      required: true,
      placeholder: "192.168.1.100",
    },
    {
      name: "port",
      label: "Порт",
      type: "number",
      required: true,
      placeholder: "2404",
    },
    {
      name: "common_address",
      label: "Common address",
      type: "number",
      required: true,
      placeholder: "1",
    },
    {
      name: "timeout_ms",
      label: "Таймаут (ms)",
      type: "number",
      required: true,
      placeholder: "1000",
    },
  ],
};

export const PARAM_HINTS = {
  MODBUS_TCP: "TCP transport: usually host, port, unit_id, timeout_ms.",
  MODBUS_RTU:
    "Serial transport: usually serial_port, baud_rate, parity, stop_bits, timeout_ms.",
  MODBUS_RTU_OVER_TCP:
    "Serial-over-TCP transport: typically TCP endpoint plus serial settings.",
  OPC_UA:
    "OPC UA session: usually endpoint_url, security settings and optional auth fields.",
  IEC_104:
    "IEC-104 transport: usually host, port, common_address and timeout settings.",
};

export const CONNECTION_TYPE_OPTIONS = CONNECTION_TYPES.map((type) => ({
  label: type,
  value: type,
}));

export const ENABLED_OPTIONS = [
  { label: "Включен", value: true },
  { label: "Отключен", value: false },
];

export const DEFAULT_FORM = {
  name: "",
  type: CONNECTION_TYPES[0],
  enabled: true,
};

export const getDefaultParamsByType = (type) =>
  (PARAM_FIELDS[type] || []).reduce((accumulator, field) => {
    accumulator[field.name] = "";
    return accumulator;
  }, {});
