import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import toast from "react-hot-toast";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useCanvasInteraction } from "./useCanvasInteraction";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { screenToDocumentPoint } from "../lib/geometry";
import { readImageFile } from "../lib/imageFile";
import { generateId } from "../lib/idGen";
import { createShapeElement } from "../lib/createShapeElement";
import { SHAPE_REGISTRY } from "../shapes/registry";
import type { ShapeKind } from "../types";
import { SHAPE_DRAG_MIME } from "../toolbar/shapeCategories";
import { DEFAULT_LAYER_ID } from "../document/defaults";
import { commitImmediate } from "../store/history/historyActions";
import CanvasLayer from "./CanvasLayer";
import ConnectionLayer from "./ConnectionLayer";
import PanelLayer from "./PanelLayer";
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
  const activeTool = useUiStore((state) => state.activeTool);
  const drawingPoints = useUiStore((state) => state.drawingPoints);
  const gridStyle = useUiStore((state) => state.gridStyle);
  const focusRequestId = useUiStore((state) => state.focusRequestId);
  const clearFocusRequest = useUiStore((state) => state.clearFocusRequest);
  const setViewport = useUiStore((state) => state.setViewport);
  const [isDraggingOver, setIsDraggingOver] = useState<"file" | "shape" | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Прокрутка холста к элементу по заявке из поиска или списка аварий.
  // Центрирование считается здесь, потому что только холст знает свои
  // экранные размеры.
  useEffect(() => {
    if (!focusRequestId) return;
    const svg = svgRef.current;
    const element = useDocumentStore
      .getState()
      .document.elements.find((el) => el.id === focusRequestId);
    if (!svg || !element) {
      clearFocusRequest();
      return;
    }

    const rect = svg.getBoundingClientRect();
    const { zoom } = useUiStore.getState().viewport;
    setViewport({
      panX: rect.width / 2 - (element.x + element.width / 2) * zoom,
      panY: rect.height / 2 - (element.y + element.height / 2) * zoom,
    });
    clearFocusRequest();
  }, [focusRequestId, clearFocusRequest, setViewport]);

  // Перетаскивание извне: файл изображения из проводника или фигура из
  // палитры. Это HTML5 drag-and-drop — отдельная от указательных жестов
  // useCanvasInteraction система событий, конфликта между ними нет.
  const handleDragOver = (event: DragEvent<SVGSVGElement>) => {
    const types = event.dataTransfer.types;
    if (types.includes(SHAPE_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDraggingOver("shape");
    } else if (types.includes("Files")) {
      event.preventDefault();
      setIsDraggingOver("file");
    }
  };

  const handleDragLeave = () => setIsDraggingOver(null);

  const handleDrop = async (event: DragEvent<SVGSVGElement>) => {
    setIsDraggingOver(null);

    const rect = event.currentTarget.getBoundingClientRect();

    const droppedKind = event.dataTransfer.getData(SHAPE_DRAG_MIME) as ShapeKind | "";
    if (droppedKind && SHAPE_REGISTRY[droppedKind]) {
      event.preventDefault();
      const point = screenToDocumentPoint(event.clientX, event.clientY, rect, viewport);
      const definition = SHAPE_REGISTRY[droppedKind]!;
      const count = useDocumentStore.getState().document.elements.length;
      // Курсор ставится в центр фигуры, а не в её левый верхний угол —
      // иначе элемент «прыгает» вниз-вправо относительно места сброса
      const element = createShapeElement(
        droppedKind,
        {
          x: point.x - definition.defaultSize.width / 2,
          y: point.y - definition.defaultSize.height / 2,
        },
        count,
      );
      if (element) {
        commitImmediate(() => useDocumentStore.getState().addElement(element));
        useUiStore.getState().select(element.id);
      }
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    event.preventDefault();

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
        ref={svgRef}
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
          cursor: isSpaceDown
            ? "grab"
            : activeTool === "draw"
              ? "crosshair"
              : "default",
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
          <GridBackground
            gridSize={gridSize}
            width={canvasSize.width}
            height={canvasSize.height}
            style={gridStyle}
            zoom={viewport.zoom}
          />
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
          <PanelLayer />
          <SelectionOverlay
            onResizeHandlePointerDown={handleResizeHandlePointerDown}
            onRotateHandlePointerDown={handleRotateHandlePointerDown}
          />
          {/* Живой предпросмотр мазка кисти */}
          {drawingPoints && drawingPoints.length >= 2 && (
            <polyline
              points={drawingPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-dashed border-blue-400 bg-blue-500/5 flex items-center justify-center">
          <span className="text-sm text-blue-300">
            {isDraggingOver === "shape"
              ? "Отпустите, чтобы разместить элемент"
              : "Отпустите, чтобы добавить изображение"}
          </span>
        </div>
      )}
      <ContextMenu />
    </div>
  );
};

export default EditorCanvas;
