import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

/** Нарисованная от руки фигура (инструмент «Кисть»). Точки хранятся в
 * state.points нормализованными (0..1 относительно рамки элемента), поэтому
 * фигура масштабируется/вращается как любой другой элемент. Заливку и цвет
 * линии можно менять в панели «Стиль» после рисования. */
const Freehand = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;

  const points = Array.isArray(state?.points)
    ? (state.points as [number, number][])
    : [];

  if (points.length < 2) return null;

  const d = points
    .map(
      ([px, py], i) =>
        `${i === 0 ? "M" : "L"} ${(px * width).toFixed(2)} ${(py * height).toFixed(2)}`,
    )
    .join(" ");

  return (
    <ParametrizedShape
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      {/* Невидимая широкая подложка, чтобы тонкую линию было легко выбрать кликом */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(12, style.strokeWidth * 3)} />
      <path
        d={d}
        fill={style.fill === "none" ? "none" : style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={style.opacity}
      />
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Freehand;
