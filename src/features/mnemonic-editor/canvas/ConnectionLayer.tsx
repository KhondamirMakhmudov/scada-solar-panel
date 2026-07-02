import type { PointerEventHandler } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { getElementAnchorPoint } from "../lib/geometry";

interface ConnectionLayerProps {
  onConnectionPointerDown?: (id: string) => PointerEventHandler<SVGElement>;
  /** Runtime/kiosk mode renders connections read-only — no click-to-select. */
  interactive?: boolean;
}

/** Renders Connection[] as lines recomputed from each endpoint element's *current* geometry — so a wire stays attached as either shape moves, resizes, or rotates, instead of being fixed coordinates. Also renders the in-progress preview line while a connection is being dragged. */
const ConnectionLayer = ({ onConnectionPointerDown, interactive = true }: ConnectionLayerProps) => {
  const connections = useDocumentStore((state) => state.document.connections);
  const elements = useDocumentStore((state) => state.document.elements);
  const selectedConnectionIds = useUiStore((state) => state.selectedConnectionIds);
  const connecting = useUiStore((state) => state.connecting);

  const elementById = new Map(elements.map((el) => [el.id, el]));
  const connectingSource = connecting ? elementById.get(connecting.elementId) : null;

  return (
    <g>
      {connections.map((conn) => {
        const source = elementById.get(conn.source.elementId);
        const target = elementById.get(conn.target.elementId);
        if (!source || !target) return null;

        const p1 = getElementAnchorPoint(source, conn.source.handle);
        const p2 = getElementAnchorPoint(target, conn.target.handle);
        const isSelected = selectedConnectionIds.includes(conn.id);

        return (
          <line
            key={conn.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={isSelected ? "#38bdf8" : conn.style?.stroke || "#64748b"}
            strokeWidth={isSelected ? 4 : conn.style?.strokeWidth || 3}
            strokeDasharray={conn.style?.dashed ? "6 4" : undefined}
            strokeLinecap="round"
            style={interactive ? { cursor: "pointer" } : undefined}
            onPointerDown={
              interactive && onConnectionPointerDown ? onConnectionPointerDown(conn.id) : undefined
            }
          />
        );
      })}

      {connecting && connectingSource && (
        <line
          x1={getElementAnchorPoint(connectingSource, connecting.handle).x}
          y1={getElementAnchorPoint(connectingSource, connecting.handle).y}
          x2={connecting.previewPoint.x}
          y2={connecting.previewPoint.y}
          stroke="#38bdf8"
          strokeWidth={2}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </g>
  );
};

export default ConnectionLayer;
