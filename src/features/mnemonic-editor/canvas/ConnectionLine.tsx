import { useMemo } from "react";
import type { PointerEventHandler } from "react";
import type { Connection, MnemonicElement } from "../types";
import { getElementAnchorPoint } from "../lib/geometry";
import { computeOrthogonalPath } from "../lib/routing";
import type { Rect } from "../lib/routing";
import { useElementLiveValue } from "../runtime/useElementLiveValue";
import { useRuntimeStore } from "../store/runtimeStore";
import { deriveLiveStatus, LIVE_STATUS_COLORS } from "../runtime/resolveVisual";

interface ConnectionLineProps {
  connection: Connection;
  source: MnemonicElement;
  target: MnemonicElement;
  obstacles: Rect[];
  isSelected: boolean;
  interactive: boolean;
  onPointerDown?: PointerEventHandler<SVGElement>;
}

/** Сегменты короче этого не получают стрелку — она перекрыла бы сам излом трассы. */
const MIN_SEGMENT_FOR_ARROW = 28;
const ARROW_HALF_LENGTH = 5;
const ARROW_HALF_WIDTH = 4;

/**
 * Одна связь: трасса, состояние «под нагрузкой» и указатели направления.
 *
 * Связь «под нагрузкой», когда оба конца в состоянии "ok"
 * (resolveVisual.deriveLiveStatus — та же логика, что и у индикаторов на
 * фигурах), и аварийная, если любой конец в состоянии "fault".
 *
 * Цвета процесса и цвет выделения разведены намеренно: зелёный/красный
 * означают состояние оборудования, синий — что элемент выбран в редакторе, и
 * оператор не примет подсветку выделения за рабочий режим.
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

  const sourceStatus = deriveLiveStatus(source, sourceLive, connectionStatus);
  const targetStatus = deriveLiveStatus(target, targetLive, connectionStatus);

  const faulted = sourceStatus === "fault" || targetStatus === "fault";
  const energized = sourceStatus === "ok" && targetStatus === "ok";

  const points = useMemo(() => {
    const p1 = getElementAnchorPoint(source, connection.source.handle);
    const p2 = getElementAnchorPoint(target, connection.target.handle);
    return computeOrthogonalPath(
      { point: p1, handle: connection.source.handle },
      { point: p2, handle: connection.target.handle },
      obstacles,
    );
  }, [source, target, connection.source.handle, connection.target.handle, obstacles]);

  // Стрелка в середине каждого достаточно длинного сегмента — направление
  // потока читается по всей трассе, а не только у её концов
  const arrows = useMemo(() => {
    if (!energized) return [];
    const result: { x: number; y: number; angle: number }[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.hypot(dx, dy) < MIN_SEGMENT_FOR_ARROW) continue;
      result.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      });
    }
    return result;
  }, [points, energized]);

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const stroke = isSelected
    ? "#38bdf8"
    : faulted
      ? LIVE_STATUS_COLORS.fault
      : energized
        ? LIVE_STATUS_COLORS.ok
        : connection.style?.stroke || "#64748b";
  const strokeWidth = isSelected ? 4 : connection.style?.strokeWidth || 3;
  const showFlowAnimation = energized && !isSelected;

  return (
    <g>
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
      {arrows.map((arrow, index) => (
        <polygon
          key={index}
          points={`${ARROW_HALF_LENGTH},0 ${-ARROW_HALF_LENGTH},${-ARROW_HALF_WIDTH} ${-ARROW_HALF_LENGTH},${ARROW_HALF_WIDTH}`}
          transform={`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.angle})`}
          fill={stroke}
          opacity={0.55}
          pointerEvents="none"
        />
      ))}
    </g>
  );
};

export default ConnectionLine;
