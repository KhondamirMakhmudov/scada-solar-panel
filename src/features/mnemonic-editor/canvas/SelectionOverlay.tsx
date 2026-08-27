import type { PointerEventHandler } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import type { ResizeHandle } from "./useCanvasInteraction";

const RESIZE_HANDLES: { handle: ResizeHandle; corner: "nw" | "ne" | "sw" | "se" }[] = [
  { handle: "nw", corner: "nw" },
  { handle: "ne", corner: "ne" },
  { handle: "sw", corner: "sw" },
  { handle: "se", corner: "se" },
];

const HANDLE_SIZE = 8;
const ROTATE_OFFSET = 24;

interface SelectionOverlayProps {
  onResizeHandlePointerDown: (id: string, handle: ResizeHandle) => PointerEventHandler<SVGElement>;
  onGroupResizeHandlePointerDown: (handle: ResizeHandle) => PointerEventHandler<SVGElement>;
  onRotateHandlePointerDown: (id: string) => PointerEventHandler<SVGElement>;
}

/**
 * Dashed bounding box + resize/rotate handles for the current selection —
 * drawn in its own top layer, not part of the persisted document. Ignores
 * the element's own rotation for the box itself (matches Slice 2's
 * simplification); resize/rotate math below is likewise unrotated.
 *
 * Multi-selection (Ctrl/Cmd/Shift-click, see useCanvasInteraction) gets one
 * dashed box per element plus a single combined-bbox frame with corner
 * handles that scale the whole group together (see
 * useCanvasInteraction's "group-resize" drag mode) — no rotate handle for a
 * group, that's a later slice.
 */
const SelectionOverlay = ({
  onResizeHandlePointerDown,
  onGroupResizeHandlePointerDown,
  onRotateHandlePointerDown,
}: SelectionOverlayProps) => {
  const selectedElementIds = useUiStore((state) => state.selectedElementIds);
  const elements = useDocumentStore((state) => state.document.elements);
  const selected = elements.filter((el) => selectedElementIds.includes(el.id));

  if (selected.length > 1) {
    const minX = Math.min(...selected.map((el) => el.x));
    const minY = Math.min(...selected.map((el) => el.y));
    const maxX = Math.max(...selected.map((el) => el.x + el.width));
    const maxY = Math.max(...selected.map((el) => el.y + el.height));
    const left = minX - 6;
    const top = minY - 6;
    const right = maxX + 6;
    const bottom = maxY + 6;

    const groupHandlePositions: Record<ResizeHandle, { x: number; y: number }> = {
      nw: { x: left, y: top },
      ne: { x: right, y: top },
      sw: { x: left, y: bottom },
      se: { x: right, y: bottom },
    };

    return (
      <>
        {selected.map((el) => (
          <rect
            key={el.id}
            x={el.x - 4}
            y={el.y - 4}
            width={el.width + 8}
            height={el.height + 8}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            pointerEvents="none"
          />
        ))}
        <rect
          x={left}
          y={top}
          width={right - left}
          height={bottom - top}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={1.5}
          pointerEvents="none"
        />
        {RESIZE_HANDLES.map(({ handle, corner }) => (
          <rect
            key={handle}
            x={groupHandlePositions[corner].x - HANDLE_SIZE / 2}
            y={groupHandlePositions[corner].y - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth={1.5}
            style={{ cursor: `${corner}-resize` }}
            onPointerDown={onGroupResizeHandlePointerDown(handle)}
          />
        ))}
      </>
    );
  }

  if (selected.length === 0) return null;

  const el = selected[0];
  const left = el.x - 4;
  const top = el.y - 4;
  const right = el.x + el.width + 4;
  const bottom = el.y + el.height + 4;
  const cx = el.x + el.width / 2;

  const handlePositions: Record<ResizeHandle, { x: number; y: number }> = {
    nw: { x: left, y: top },
    ne: { x: right, y: top },
    sw: { x: left, y: bottom },
    se: { x: right, y: bottom },
  };

  return (
    <g>
      <rect
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        pointerEvents="none"
      />

      <line
        x1={cx}
        y1={top}
        x2={cx}
        y2={top - ROTATE_OFFSET}
        stroke="#38bdf8"
        strokeWidth={1}
        pointerEvents="none"
      />
      <circle
        cx={cx}
        cy={top - ROTATE_OFFSET}
        r={HANDLE_SIZE / 2}
        fill="#0f172a"
        stroke="#38bdf8"
        strokeWidth={1.5}
        style={{ cursor: "grab" }}
        onPointerDown={onRotateHandlePointerDown(el.id)}
      />

      {RESIZE_HANDLES.map(({ handle, corner }) => (
        <rect
          key={handle}
          x={handlePositions[corner].x - HANDLE_SIZE / 2}
          y={handlePositions[corner].y - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="#0f172a"
          stroke="#38bdf8"
          strokeWidth={1.5}
          style={{ cursor: `${corner}-resize` }}
          onPointerDown={onResizeHandlePointerDown(el.id, handle)}
        />
      ))}
    </g>
  );
};

export default SelectionOverlay;
