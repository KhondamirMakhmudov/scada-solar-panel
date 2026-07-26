import { SegmentedControl } from "@/components/ui";

const OPTIONS = [
  { value: "chart", label: "График" },
  { value: "table", label: "Таблица" },
];

/**
 * Переключатель «график / таблица» для страницы архива и модального окна
 * архива на мнемосхеме.
 *
 * Оставлен отдельным компонентом, хотя и сводится к SegmentedControl: набор
 * режимов один и тот же в обоих местах, и держать его здесь надёжнее, чем
 * дублировать массив OPTIONS по вызывающим сторонам.
 */
const ViewModeToggle = ({ value, onChange }) => (
  <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />
);

export default ViewModeToggle;
