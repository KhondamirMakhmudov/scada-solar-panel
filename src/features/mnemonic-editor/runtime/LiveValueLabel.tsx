import type { MnemonicElement } from "../types";
import type { TagValue } from "../store/runtimeStore";

interface LiveValueLabelProps {
  element: MnemonicElement;
  live: TagValue | undefined;
}

const MAX_CHARS = 28;

/** SVG <text> doesn't wrap like HTML — long diagnostic error messages must be truncated or they run off-screen in one line. Full text is still available via the native <title> hover tooltip. */
function truncate(text: string, max = MAX_CHARS): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Small readout under a bound shape: raw tag value + unit, "ожидание..." while no frame has arrived yet, or the error message if the tag is in an error state. */
const LiveValueLabel = ({ element, live }: LiveValueLabelProps) => {
  if (!element.dataBinding?.tagId) return null;

  const x = element.x + element.width / 2;
  const y = element.y + element.height + 26;

  if (!live) {
    return (
      <text x={x} y={y} textAnchor="middle" fontSize={10} fill="#64748b">
        ожидание...
      </text>
    );
  }

  if (live.isError) {
    const fullMessage = live.errorMessage || "ошибка";
    return (
      <text x={x} y={y} textAnchor="middle" fontSize={10} fill="#f87171">
        <title>{fullMessage}</title>
        {truncate(fullMessage)}
      </text>
    );
  }

  const valueText = `${live.value ?? "—"}${live.unit ? ` ${live.unit}` : ""}`;
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#e2e8f0">
      <title>{valueText}</title>
      {truncate(valueText)}
    </text>
  );
};

export default LiveValueLabel;
