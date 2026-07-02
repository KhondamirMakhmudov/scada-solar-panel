import { memo, useMemo } from "react";
import ShapeRenderer from "../shapes/ShapeRenderer";
import { useDocumentStore } from "../store/documentStore";
import { useElementLiveValue } from "./useElementLiveValue";
import { applyLiveValueToElement } from "./resolveVisual";
import LiveValueLabel from "./LiveValueLabel";

interface RuntimeElementProps {
  elementId: string;
}

/**
 * Read-only counterpart to canvas/ElementInstance — same live-value merge,
 * no drag/select/context-menu affordances. Click-to-navigate-to-another-
 * screen is a deferred follow-up (needs a "navigateToScreenId" element
 * property that doesn't exist yet).
 */
const RuntimeElement = memo(({ elementId }: RuntimeElementProps) => {
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
      <ShapeRenderer element={displayElement} />
      <LiveValueLabel element={element} live={live} />
    </>
  );
});

RuntimeElement.displayName = "RuntimeElement";

export default RuntimeElement;
