import type { ReactNode } from "react";
import { SHAPE_REGISTRY } from "../shapes/registry";
import type { MnemonicElement, ShapeKind, ShapeState } from "../types";

/**
 * Значения состояния, выключающие анимацию в превью: двадцать одновременно
 * крутящихся насосов в палитре отвлекают от выбора, а на статичном силуэте
 * фигура читается лучше.
 */
const STATIC_STATE: ShapeState = {
  running: false,
  generating: false,
  flowing: false,
  charging: false,
  blinking: false,
};

/**
 * Кинды, для которых настоящий компонент фигуры не годится как иконка:
 * `chart` тянет исторические данные через useTagTrend (палитра не должна
 * инициировать сетевые запросы), а у остальных «пустое» состояние — это
 * заглушка с текстом, нечитаемым в масштабе иконки.
 */
const GLYPHS: Partial<Record<ShapeKind, ReactNode>> = {
  chart: (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={1} y={1} width={22} height={18} rx={2} opacity={0.5} />
      <path d="M4 14.5l4.5-5 3.5 3 6-7.5" />
      <path d="M4 17.5h16" opacity={0.4} />
    </g>
  ),
  text: (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <path d="M4 5h16" />
      <path d="M12 5v13" />
      <path d="M8.5 18h7" />
    </g>
  ),
  image: (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <rect x={2} y={3.5} width={20} height={16} rx={2} />
      <circle cx={8} cy={9} r={1.8} />
      <path d="M3 17l5.5-5 4.5 4 3.5-3 5 4.5" />
    </g>
  ),
  building: (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M3 20V8.5L12 3l9 5.5V20" />
      <path d="M3 20h18" />
      <rect x={9.5} y={13} width={5} height={7} />
      <path d="M7 10.5h2M15 10.5h2" strokeLinecap="round" />
    </g>
  ),
};

interface ShapeThumbnailProps {
  kind: ShapeKind;
  /** Сторона квадратной иконки в пикселях */
  size?: number;
}

/**
 * Иконка элемента палитры. Для технологического оборудования рисуется тем же
 * компонентом, что и на холсте, — оператор видит ровно ту фигуру, которую
 * получит после размещения, и иконки не расходятся с реальными фигурами при
 * их доработке. Для остальных кindов используется штриховой глиф (см. GLYPHS).
 */
const ShapeThumbnail = ({ kind, size = 26 }: ShapeThumbnailProps) => {
  const glyph = GLYPHS[kind];
  if (glyph) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        {glyph}
      </svg>
    );
  }

  const definition = SHAPE_REGISTRY[kind];
  if (!definition) return <svg width={size} height={size} aria-hidden="true" />;

  const { Component, defaultSize, defaultStyle, defaultState } = definition;

  // Фигуры рисуются в локальных координатах 0..width/0..height, но некоторые
  // (например патрубки насоса) выходят за рамку на несколько пикселей —
  // запас в viewBox не даёт их обрезать.
  const padding = 8;
  const preview: MnemonicElement = {
    id: `thumb-${kind}`,
    type: kind,
    layerId: "thumb",
    x: 0,
    y: 0,
    width: defaultSize.width,
    height: defaultSize.height,
    rotation: 0,
    zIndex: 0,
    style: defaultStyle,
    state: { ...defaultState, ...STATIC_STATE },
    // Подпись намеренно не передаётся: имя элемента и так стоит рядом с иконкой
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-padding} ${-padding} ${defaultSize.width + padding * 2} ${defaultSize.height + padding * 2}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <Component element={preview} />
    </svg>
  );
};

export default ShapeThumbnail;
