import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";
import { basicShapePath, isOpenVariant } from "./basicShapes";
import type { BasicShapeVariant } from "./basicShapes";

/** Простая геометрическая фигура (панель «Фигуры»): треугольник, стрелка,
 * звезда и т.д. Конкретная фигура — в state.variant, заливка/обводка — в
 * панели «Стиль». */
const BasicShape = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;

  const variant = (
    typeof state?.variant === "string" ? state.variant : "rectangle"
  ) as BasicShapeVariant;
  const d = basicShapePath(variant, width, height);
  const open = isOpenVariant(variant);

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
      {/* Невидимая подложка для удобного выбора тонких/незалитых фигур */}
      <path
        d={d}
        fill={open ? "none" : "transparent"}
        stroke="transparent"
        strokeWidth={Math.max(12, style.strokeWidth * 3)}
      />
      <path
        d={d}
        fill={open ? "none" : style.fill}
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

export default BasicShape;
