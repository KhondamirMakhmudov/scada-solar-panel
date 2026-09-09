import { generateId } from "../lib/idGen";
import type { Connection, MnemonicElement } from "../types";

export const DIAGRAM_CLIPBOARD_KIND = "mnemonic-diagram-elements" as const;

/** Shape written to the system clipboard by "Копировать" — see EditorToolbar/EditorPage and documentSchema.diagramClipboardSchema (the read-side validator). */
export function buildDiagramClipboardPayload(elements: MnemonicElement[], connections: Connection[]) {
  return {
    kind: DIAGRAM_CLIPBOARD_KIND,
    version: 1 as const,
    elements,
    connections,
  };
}

const PASTE_OFFSET = 24;

/**
 * Fresh ids for every pasted element (and the connections between them) —
 * pasting the same copied diagram into another screen, or twice into the
 * same one, must never collide with existing ids. A small position offset
 * keeps a same-screen paste visually distinguishable from what's already
 * there instead of landing exactly on top of it. Connections whose endpoint
 * wasn't part of the copied element set are dropped rather than left
 * dangling (shouldn't happen — copy always takes elements+connections
 * together — but this is what protects against a hand-edited clipboard
 * payload).
 */
export function remapDiagramForPaste(
  elements: MnemonicElement[],
  connections: Connection[],
): { elements: MnemonicElement[]; connections: Connection[] } {
  const idMap = new Map(elements.map((el) => [el.id, generateId(el.type)]));

  const nextElements = elements.map((el) => ({
    ...el,
    id: idMap.get(el.id)!,
    x: el.x + PASTE_OFFSET,
    y: el.y + PASTE_OFFSET,
  }));

  const nextConnections = connections
    .filter((c) => idMap.has(c.source.elementId) && idMap.has(c.target.elementId))
    .map((c) => ({
      ...c,
      id: generateId("connection"),
      source: { ...c.source, elementId: idMap.get(c.source.elementId)! },
      target: { ...c.target, elementId: idMap.get(c.target.elementId)! },
    }));

  return { elements: nextElements, connections: nextConnections };
}
