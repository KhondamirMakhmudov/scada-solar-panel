import type { PointerEventHandler } from "react";
import type { ConnectionHandle, MnemonicElement } from "../types";
import { getElementAnchorPoint } from "../lib/geometry";

interface ConnectionAnchorsProps {
  element: MnemonicElement;
  onAnchorPointerDown: (id: string, handle: ConnectionHandle) => PointerEventHandler<SVGElement>;
}

const HANDLES: ConnectionHandle[] = ["left", "right", "top", "bottom"];
const ANCHOR_RADIUS = 5;

/** Small dots on all 4 sides of a shape — drag from one to another shape to draw a Connection between them (see useCanvasInteraction's "connect" drag mode). Shown on every element, not just the selected one, since a wire needs two different elements. */
const ConnectionAnchors = ({ element, onAnchorPointerDown }: ConnectionAnchorsProps) => (
  <g>
    {HANDLES.map((handle) => {
      const point = getElementAnchorPoint(element, handle);
      return (
        <circle
          key={handle}
          cx={point.x}
          cy={point.y}
          r={ANCHOR_RADIUS}
          fill="#0f172a"
          stroke="#4ade80"
          strokeWidth={1.5}
          className="opacity-40 hover:opacity-100 transition-opacity"
          style={{ cursor: "crosshair" }}
          onPointerDown={onAnchorPointerDown(element.id, handle)}
        />
      );
    })}
  </g>
);

export default ConnectionAnchors;
