import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

/** A user-uploaded reference image (dropped or picked via the palette), positioned/resized like any other shape. Stretches to fill whatever box the user resizes it to (preserveAspectRatio="none") rather than locking aspect ratio. */
const ImageElement = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, state, label } = element;
  const src = typeof state?.src === "string" ? state.src : "";

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
      {src ? (
        <image href={src} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
      ) : (
        <>
          <rect x={0} y={0} width={width} height={height} fill="#1e293b" stroke="#475569" strokeDasharray="4 4" />
          <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#64748b">
            Нет изображения
          </text>
        </>
      )}
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default ImageElement;
