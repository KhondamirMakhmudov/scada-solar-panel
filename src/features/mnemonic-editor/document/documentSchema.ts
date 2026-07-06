import { z } from "zod";

const SHAPE_KINDS = [
  "pump",
  "valve",
  "tank",
  "pipe",
  "motor",
  "sensor",
  "lamp",
  "gauge",
  "breaker",
  "switch",
  "transformer",
  "solarPanel",
  "inverter",
  "battery",
  "grid",
  "meter",
  "image",
  "text",
  "building",
  "freehand",
  "basicShape",
] as const;

const elementStyleSchema = z.object({
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number(),
  opacity: z.number(),
  labelFontSize: z.number().optional(),
});

const dataBindingSchema = z.object({
  tagId: z.string(),
  tagName: z.string().nullable().optional(),
});

const animationRuleSchema = z.object({
  id: z.string(),
  operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]),
  threshold: z.number(),
  setStyle: elementStyleSchema.partial().optional(),
  setState: z.record(z.string(), z.unknown()).optional(),
  blink: z.boolean().optional(),
});

const elementSchema = z.object({
  id: z.string(),
  type: z.enum(SHAPE_KINDS),
  layerId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  zIndex: z.number(),
  style: elementStyleSchema,
  state: z.record(z.string(), z.unknown()),
  label: z.string().optional(),
  dataBinding: dataBindingSchema.nullable().optional(),
  extraBindings: z.array(dataBindingSchema).nullable().optional(),
  animationRules: z.array(animationRuleSchema).optional(),
  navigateToScreenId: z.string().nullable().optional(),
});

const connectionAnchorSchema = z.object({
  elementId: z.string(),
  handle: z.enum(["left", "right", "top", "bottom"]),
});

const connectionSchema = z.object({
  id: z.string(),
  source: connectionAnchorSchema,
  target: connectionAnchorSchema,
  style: z
    .object({
      stroke: z.string(),
      strokeWidth: z.number(),
      dashed: z.boolean().optional(),
    })
    .optional(),
});

const layerSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean(),
  locked: z.boolean(),
  zIndex: z.number(),
});

export const documentSchema = z.object({
  gridSize: z.number(),
  canvasSize: z.object({ width: z.number(), height: z.number() }),
  background: z.object({
    color: z.string(),
    imageUrl: z.string().nullable().optional(),
  }),
  layers: z.array(layerSchema),
  elements: z.array(elementSchema),
  connections: z.array(connectionSchema),
});

export const mnemonicParamsSchema = z.object({
  version: z.literal(1),
  document: documentSchema,
  updatedAt: z.string(),
});

/** Safely parses `params.mnemonic`; returns null if missing or invalid so the caller can fall back to a blank document. */
export function parseMnemonicParams(raw: unknown) {
  const result = mnemonicParamsSchema.safeParse(raw);
  return result.success ? result.data : null;
}
