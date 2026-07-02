import { memo, useMemo } from "react";
import type { MouseEventHandler, PointerEventHandler } from "react";
import ShapeRenderer from "../shapes/ShapeRenderer";
import { useDocumentStore } from "../store/documentStore";
import { useElementLiveValue } from "../runtime/useElementLiveValue";
import { applyLiveValueToElement } from "../runtime/resolveVisual";
import LiveValueLabel from "../runtime/LiveValueLabel";
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

    const displayElement = useMemo(
      () => (element ? applyLiveValueToElement(element, live) : element),
      [element, live],
    );

    if (!element || !displayElement) return null;

    return (
      <>
        <ShapeRenderer
          element={displayElement}
          onPointerDown={onElementPointerDown(elementId)}
          onContextMenu={onElementContextMenu(elementId)}
        />
        <LiveValueLabel element={element} live={live} />
        <ConnectionAnchors element={element} onAnchorPointerDown={onAnchorPointerDown} />
      </>
    );
  },
);

ElementInstance.displayName = "ElementInstance";

export default ElementInstance;
