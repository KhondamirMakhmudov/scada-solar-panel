import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";

const GUIDE_COLOR = "#f472b6";

/**
 * Renders the smart-guide lines computed by useCanvasInteraction's move-drag
 * handler (see lib/alignmentGuides.ts) — full-span dashed lines through
 * every document coordinate the dragged element's edges/center currently
 * align with. Editor-only: not mounted in RuntimeCanvas, and purely visual
 * (the actual snapping already happened before this ever renders).
 */
const AlignmentGuides = () => {
  const guides = useUiStore((state) => state.alignmentGuides);
  const canvasSize = useDocumentStore((state) => state.document.canvasSize);

  if (guides.vertical.length === 0 && guides.horizontal.length === 0) return null;

  return (
    <g pointerEvents="none">
      {guides.vertical.map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasSize.height}
          stroke={GUIDE_COLOR}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      ))}
      {guides.horizontal.map((y) => (
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={canvasSize.width}
          y2={y}
          stroke={GUIDE_COLOR}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      ))}
    </g>
  );
};

export default AlignmentGuides;
