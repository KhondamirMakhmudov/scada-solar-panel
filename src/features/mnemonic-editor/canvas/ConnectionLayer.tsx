import { useMemo } from "react";
import type { PointerEventHandler } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { getElementAnchorPoint } from "../lib/geometry";
import { computePanelSlots } from "../lib/panelLayout";
import type { Rect } from "../lib/routing";
import ConnectionLine from "./ConnectionLine";

interface ConnectionLayerProps {
  onConnectionPointerDown?: (id: string) => PointerEventHandler<SVGElement>;
  /** Runtime/kiosk mode renders connections read-only — no click-to-select. */
  interactive?: boolean;
}

/** Renders Connection[] as orthogonal routes recomputed from each endpoint element's *current* geometry — so a wire stays attached as either shape moves, resizes, or rotates, instead of being fixed coordinates. Also renders the in-progress preview line while a connection is being dragged. */
const ConnectionLayer = ({ onConnectionPointerDown, interactive = true }: ConnectionLayerProps) => {
  const connections = useDocumentStore((state) => state.document.connections);
  const elements = useDocumentStore((state) => state.document.elements);
  const selectedConnectionIds = useUiStore((state) => state.selectedConnectionIds);
  const connecting = useUiStore((state) => state.connecting);

  const elementById = useMemo(() => new Map(elements.map((el) => [el.id, el])), [elements]);
  const connectingSource = connecting ? elementById.get(connecting.elementId) : null;

  const nodeRectById = useMemo(
    () => new Map(elements.map((el) => [el.id, { x: el.x, y: el.y, width: el.width, height: el.height }])),
    [elements],
  );
  const panelSlots = useMemo(() => computePanelSlots(elements), [elements]);

  return (
    <g>
      {connections.map((conn) => {
        const source = elementById.get(conn.source.elementId);
        const target = elementById.get(conn.target.elementId);
        if (!source || !target) return null;

        // Every other node/panel is an obstacle — never the connection's own endpoints.
        const obstacles: Rect[] = [];
        nodeRectById.forEach((rect, id) => {
          if (id !== source.id && id !== target.id) obstacles.push(rect);
        });
        panelSlots.forEach((rect, id) => {
          if (id !== source.id && id !== target.id) obstacles.push(rect);
        });

        return (
          <ConnectionLine
            key={conn.id}
            connection={conn}
            source={source}
            target={target}
            obstacles={obstacles}
            isSelected={selectedConnectionIds.includes(conn.id)}
            interactive={interactive}
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
