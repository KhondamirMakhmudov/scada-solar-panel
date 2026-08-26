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
  const baseWidth = connection.style?.strokeWidth || 5;
  const strokeWidth = isSelected ? baseWidth + 2 : baseWidth;
  const showFlowAnimation = energized && !isSelected;

  // "Бусины" пропорциональны толщине линии — сегмент чуть длиннее ширины,
  // разрыв чуть короче, round linecap скругляет каждую бусину в капсулу.
  const beadDash = `${strokeWidth * 1.5} ${strokeWidth * 1.1}`;
  const dashLength = strokeWidth * 2.6;

  return (
    <g>
      {/* Мягкое свечение под основной линией — только в рабочем режиме, чтобы
          не превращать выделение/аварию/остановленное состояние в лишний шум */}
      {showFlowAnimation && (
        <polyline
          points={pointsAttr}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth * 2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.18}
          pointerEvents="none"
        />
      )}

      <polyline
        points={pointsAttr}
        fill="none"
        stroke={connection.style?.dashed || faulted || !energized ? stroke : "#1e293b"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={faulted ? 0.35 : 1}
        style={interactive ? { cursor: "pointer" } : undefined}
        onPointerDown={interactive ? onPointerDown : undefined}
      />

      {/* Бегущие бусины поверх базовой линии — направление потока читается
          по движению, а не только по стрелкам, ближе к референсу WinCC */}
      <polyline
        points={pointsAttr}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={connection.style?.dashed ? "6 4" : beadDash}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={interactive ? { cursor: "pointer" } : undefined}
        onPointerDown={interactive ? onPointerDown : undefined}
      >
        {showFlowAnimation && (
          <animate attributeName="stroke-dashoffset" values={`${dashLength};0`} dur="0.7s" repeatCount="indefinite" />
        )}
        {faulted && !isSelected && (
          <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
        )}
      </polyline>

      {arrows.map((arrow, index) => (
        <polygon
          key={index}
          points={`${ARROW_HALF_LENGTH},0 ${-ARROW_HALF_LENGTH},${-ARROW_HALF_WIDTH} ${-ARROW_HALF_LENGTH},${ARROW_HALF_WIDTH}`}
          transform={`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.angle})`}
          fill={stroke}
          opacity={0.75}
          pointerEvents="none"
        />
      ))}

      {/* Узловые точки на концах связи — как в референсе WinCC: маленький
          кружок там, где провод входит в оборудование или в другой провод */}
      {points.length > 0 && (
        <>
          <circle cx={points[0].x} cy={points[0].y} r={Math.max(3, strokeWidth * 0.7)} fill="#0f172a" stroke={stroke} strokeWidth={1.5} pointerEvents="none" />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={Math.max(3, strokeWidth * 0.7)}
            fill="#0f172a"
            stroke={stroke}
            strokeWidth={1.5}
            pointerEvents="none"
          />
        </>
      )}
    </g>
  );
};

export default ConnectionLine;
