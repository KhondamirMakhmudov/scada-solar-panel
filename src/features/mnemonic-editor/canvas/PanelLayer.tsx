import { useMemo } from "react";
import { useDocumentStore } from "../store/documentStore";
import { computePanelSlots } from "../lib/panelLayout";
import PanelInstance from "../runtime/PanelInstance";

/**
 * Single shared layer rendering every element's data panel together — unlike
 * shapes/connections (one per element/connection, self-positioned), panels
 * need cross-element awareness to avoid overlapping each other or unrelated
 * nodes (see lib/panelLayout.computePanelSlots), so they're laid out here in
 * one pass instead of inside each ElementInstance/RuntimeElement. Rendered
 * last (after all shape layers) in both EditorCanvas and RuntimeCanvas so
 * panels sit visually on top.
 */
const PanelLayer = () => {
  const elements = useDocumentStore((state) => state.document.elements);
  const slots = useMemo(() => computePanelSlots(elements), [elements]);

  return (
    <g>
      {elements.map((element) => (
        <PanelInstance key={element.id} element={element} slot={slots.get(element.id)} />
      ))}
    </g>
  );
};

export default PanelLayer;
