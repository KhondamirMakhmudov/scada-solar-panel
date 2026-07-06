/** Библиотека простых фигур (как панель «Фигуры» в Paint): каждая фигура —
 * SVG-path, параметризованный шириной/высотой рамки элемента. Один ShapeKind
 * "basicShape", конкретная фигура выбирается через state.variant. */

export type BasicShapeVariant =
  | "line"
  | "curve"
  | "rectangle"
  | "roundedRect"
  | "ellipse"
  | "triangle"
  | "rightTriangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "arrowRight"
  | "arrowLeft"
  | "arrowUp"
  | "arrowDown"
  | "star4"
  | "star5"
  | "speech";

export const BASIC_SHAPE_VARIANTS: { variant: BasicShapeVariant; label: string }[] = [
  { variant: "line", label: "Линия" },
  { variant: "curve", label: "Кривая" },
  { variant: "rectangle", label: "Прямоугольник" },
  { variant: "roundedRect", label: "Скруглённый прямоугольник" },
  { variant: "ellipse", label: "Овал" },
  { variant: "triangle", label: "Треугольник" },
  { variant: "rightTriangle", label: "Прямоугольный треугольник" },
  { variant: "diamond", label: "Ромб" },
  { variant: "pentagon", label: "Пятиугольник" },
  { variant: "hexagon", label: "Шестиугольник" },
  { variant: "arrowRight", label: "Стрелка вправо" },
  { variant: "arrowLeft", label: "Стрелка влево" },
  { variant: "arrowUp", label: "Стрелка вверх" },
  { variant: "arrowDown", label: "Стрелка вниз" },
  { variant: "star4", label: "Звезда (4 луча)" },
  { variant: "star5", label: "Звезда (5 лучей)" },
  { variant: "speech", label: "Выноска (речь)" },
];

const polygonPath = (points: [number, number][]): string =>
  points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ") + " Z";

/** Точки правильного многоугольника/звезды, вписанного в рамку w×h */
const radialPoints = (
  w: number,
  h: number,
  count: number,
  innerRatio: number | null,
  startAngle = -Math.PI / 2,
): [number, number][] => {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const total = innerRatio === null ? count : count * 2;
  const points: [number, number][] = [];
  for (let i = 0; i < total; i += 1) {
    const angle = startAngle + (i * 2 * Math.PI) / total;
    const ratio = innerRatio !== null && i % 2 === 1 ? innerRatio : 1;
    points.push([cx + rx * ratio * Math.cos(angle), cy + ry * ratio * Math.sin(angle)]);
  }
  return points;
};

export function basicShapePath(variant: BasicShapeVariant, w: number, h: number): string {
  switch (variant) {
    case "line":
      return `M 0 ${h} L ${w} 0`;
    case "curve":
      return `M 0 ${h * 0.85} C ${w * 0.3} ${-h * 0.35}, ${w * 0.7} ${h * 1.35}, ${w} ${h * 0.15}`;
    case "rectangle":
      return `M 0 0 H ${w} V ${h} H 0 Z`;
    case "roundedRect": {
      const r = Math.min(w, h) * 0.2;
      return `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
    }
    case "ellipse":
      return `M 0 ${h / 2} a ${w / 2} ${h / 2} 0 1 0 ${w} 0 a ${w / 2} ${h / 2} 0 1 0 ${-w} 0 Z`;
    case "triangle":
      return polygonPath([[w / 2, 0], [w, h], [0, h]]);
    case "rightTriangle":
      return polygonPath([[0, 0], [0, h], [w, h]]);
    case "diamond":
      return polygonPath([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
    case "pentagon":
      return polygonPath(radialPoints(w, h, 5, null));
    case "hexagon":
      return polygonPath(radialPoints(w, h, 6, null, 0));
    case "arrowRight":
      return polygonPath([
        [0, h * 0.3], [w * 0.6, h * 0.3], [w * 0.6, 0], [w, h * 0.5],
        [w * 0.6, h], [w * 0.6, h * 0.7], [0, h * 0.7],
      ]);
    case "arrowLeft":
      return polygonPath([
        [w, h * 0.3], [w * 0.4, h * 0.3], [w * 0.4, 0], [0, h * 0.5],
        [w * 0.4, h], [w * 0.4, h * 0.7], [w, h * 0.7],
      ]);
    case "arrowUp":
      return polygonPath([
        [w * 0.3, h], [w * 0.3, h * 0.4], [0, h * 0.4], [w * 0.5, 0],
        [w, h * 0.4], [w * 0.7, h * 0.4], [w * 0.7, h],
      ]);
    case "arrowDown":
      return polygonPath([
        [w * 0.3, 0], [w * 0.3, h * 0.6], [0, h * 0.6], [w * 0.5, h],
        [w, h * 0.6], [w * 0.7, h * 0.6], [w * 0.7, 0],
      ]);
    case "star4":
      return polygonPath(radialPoints(w, h, 4, 0.35));
    case "star5":
      return polygonPath(radialPoints(w, h, 5, 0.45));
    case "speech": {
      const r = Math.min(w, h) * 0.18;
      const bodyH = h * 0.72;
      return (
        `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${bodyH - r} Q ${w} ${bodyH} ${w - r} ${bodyH} ` +
        `H ${w * 0.4} L ${w * 0.22} ${h} L ${w * 0.26} ${bodyH} H ${r} Q 0 ${bodyH} 0 ${bodyH - r} V ${r} Q 0 0 ${r} 0 Z`
      );
    }
    default:
      return `M 0 0 H ${w} V ${h} H 0 Z`;
  }
}

/** Фигуры-линии не замыкаются и не заливаются */
export const isOpenVariant = (variant: BasicShapeVariant): boolean =>
  variant === "line" || variant === "curve";
