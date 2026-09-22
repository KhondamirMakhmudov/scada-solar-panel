/**
 * Device-specific display helpers, layered on the generic param-row
 * renderer in src/lib/paramsDisplay.js — same idea as
 * features/connections/connectionDisplay.js: a device's `params` is shaped
 * by its protocol (`{type, slave_address}` for Modbus, potentially
 * `{type, node_id}` for an OPC UA device, etc.), so the details view and
 * the table's "Адрес" column render whatever is actually there instead of
 * assuming Modbus's `slave_address`.
 */
import { buildParamRows as buildParamRowsGeneric, humanizeParamKey, isSecretParamKey, isTechnicalParamKey } from "@/lib/paramsDisplay";

export { humanizeParamKey, isSecretParamKey, isTechnicalParamKey };

/** `type` is shown as the header's protocol badge already. */
const DEVICE_PARAM_HIDDEN_KEYS = ["type"];

export function buildParamRows(params) {
  return buildParamRowsGeneric(params, DEVICE_PARAM_HIDDEN_KEYS);
}

/**
 * One-line "how is this device addressed on its bus" — the devices table's
 * "Адрес" column used to read only `params.slave_address` (Modbus). A
 * device on a protocol without a slave address (e.g. an OPC UA node
 * identified by `node_id`) rendered a bare "—" regardless of what it was
 * actually configured with.
 */
export function deviceAddressLabel(params) {
  if (params?.slave_address !== undefined && params?.slave_address !== null && params?.slave_address !== "") {
    return String(params.slave_address);
  }
  if (params?.node_id) return String(params.node_id);
  if (params?.address !== undefined && params?.address !== null && params?.address !== "") {
    return String(params.address);
  }
  return "—";
}
