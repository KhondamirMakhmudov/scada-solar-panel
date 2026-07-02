import type { MnemonicParams } from "../types";

/**
 * Version-tagged migration hook for `params.mnemonic`. No-op today (only
 * version 1 exists) — kept so a future schema change has a proven place to
 * land without touching call sites.
 */
export function migrateMnemonicParams(params: MnemonicParams): MnemonicParams {
  return params;
}
