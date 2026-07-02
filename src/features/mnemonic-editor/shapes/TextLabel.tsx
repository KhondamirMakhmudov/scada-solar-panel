import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

/** Standalone text — a freeform annotation/title placed anywhere on the canvas, independent of any equipment shape's own label (which always renders below the shape). */
const TextLabel = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state } = element;
  const text = typeof state?.text === "string" && state.text ? state.text : "Текст";
  const fontSize = Number(state?.fontSize ?? 16);

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
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      <text
        x={0}
        y={height / 2}
        dominantBaseline="middle"
        fontSize={fontSize}
        fill={style.stroke}
        style={{ userSelect: "none" }}
      >
        {text}
      </text>
    </ParametrizedShape>
  );
};

export default TextLabel;
