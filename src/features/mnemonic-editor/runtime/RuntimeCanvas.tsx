import { useMemo } from "react";
import { useDocumentStore } from "../store/documentStore";
import RuntimeElement from "./RuntimeElement";
import ConnectionLayer from "../canvas/ConnectionLayer";
import { computeContentViewBox } from "../lib/geometry";

/** Frames the actual content's bounding box (not the full declared canvas — see computeContentViewBox) so the same diagram fits any kiosk monitor size at a readable scale — read-only, no viewport UI needed. */
const RuntimeCanvas = () => {
  const canvasSize = useDocumentStore((state) => state.document.canvasSize);
  const background = useDocumentStore((state) => state.document.background);
  const layers = useDocumentStore((state) => state.document.layers);
  const elements = useDocumentStore((state) => state.document.elements);

  const viewBox = useMemo(
    () => computeContentViewBox(elements, canvasSize),
    [elements, canvasSize],
  );

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ background: background.color }}
    >
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
    </svg>
  );
};

export default RuntimeCanvas;
