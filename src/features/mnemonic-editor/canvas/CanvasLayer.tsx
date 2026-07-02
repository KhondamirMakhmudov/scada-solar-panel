import type { MouseEventHandler, PointerEventHandler } from "react";
import ElementInstance from "./ElementInstance";
import { useDocumentStore } from "../store/documentStore";
import type { ConnectionHandle, Layer } from "../types";

interface CanvasLayerProps {
  layer: Layer;
  onElementPointerDown: (id: string) => PointerEventHandler<SVGGElement>;
  onElementContextMenu: (id: string) => MouseEventHandler<SVGGElement>;
  onAnchorPointerDown: (id: string, handle: ConnectionHandle) => PointerEventHandler<SVGElement>;
}

const CanvasLayer = ({
  layer,
  onElementPointerDown,
  onElementContextMenu,
  onAnchorPointerDown,
}: CanvasLayerProps) => {
  const elementIds = useDocumentStore((state) =>
    state.document.elements
      .filter((el) => el.layerId === layer.id)
      .map((el) => el.id),
  );

  if (!layer.visible) return null;

  return (
    <g data-layer-id={layer.id} opacity={layer.locked ? 0.85 : 1}>
      {elementIds.map((id) => (
        <ElementInstance
          key={id}
          elementId={id}
          onElementPointerDown={onElementPointerDown}
          onElementContextMenu={onElementContextMenu}
          onAnchorPointerDown={onAnchorPointerDown}
        />
      ))}
    </g>
  );
};

export default CanvasLayer;
