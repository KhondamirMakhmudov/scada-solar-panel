import { memo, useMemo } from "react";
import { useRouter } from "next/router";
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
 * no drag/select/context-menu affordances. If the element has
 * `navigateToScreenId`, clicking it drills down into that screen's runtime
 * view (overview screen → unit detail).
 */
const RuntimeElement = memo(({ elementId }: RuntimeElementProps) => {
  const router = useRouter();
  const element = useDocumentStore((state) =>
    state.document.elements.find((el) => el.id === elementId),
  );
  const live = useElementLiveValue(element?.dataBinding?.tagId);

  const displayElement = useMemo(
    () => (element ? applyLiveValueToElement(element, live) : element),
    [element, live],
  );

  if (!element || !displayElement) return null;

  const targetScreenId = element.navigateToScreenId;

  const shape = <ShapeRenderer element={displayElement} />;

  return (
    <>
      {targetScreenId ? (
        <g
          onClick={() => router.push(`/dashboard/screens/${targetScreenId}/runtime`)}
          style={{ cursor: "pointer" }}
        >
          <title>Перейти к экрану</title>
          {shape}
        </g>
      ) : (
        shape
      )}
      <LiveValueLabel element={element} />
    </>
  );
});

RuntimeElement.displayName = "RuntimeElement";

export default RuntimeElement;
