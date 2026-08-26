interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlignmentSnapResult {
  x: number;
  y: number;
  verticalGuides: number[];
  horizontalGuides: number[];
}

/** left/center/right (or top/center/bottom) edges of a rect — the three candidates every design tool snaps to. */
function edgesX(rect: Rect): number[] {
  return [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
}
function edgesY(rect: Rect): number[] {
  return [rect.y, rect.y + rect.height / 2, rect.y + rect.height];
}

/**
 * Figma/PowerPoint-style smart guides: snaps a dragged rect's edges/center
 * to the nearest matching edge/center of any other element (plus the canvas
 * bounds, treated as one more comparison rect) within `threshold` document
 * units, independently per axis. Returns the snapped position and the exact
 * coordinates that matched, for AlignmentGuides to draw as lines — a pure
 * function so the drag handler and any future test can call it without
 * touching React or the stores.
 */
export function computeAlignmentSnap(
  dragged: Rect,
  others: Rect[],
  canvas: { width: number; height: number },
  threshold: number,
): AlignmentSnapResult {
  const comparisonRects = [...others, { x: 0, y: 0, width: canvas.width, height: canvas.height }];

  let bestDx: number | null = null;
  let bestDxAbs = Infinity;
  let bestDy: number | null = null;
  let bestDyAbs = Infinity;

  const draggedEdgesX = edgesX(dragged);
  const draggedEdgesY = edgesY(dragged);

  for (const rect of comparisonRects) {
    for (const de of draggedEdgesX) {
      for (const oe of edgesX(rect)) {
        const diff = oe - de;
        const abs = Math.abs(diff);
        if (abs <= threshold && abs < bestDxAbs) {
          bestDxAbs = abs;
          bestDx = diff;
        }
      }
    }
    for (const de of draggedEdgesY) {
      for (const oe of edgesY(rect)) {
        const diff = oe - de;
        const abs = Math.abs(diff);
        if (abs <= threshold && abs < bestDyAbs) {
          bestDyAbs = abs;
          bestDy = diff;
        }
      }
    }
  }

  const x = bestDx !== null ? dragged.x + bestDx : dragged.x;
  const y = bestDy !== null ? dragged.y + bestDy : dragged.y;

  // Re-derive which coordinates actually coincide at the snapped position —
  // there can be more than one (e.g. two other elements sharing that same
  // aligned edge), and this stays exact even though bestDx only tracked the
  // single closest match while searching.
  const verticalGuides = new Set<number>();
  const horizontalGuides = new Set<number>();

  if (bestDx !== null) {
    for (const de of edgesX({ ...dragged, x })) {
      for (const rect of comparisonRects) {
        for (const oe of edgesX(rect)) {
          if (Math.abs(oe - de) < 0.5) verticalGuides.add(Math.round(oe));
        }
      }
    }
  }
  if (bestDy !== null) {
    for (const de of edgesY({ ...dragged, y })) {
      for (const rect of comparisonRects) {
        for (const oe of edgesY(rect)) {
          if (Math.abs(oe - de) < 0.5) horizontalGuides.add(Math.round(oe));
        }
      }
    }
  }

  return { x, y, verticalGuides: [...verticalGuides], horizontalGuides: [...horizontalGuides] };
}
