import type { MouseEventHandler, PointerEventHandler } from "react";
import type { MnemonicElement } from "../../types";

export interface ShapeComponentProps {
  element: MnemonicElement;
  onPointerDown?: PointerEventHandler<SVGGElement>;
  onContextMenu?: MouseEventHandler<SVGGElement>;
}
