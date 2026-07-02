import type { MnemonicElement } from "./element";
import type { Connection } from "./connection";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface DocumentBackground {
  color: string;
  imageUrl?: string | null;
}

export interface MnemonicDocument {
  gridSize: number;
  canvasSize: CanvasSize;
  background: DocumentBackground;
  layers: Layer[];
  elements: MnemonicElement[];
  connections: Connection[];
}

/** Shape of the `params.mnemonic` bucket persisted on the screen record. */
export interface MnemonicParams {
  version: 1;
  document: MnemonicDocument;
  updatedAt: string;
}
