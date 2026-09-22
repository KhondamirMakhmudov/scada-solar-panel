/**
 * Connection-specific display helpers, layered on the generic param-row
 * renderer in src/lib/paramsDisplay.js (shared with devices — same "backend
 * returns a protocol-shaped bag, don't hardcode which keys exist" problem).
 * This file only adds the bits that are actually about *connections*:
 * hiding `type` (already a header badge), the OPC-UA-insecure-session flag,
 * and the address/timeout summaries the connects table and cards use.
 */
import { buildParamRows as buildParamRowsGeneric, humanizeParamKey, isSecretParamKey, isTechnicalParamKey } from "@/lib/paramsDisplay";

export { humanizeParamKey, isSecretParamKey, isTechnicalParamKey };

/** `type` is rendered as the header's protocol badge already — repeating it in the field list would be pure duplication. */
const CONNECTION_PARAM_HIDDEN_KEYS = ["type"];

export function buildParamRows(params) {
  return buildParamRowsGeneric(params, CONNECTION_PARAM_HIDDEN_KEYS);
}

/** True when an OPC UA session runs with no transport security — worth flagging, not just listing like any other field. */
export function isInsecureSecurityValue(key, value) {
  return (
    (key === "security_mode" || key === "security_policy") &&
    typeof value === "string" &&
    value.toLowerCase() === "none"
  );
}

/**
 * One-line "where does this connection actually point" for list/table rows —
 * the connects table's "Адрес" column used to read only `params.host`/
 * `params.port`/`params.serial_port`, which is Modbus's shape. An OPC UA
 * connection has neither — its address lives in `params.endpoint_url` — so
 * every OPC UA row rendered a bare "—" no matter what it was actually
 * configured to talk to. Checked in the order a real value is most likely to
 * exist for a given protocol shape, not by branching on `type`, so a
 * protocol we don't special-case yet still shows whichever of these fields
 * it happens to send.
 */
export function connectionAddressLabel(params) {
  const host = params?.host;
  const port = params?.port;
  if (host) return port ? `${host}:${port}` : String(host);
  if (params?.serial_port) return String(params.serial_port);
  if (params?.endpoint_url) return String(params.endpoint_url);
  return "—";
}

/** Same idea as connectionAddressLabel, for the one timeout field a card summary has room for — Modbus/IEC-104 call it `timeout_ms`, OPC UA calls it `session_timeout_ms` (or the form's `session_timeout`). */
export function connectionTimeoutMs(params) {
  return params?.timeout_ms ?? params?.session_timeout_ms ?? params?.session_timeout ?? null;
}
