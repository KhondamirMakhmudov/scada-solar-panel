import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useDocumentStore } from "../store/documentStore";
import RuntimeElement from "./RuntimeElement";
import ConnectionLayer from "../canvas/ConnectionLayer";
import PanelLayer from "../canvas/PanelLayer";
import { clampZoom, computeContentViewBox, zoomAtPoint } from "../lib/geometry";
import { computePanelSlots } from "../lib/panelLayout";

interface RuntimeViewport {
  zoom: number;
  panX: number;
  panY: number;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.2;

/** Fits `box` centered inside a `width`×`height` container — the same "meet" framing the old viewBox approach gave for free, computed explicitly now that zoom/pan are real interactive state instead of a static viewBox. */
function fitViewport(box: { x: number; y: number; width: number; height: number }, width: number, height: number): RuntimeViewport {
  if (width <= 0 || height <= 0 || box.width <= 0 || box.height <= 0) {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  const zoom = Math.min(width / box.width, height / box.height);
  const panX = width / 2 - (box.x + box.width / 2) * zoom;
  const panY = height / 2 - (box.y + box.height / 2) * zoom;
  return { zoom, panX, panY };
}

/**
 * Operator pan/zoom for the live view — mouse wheel zooms at the cursor
 * (same feel as the editor canvas), click-drag pans, and the corner control
 * can always snap back to "fit whole diagram" on demand. Previously this
 * just picked a static `viewBox` sized to the content and let SVG's
 * `preserveAspectRatio` scale it to fit — correct for "always show
 * everything" kiosk mode, but gave an operator no way to zoom in on one
 * area of a large plant or zoom out past the default framing.
 */
const RuntimeCanvas = () => {
  const canvasSize = useDocumentStore((state) => state.document.canvasSize);
  const background = useDocumentStore((state) => state.document.background);
  const layers = useDocumentStore((state) => state.document.layers);
  const elements = useDocumentStore((state) => state.document.elements);

  const panelSlots = useMemo(() => computePanelSlots(elements), [elements]);
  const contentBox = useMemo(
    () => computeContentViewBox(elements, canvasSize, panelSlots),
    [elements, canvasSize, panelSlots],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<RuntimeViewport>({ zoom: 1, panX: 0, panY: 0 });
  // True once the operator has manually zoomed/panned — after that, a
  // container resize (e.g. rotating a kiosk monitor) no longer silently
  // yanks their chosen view back to "fit".
  const dirtyRef = useRef(false);

  const fitToContent = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setViewport(fitViewport(contentBox, rect.width, rect.height));
    dirtyRef.current = false;
  }, [contentBox]);

  // Initial fit, and re-fit whenever a *different* screen's content loads
  // (contentBox is referentially stable while viewing one screen — runtime
  // mode never mutates document.elements — so this doesn't fight the
  // operator's own zoom/pan on every render).
  useEffect(() => {
    fitToContent();
  }, [fitToContent]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (!dirtyRef.current) fitToContent();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToContent]);

  const handleWheel = useCallback((event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    setViewport((current) => {
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const nextZoom = clampZoom(current.zoom + delta, MIN_ZOOM, MAX_ZOOM);
      return zoomAtPoint(current, nextZoom, screenX, screenY);
    });
    dirtyRef.current = true;
  }, []);

  const dragRef = useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number; moved: boolean } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      dragRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        moved: false,
      };
    },
    [viewport.panX, viewport.panY],
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) > 3) {
      drag.moved = true;
      setIsPanning(true);
    }
    if (drag.moved) {
      setViewport((current) => ({ ...current, panX: drag.startPanX + dx, panY: drag.startPanY + dy }));
      dirtyRef.current = true;
    }
  }, []);

  const endPan = useCallback(() => {
    dragRef.current = null;
    setIsPanning(false);
  }, []);

  const stepZoom = useCallback((direction: 1 | -1) => {
    setViewport((current) => ({ ...current, zoom: clampZoom(current.zoom + direction * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM) }));
    dirtyRef.current = true;
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <svg
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        style={{ background: background.color, cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
      >
        <g transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}>
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
          <ConnectionLayer interactive={false} />
          {layers.map((layer) => {
            if (!layer.visible) return null;
            const ids = elements.filter((el) => el.layerId === layer.id).map((el) => el.id);
            return (
              <g key={layer.id} data-layer-id={layer.id}>
                {ids.map((id) => (
                  <RuntimeElement key={id} elementId={id} />
                ))}
              </g>
            );
          })}
          <PanelLayer />
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-[2px] border border-surface-border bg-surface-dark/90 backdrop-blur px-1 py-1 pointer-events-auto">
        <button
          type="button"
          onClick={() => stepZoom(-1)}
          title="Уменьшить"
          className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:bg-background-dark hover:text-text-primary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
        >
          −
        </button>
        <button
          type="button"
          onClick={fitToContent}
          title="По размеру экрана"
          className="w-14 h-7 rounded text-[13px] text-text-muted font-ibmPlexMono tabular-nums hover:bg-background-dark hover:text-text-primary transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => stepZoom(1)}
          title="Увеличить"
          className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:bg-background-dark hover:text-text-primary transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default RuntimeCanvas;
