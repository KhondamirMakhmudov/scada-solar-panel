import type { MouseEventHandler, PointerEventHandler, ReactNode } from "react";

export interface ParametrizedShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  onPointerDown?: PointerEventHandler<SVGGElement>;
  onContextMenu?: MouseEventHandler<SVGGElement>;
  children: ReactNode;
}

/** Shared transform wrapper: places a shape's local 0..width x 0..height drawing at (x,y) and rotates it about its own center. */
const ParametrizedShape = ({
  x,
  y,
  width,
  height,
  rotation,
  onPointerDown,
  onContextMenu,
  children,
}: ParametrizedShapeProps) => (
  <g
    transform={`translate(${x}, ${y}) rotate(${rotation}, ${width / 2}, ${height / 2})`}
    onPointerDown={onPointerDown}
    onContextMenu={onContextMenu}
    style={{ cursor: onPointerDown ? "move" : "default" }}
  >
    {children}
  </g>
);

export default ParametrizedShape;
