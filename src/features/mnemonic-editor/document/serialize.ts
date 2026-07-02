import type { MnemonicDocument, MnemonicParams } from "../types";

export function serializeDocument(document: MnemonicDocument): MnemonicParams {
  return {
    version: 1,
    document,
    updatedAt: new Date().toISOString(),
  };
}
