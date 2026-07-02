import { SHAPE_REGISTRY } from "./registry";
import type { ShapeComponentProps } from "./base/shapeProps";

/** Dispatches an element to its registered shape component by kind, with a visible fallback for kinds not yet implemented. */
const ShapeRenderer = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const definition = SHAPE_REGISTRY[element.type];

  if (!definition) {
    return (
      <g
        transform={`translate(${element.x}, ${element.y})`}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
      >
        <rect
          width={element.width}
          height={element.height}
          fill="none"
          stroke="#f87171"
          strokeDasharray="4 4"
        />
        <text x={4} y={14} fontSize={10} fill="#f87171">
          {element.type}?
        </text>
      </g>
    );
  }

  const { Component } = definition;
  return <Component element={element} onPointerDown={onPointerDown} onContextMenu={onContextMenu} />;
};

export default ShapeRenderer;
