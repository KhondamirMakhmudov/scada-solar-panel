import { memo, useMemo } from "react";
import type { MouseEventHandler, PointerEventHandler } from "react";
import ShapeRenderer from "../shapes/ShapeRenderer";
import StatusDot from "../shapes/base/StatusDot";
import { useDocumentStore } from "../store/documentStore";
import { useRuntimeStore } from "../store/runtimeStore";
import { useElementLiveValue } from "../runtime/useElementLiveValue";
import { applyLiveValueToElement, deriveLiveStatus } from "../runtime/resolveVisual";
import ConnectionAnchors from "./ConnectionAnchors";
import type { ConnectionHandle } from "../types";

interface ElementInstanceProps {
  elementId: string;
  onElementPointerDown: (id: string) => PointerEventHandler<SVGGElement>;
  onElementContextMenu: (id: string) => MouseEventHandler<SVGGElement>;
  onAnchorPointerDown: (id: string, handle: ConnectionHandle) => PointerEventHandler<SVGElement>;
}

/**
 * The only component reading both documentStore (the element's static
 * definition) and runtimeStore (its live tag value, via
 * useElementLiveValue's narrow per-tag selector) — two independent
 * subscriptions, so a tag tick re-renders only shapes bound to that tag,
 * and a document edit re-renders only the element that changed (see
 * documentStore comment: `updateElement` keeps unrelated object
 * references stable). React.memo is a second guard against parent
 * (CanvasLayer) re-renders cascading down.
 */
const ElementInstance = memo(
  ({ elementId, onElementPointerDown, onElementContextMenu, onAnchorPointerDown }: ElementInstanceProps) => {
    const element = useDocumentStore((state) =>
      state.document.elements.find((el) => el.id === elementId),
    );
    const live = useElementLiveValue(element?.dataBinding?.tagId);
    const connectionStatus = useRuntimeStore((state) => state.connectionStatus);

    const displayElement = useMemo(
      () => (element ? applyLiveValueToElement(element, live) : element),
      [element, live],
    );
    const liveStatus = useMemo(
      () => (element ? deriveLiveStatus(element, live, connectionStatus) : null),
      [element, live, connectionStatus],
    );

    if (!element || !displayElement) return null;

    return (
      <>
        <ShapeRenderer
          element={displayElement}
          onPointerDown={onElementPointerDown(elementId)}
          onContextMenu={onElementContextMenu(elementId)}
        />
        {liveStatus && <StatusDot cx={element.x + 8} cy={element.y - 2} status={liveStatus} />}
        <ConnectionAnchors element={element} onAnchorPointerDown={onAnchorPointerDown} />
        {/* Значок «переход по клику»: показывает, что у элемента настроена
            ссылка на другой экран; клик по значку открывает целевой экран
            в отдельной вкладке просмотра */}
        {element.navigateToScreenId && (
          <g
            transform={`translate(${element.x + element.width - 2}, ${element.y - 8})`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              window.open(
                `/dashboard/screens/${element.navigateToScreenId}/runtime`,
                "scada_runtime_preview",
              );
            }}
            style={{ cursor: "pointer" }}
          >
            <title>Переход по клику настроен — открыть целевой экран</title>
            <circle cx={0} cy={0} r={9} fill="#1d4ed8" stroke="#93c5fd" strokeWidth={1} />
            <text x={0} y={3.5} textAnchor="middle" fontSize={10} fill="#e0f2fe">
              ↗
            </text>
          </g>
        )}
      </>
    );
  },
);

ElementInstance.displayName = "ElementInstance";

export default ElementInstance;
