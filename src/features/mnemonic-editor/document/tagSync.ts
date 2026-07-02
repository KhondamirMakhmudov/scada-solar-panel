import type { MnemonicDocument } from "../types";

function deriveBoundTagIds(document: MnemonicDocument): string[] {
  return Array.from(
    new Set(
      document.elements
        .map((el) => el.dataBinding?.tagId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

/**
 * The screen's `tagIds` drives the backend's `ws/screens/{id}` fan-out, so
 * any tag bound to a shape must be present there or it'll never receive live
 * data. Per product decision, saving the diagram only ADDS newly-bound tags
 * — it never drops tags set elsewhere (e.g. the Screens list page's own tag
 * picker).
 */
export function mergeTagIds(existingTagIds: string[], document: MnemonicDocument): string[] {
  return Array.from(new Set([...existingTagIds, ...deriveBoundTagIds(document)]));
}
