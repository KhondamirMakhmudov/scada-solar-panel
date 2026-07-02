import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import toast from "react-hot-toast";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useCanvasInteraction } from "./useCanvasInteraction";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { screenToDocumentPoint } from "../lib/geometry";
import { readImageFile } from "../lib/imageFile";
import { generateId } from "../lib/idGen";
import { DEFAULT_LAYER_ID } from "../document/defaults";
import { commitImmediate } from "../store/history/historyActions";
import CanvasLayer from "./CanvasLayer";
import ConnectionLayer from "./ConnectionLayer";
import SelectionOverlay from "./SelectionOverlay";
import GridBackground from "./GridBackground";
import ContextMenu from "./ContextMenu";

const MAX_DROPPED_IMAGE_DIM = 320;

const EditorCanvas = () => {
  const layers = useDocumentStore((state) => state.document.layers);
  const canvasSize = useDocumentStore((state) => state.document.canvasSize);
  const gridSize = useDocumentStore((state) => state.document.gridSize);
  const background = useDocumentStore((state) => state.document.background);
  const viewport = useUiStore((state) => state.viewport);
  const isSpaceDown = useUiStore((state) => state.isSpaceDown);
  const setSpaceDown = useUiStore((state) => state.setSpaceDown);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const {
    handleBackgroundPointerDown,
    handleElementPointerDown,
    handleElementContextMenu,
    handleResizeHandlePointerDown,
    handleRotateHandlePointerDown,
    handleAnchorPointerDown,
    handleConnectionPointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  } = useCanvasInteraction();

  useKeyboardShortcuts();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceDown(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setSpaceDown]);

  // Native OS file drag-and-drop (dragging an image in from the file
  // explorer) — a separate browser event system from the pointer-based
  // shape dragging in useCanvasInteraction, so there's no conflict.
  const handleDragOver = (event: DragEvent<SVGSVGElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = () => setIsDraggingFile(false);

  const handleDrop = async (event: DragEvent<SVGSVGElement>) => {
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const dropPoint = screenToDocumentPoint(event.clientX, event.clientY, rect, viewport);

    try {
      const { src, width: naturalWidth, height: naturalHeight } = await readImageFile(file);
      const scale = Math.min(1, MAX_DROPPED_IMAGE_DIM / Math.max(naturalWidth, naturalHeight));
      const width = Math.round(naturalWidth * scale) || 160;
      const height = Math.round(naturalHeight * scale) || 120;

      commitImmediate(() =>
        useDocumentStore.getState().addElement({
          id: generateId("image"),
          type: "image",
          layerId: DEFAULT_LAYER_ID,
          x: dropPoint.x - width / 2,
          y: dropPoint.y - height / 2,
          width,
          height,
          rotation: 0,
          zIndex: useDocumentStore.getState().document.elements.length,
          style: { fill: "none", stroke: "#475569", strokeWidth: 1, opacity: 1 },
          state: { src },
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки изображения");
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg
        className="w-full h-full"
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={(event) => event.preventDefault()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          cursor: isSpaceDown ? "grab" : "default",
          touchAction: "none",
          background: "#020617",
        }}
      >
        <g transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}>
          <rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill={background.color} />
          {background.imageUrl && (
            <image
              href={background.imageUrl}
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              preserveAspectRatio="xMidYMid slice"
            />
          )}
          <GridBackground gridSize={gridSize} width={canvasSize.width} height={canvasSize.height} />
          <ConnectionLayer onConnectionPointerDown={handleConnectionPointerDown} />
          {layers.map((layer) => (
            <CanvasLayer
              key={layer.id}
              layer={layer}
              onElementPointerDown={handleElementPointerDown}
              onElementContextMenu={handleElementContextMenu}
              onAnchorPointerDown={handleAnchorPointerDown}
            />
          ))}
          <SelectionOverlay
            onResizeHandlePointerDown={handleResizeHandlePointerDown}
            onRotateHandlePointerDown={handleRotateHandlePointerDown}
          />
        </g>
      </svg>
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-dashed border-blue-400 bg-blue-500/5 flex items-center justify-center">
          <span className="text-sm text-blue-300">Отпустите, чтобы добавить изображение</span>
        </div>
      )}
      <ContextMenu />
    </div>
  );
};

export default EditorCanvas;
