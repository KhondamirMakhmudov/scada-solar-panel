/**
 * Small color-shading helpers for the "illustrated" shapes (Tank, Pump,
 * Valve, …) — they build a metallic-looking gradient from whatever single
 * fill/stroke color the user picked in the properties panel, rather than
 * hardcoding a fixed palette that would ignore that choice.
 */

/** Neutral pipe/housing metal tone shared by the illustrated shapes (Tank body, Pump housing, Valve fittings) so they read as one consistent material regardless of each shape's own fill/stroke color. */
export const METAL_BASE = "#9aa0ab";

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Blends toward white (amount 0..1). Falls back to the input on an unparseable color. */
export function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(rgb.map((c) => c + (255 - c) * amount) as [number, number, number]);
}

/** Blends toward black (amount 0..1). Falls back to the input on an unparseable color. */
export function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(rgb.map((c) => c * (1 - amount)) as [number, number, number]);
}
