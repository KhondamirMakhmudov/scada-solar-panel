import { useMemo } from "react";
import type { PointerEventHandler } from "react";
import type { Connection, MnemonicElement } from "../types";
import { getElementAnchorPoint } from "../lib/geometry";
import { computeOrthogonalPath } from "../lib/routing";
import type { Rect } from "../lib/routing";
import { useElementLiveValue } from "../runtime/useElementLiveValue";
import { useRuntimeStore } from "../store/runtimeStore";
import { deriveLiveStatus } from "../runtime/resolveVisual";

interface ConnectionLineProps {
  connection: Connection;
  source: MnemonicElement;
  target: MnemonicElement;
  obstacles: Rect[];
  isSelected: boolean;
  interactive: boolean;
  onPointerDown?: PointerEventHandler<SVGElement>;
}

/**
 * One connector's route + "energized" state — split out from ConnectionLayer
 * so each connection can subscribe to its own two endpoints' live values
 * (hooks can't run inside the parent's .map() callback). A link is
 * "energized" when both endpoints resolve to an "ok" live status (see
 * resolveVisual.deriveLiveStatus, the same logic driving Requirement 4's
 * status dot) — fully automatic, no manual override/schema field.
 */
const ConnectionLine = ({
  connection,
  source,
  target,
  obstacles,
  isSelected,
  interactive,
  onPointerDown,
}: ConnectionLineProps) => {
  const sourceLive = useElementLiveValue(source.dataBinding?.tagId);
  const targetLive = useElementLiveValue(target.dataBinding?.tagId);
  const connectionStatus = useRuntimeStore((state) => state.connectionStatus);

  const energized =
    deriveLiveStatus(source, sourceLive, connectionStatus) === "ok" &&
    deriveLiveStatus(target, targetLive, connectionStatus) === "ok";

  const points = useMemo(() => {
    const p1 = getElementAnchorPoint(source, connection.source.handle);
    const p2 = getElementAnchorPoint(target, connection.target.handle);
    return computeOrthogonalPath(
      { point: p1, handle: connection.source.handle },
      { point: p2, handle: connection.target.handle },
      obstacles,
    );
  }, [source, target, connection.source.handle, connection.target.handle, obstacles]);

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const stroke = isSelected ? "#38bdf8" : energized ? "#38bdf8" : connection.style?.stroke || "#64748b";
  const strokeWidth = isSelected ? 4 : connection.style?.strokeWidth || 3;
  const showFlowAnimation = energized && !isSelected;

  return (
    <polyline
      points={pointsAttr}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={connection.style?.dashed ? "6 4" : showFlowAnimation ? "8 6" : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={interactive ? { cursor: "pointer" } : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
    >
      {showFlowAnimation && (
        <animate attributeName="stroke-dashoffset" values="14;0" dur="0.6s" repeatCount="indefinite" />
      )}
    </polyline>
  );
};

export default ConnectionLine;
