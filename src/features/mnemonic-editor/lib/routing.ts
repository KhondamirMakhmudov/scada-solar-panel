import type { ConnectionHandle } from "../types";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Endpoint {
  point: Point;
  handle: ConnectionHandle;
}

const STUB = 20;
const OBSTACLE_MARGIN = 6;
// Offsets tried (in order) for the shared bend channel when the direct route
// crosses an obstacle — 0 first (the "natural" route), then alternating
// steps outward. Not a grid pathfinder: a fixed, cheap retry budget that
// covers typical sparse mnemonic layouts.
const OFFSET_STEPS = [0, 20, -20, 40, -40, 60, -60];

function stubDirection(handle: ConnectionHandle): Point {
  switch (handle) {
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
  }
}

function isHorizontal(handle: ConnectionHandle): boolean {
  return handle === "left" || handle === "right";
}

function rectFromSegment(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x) - OBSTACLE_MARGIN;
  const y = Math.min(a.y, b.y) - OBSTACLE_MARGIN;
  return {
    x,
    y,
    width: Math.abs(a.x - b.x) + OBSTACLE_MARGIN * 2,
    height: Math.abs(a.y - b.y) + OBSTACLE_MARGIN * 2,
  };
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function pathIntersectsObstacles(points: Point[], obstacles: Rect[]): boolean {
  for (let i = 0; i < points.length - 1; i += 1) {
    const segmentRect = rectFromSegment(points[i], points[i + 1]);
    if (obstacles.some((obstacle) => rectsIntersect(segmentRect, obstacle))) return true;
  }
  return false;
}

function buildCandidate(
  sourcePoint: Point,
  sourceStub: Point,
  sourceHorizontal: boolean,
  targetPoint: Point,
  targetStub: Point,
  targetHorizontal: boolean,
  offset: number,
): Point[] {
  if (sourceHorizontal === targetHorizontal) {
    if (sourceHorizontal) {
      // Both stubs exit left/right — bend on a shared vertical mid-channel.
      const midX = (sourceStub.x + targetStub.x) / 2 + offset;
      return [
        sourcePoint,
        sourceStub,
        { x: midX, y: sourceStub.y },
        { x: midX, y: targetStub.y },
        targetStub,
        targetPoint,
      ];
    }
    // Both stubs exit top/bottom — bend on a shared horizontal mid-channel.
    const midY = (sourceStub.y + targetStub.y) / 2 + offset;
    return [
      sourcePoint,
      sourceStub,
      { x: sourceStub.x, y: midY },
      { x: targetStub.x, y: midY },
      targetStub,
      targetPoint,
    ];
  }

  // Mixed orientation (one horizontal, one vertical stub) — a single corner
  // at the intersection of the two stub lines, nudged by offset.
  if (sourceHorizontal) {
    const corner: Point = { x: targetStub.x, y: sourceStub.y + offset };
    return [sourcePoint, sourceStub, corner, targetStub, targetPoint];
  }
  const corner: Point = { x: sourceStub.x + offset, y: targetStub.y };
  return [sourcePoint, sourceStub, corner, targetStub, targetPoint];
}

/**
 * Heuristic stub-and-bend orthogonal router — not a grid/A* pathfinder (see
 * plan doc): each end stubs straight out ~20px perpendicular to its port
 * (so the line always leaves/enters a shape edge at 90°, matching WinCC
 * convention), then a shared mid-channel bend connects the two stubs with at
 * most 2 turns. If that route crosses an obstacle rect, retries the channel
 * offset in fixed steps and takes the first clear candidate; if none clears
 * within the retry budget, falls back to the original (offset 0) route —
 * best-effort, can rarely still clip one obstacle in a dense cluster.
 */
export function computeOrthogonalPath(source: Endpoint, target: Endpoint, obstacles: Rect[] = []): Point[] {
  const sourceDir = stubDirection(source.handle);
  const targetDir = stubDirection(target.handle);
  const sourceStub: Point = {
    x: source.point.x + sourceDir.x * STUB,
    y: source.point.y + sourceDir.y * STUB,
  };
  const targetStub: Point = {
    x: target.point.x + targetDir.x * STUB,
    y: target.point.y + targetDir.y * STUB,
  };
  const sourceHorizontal = isHorizontal(source.handle);
  const targetHorizontal = isHorizontal(target.handle);

  let fallback: Point[] | null = null;

  for (const offset of OFFSET_STEPS) {
    const candidate = buildCandidate(
      source.point,
      sourceStub,
      sourceHorizontal,
      target.point,
      targetStub,
      targetHorizontal,
      offset,
    );
    if (!fallback) fallback = candidate;
    if (!pathIntersectsObstacles(candidate, obstacles)) return candidate;
  }

  return fallback ?? [source.point, target.point];
}
