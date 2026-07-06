import ParametrizedShape from "./base/ParametrizedShape";
import type { ShapeComponentProps } from "./base/shapeProps";

/** Industrial building: body with a flat roof parapet, a door and a window grid. Window count adapts to the box the user resizes it to. */
const Building = ({ element, onPointerDown, onContextMenu }: ShapeComponentProps) => {
  const { x, y, width, height, rotation, style, label } = element;

  const roofH = Math.min(14, height * 0.15);
  const bodyY = roofH;
  const bodyH = height - roofH;

  const doorW = Math.min(20, width * 0.18);
  const doorH = Math.min(28, bodyH * 0.4);

  // Сетка окон подстраивается под размер здания
  const cols = Math.max(2, Math.floor(width / 34));
  const rows = Math.max(1, Math.floor((bodyH - doorH) / 30));
  const cellW = width / cols;
  const cellH = (bodyH - doorH - 8) / rows;
  const winW = Math.min(16, cellW * 0.5);
  const winH = Math.min(12, cellH * 0.5);

  const windows: { wx: number; wy: number }[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      windows.push({
        wx: c * cellW + (cellW - winW) / 2,
        wy: bodyY + 8 + r * cellH + (cellH - winH) / 2,
      });
    }
  }

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
      {/* Парапет крыши — чуть шире корпуса */}
      <rect
        x={-2}
        y={0}
        width={width + 4}
        height={roofH}
        fill={style.stroke}
        opacity={style.opacity * 0.85}
        rx={2}
      />
      {/* Корпус */}
      <rect
        x={0}
        y={bodyY}
        width={width}
        height={bodyH}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
      />
      {/* Окна */}
      {windows.map(({ wx, wy }, i) => (
        <rect
          key={i}
          x={wx}
          y={wy}
          width={winW}
          height={winH}
          fill={style.stroke}
          opacity={style.opacity * 0.55}
          rx={1}
        />
      ))}
      {/* Дверь */}
      <rect
        x={(width - doorW) / 2}
        y={bodyY + bodyH - doorH}
        width={doorW}
        height={doorH}
        fill={style.stroke}
        opacity={style.opacity * 0.7}
        rx={2}
      />
      {label && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize={style.labelFontSize ?? 11} fill="#e5e2e1">
          {label}
        </text>
      )}
    </ParametrizedShape>
  );
};

export default Building;
