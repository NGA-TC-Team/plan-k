import type { CSSProperties } from "react";
import { z } from "zod";
import type { BlockKind } from "./types/entity";

/**
 * Discrete spacing presets shared across every app-context block.
 * Stored in `BlockEntity.data.spacing` as an optional override; the manifest
 * provides the design-tuned default per kind.
 */
export const SPACING_PRESETS = ["none", "sm", "md", "lg", "xl"] as const;
export type SpacingPreset = (typeof SPACING_PRESETS)[number];

export const SpacingPresetSchema = z.enum(SPACING_PRESETS);

/**
 * A spacing field can be either a preset token ("none"|"sm"|"md"|"lg"|"xl")
 * or a raw integer px value (0–512). undefined means "inherit / use default".
 */
export const SpacingFieldSchema = z.union([
  SpacingPresetSchema,
  z.number().int().min(0).max(512),
]);
export type SpacingField = z.infer<typeof SpacingFieldSchema>;

/**
 * 4-side spacing value shape. New data uses the 4-side keys.
 * @deprecated `padding` / `marginTop` / `marginBottom` are kept as optional
 *   for read-compatibility with existing persisted blocks; `migrateLegacySpacing`
 *   expands them to the 4-side keys on write.
 */
export const SpacingValueSchema = z
  .object({
    // ── New 4-side keys ───────────────────────────────────────────────────────
    paddingTop: SpacingFieldSchema.optional(),
    paddingRight: SpacingFieldSchema.optional(),
    paddingBottom: SpacingFieldSchema.optional(),
    paddingLeft: SpacingFieldSchema.optional(),
    marginTop: SpacingFieldSchema.optional(),
    marginRight: SpacingFieldSchema.optional(),
    marginBottom: SpacingFieldSchema.optional(),
    marginLeft: SpacingFieldSchema.optional(),
    // ── Deprecated single-axis keys (read-compat) ─────────────────────────────
    /** @deprecated use paddingTop/Right/Bottom/Left */
    padding: SpacingPresetSchema.optional(),
  })
  .partial()
  .optional();

export type SpacingValue = z.infer<typeof SpacingValueSchema>;

export const SpacingFragment = z.object({
  spacing: SpacingValueSchema,
});

export type SpacingDefaults = {
  padding: SpacingPreset;
  marginTop: SpacingPreset;
  marginBottom: SpacingPreset;
};

// ── Preset → px mapping (authoritative for resolveSpacingPx) ─────────────────
const PRESET_PX: Record<SpacingPreset, number> = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
};

/**
 * Resolve a SpacingField to a pixel integer.
 * - Token → mapped px (none=0, sm=4, md=8, lg=16, xl=24)
 * - Number → as-is
 * - undefined → undefined
 */
export function resolveSpacingPx(field?: SpacingField): number | undefined {
  if (field === undefined) return undefined;
  if (typeof field === "number") return field;
  return PRESET_PX[field];
}

/**
 * Migrate a legacy SpacingValue that may have the old `padding` (shorthand)
 * key to the canonical 4-side representation.
 *
 * Rules:
 * - If new 4-side keys are already present, they take precedence over `padding`.
 * - `padding` shorthand → spread to all 4 padding sides (only fills sides not yet set).
 * - `marginTop` / `marginBottom` are already 4-side compatible; left/right stay undefined.
 * - Drops the `padding` shorthand key from the output.
 */
export function migrateLegacySpacing(value?: SpacingValue): SpacingValue {
  if (!value) return undefined;

  const {
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
  } = value;

  // Spread the legacy `padding` shorthand only for sides not yet explicitly set.
  const resolvedPaddingTop = paddingTop ?? padding;
  const resolvedPaddingRight = paddingRight ?? padding;
  const resolvedPaddingBottom = paddingBottom ?? padding;
  const resolvedPaddingLeft = paddingLeft ?? padding;

  const next: NonNullable<SpacingValue> = {};

  // Only include keys that have a defined value (avoid sparse keys in stored JSON).
  if (resolvedPaddingTop !== undefined) next.paddingTop = resolvedPaddingTop;
  if (resolvedPaddingRight !== undefined)
    next.paddingRight = resolvedPaddingRight;
  if (resolvedPaddingBottom !== undefined)
    next.paddingBottom = resolvedPaddingBottom;
  if (resolvedPaddingLeft !== undefined) next.paddingLeft = resolvedPaddingLeft;
  if (marginTop !== undefined) next.marginTop = marginTop;
  if (marginRight !== undefined) next.marginRight = marginRight;
  if (marginBottom !== undefined) next.marginBottom = marginBottom;
  if (marginLeft !== undefined) next.marginLeft = marginLeft;

  // Return undefined if nothing survived migration.
  if (Object.keys(next).length === 0) return undefined;
  return next;
}

/**
 * Resolve spacing override + defaults into an inline CSSProperties object.
 * Each of the 8 sides maps to its px value. A side with no override and no
 * legacy `padding` shorthand inherits from the defaults (padding-4-sides
 * come from `defaults.padding`; marginLeft/Right not in defaults → 0).
 *
 * Use this for new rendering paths; `resolveSpacingClass` remains for
 * legacy call sites not yet migrated.
 */
export function resolveSpacingStyle(
  override: SpacingValue,
  defaults: SpacingDefaults,
): CSSProperties {
  // First migrate any legacy shorthand so we work with 4-side keys only.
  const migrated = migrateLegacySpacing(override);

  const defaultPaddingPx = PRESET_PX[defaults.padding];
  const defaultMarginTopPx = PRESET_PX[defaults.marginTop];
  const defaultMarginBottomPx = PRESET_PX[defaults.marginBottom];

  const pt = resolveSpacingPx(migrated?.paddingTop) ?? defaultPaddingPx;
  const pr = resolveSpacingPx(migrated?.paddingRight) ?? defaultPaddingPx;
  const pb = resolveSpacingPx(migrated?.paddingBottom) ?? defaultPaddingPx;
  const pl = resolveSpacingPx(migrated?.paddingLeft) ?? defaultPaddingPx;
  const mt = resolveSpacingPx(migrated?.marginTop) ?? defaultMarginTopPx;
  const mr = resolveSpacingPx(migrated?.marginRight) ?? 0;
  const mb = resolveSpacingPx(migrated?.marginBottom) ?? defaultMarginBottomPx;
  const ml = resolveSpacingPx(migrated?.marginLeft) ?? 0;

  return {
    paddingTop: pt,
    paddingRight: pr,
    paddingBottom: pb,
    paddingLeft: pl,
    marginTop: mt,
    marginRight: mr,
    marginBottom: mb,
    marginLeft: ml,
  };
}

// ── Legacy Tailwind class helpers (kept for existing call sites) ───────────────

const PADDING_CLASS: Record<SpacingPreset, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
  xl: "p-12",
};

const MARGIN_TOP_CLASS: Record<SpacingPreset, string> = {
  none: "mt-0",
  sm: "mt-2",
  md: "mt-4",
  lg: "mt-6",
  xl: "mt-10",
};

const MARGIN_BOTTOM_CLASS: Record<SpacingPreset, string> = {
  none: "mb-0",
  sm: "mb-2",
  md: "mb-4",
  lg: "mb-6",
  xl: "mb-10",
};

export const SPACING_PRESET_LABEL: Record<SpacingPreset, string> = {
  none: "None",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
};

/**
 * @deprecated Use `resolveSpacingStyle` for new rendering paths.
 * Resolve the override → defaults pair into Tailwind utility classes.
 * Uses `??` so explicit `"none"` overrides win over defaults.
 */
export function resolveSpacingClass(
  override: SpacingValue,
  defaults: SpacingDefaults,
): string {
  // Support legacy `padding` shorthand — fall back to defaults when not set.
  const padding = override?.padding ?? override?.paddingTop ?? defaults.padding;
  const mt =
    (override?.marginTop as SpacingPreset | undefined) ?? defaults.marginTop;
  const mb =
    (override?.marginBottom as SpacingPreset | undefined) ??
    defaults.marginBottom;

  // For class resolution we need a SpacingPreset string; if user set a raw
  // number we can't map it to a Tailwind class, so fall back to defaults.
  const paddingPreset = (SPACING_PRESETS as readonly string[]).includes(
    padding as string,
  )
    ? (padding as SpacingPreset)
    : defaults.padding;
  const mtPreset = (SPACING_PRESETS as readonly string[]).includes(mt as string)
    ? (mt as SpacingPreset)
    : defaults.marginTop;
  const mbPreset = (SPACING_PRESETS as readonly string[]).includes(mb as string)
    ? (mb as SpacingPreset)
    : defaults.marginBottom;

  return [
    PADDING_CLASS[paddingPreset],
    MARGIN_TOP_CLASS[mtPreset],
    MARGIN_BOTTOM_CLASS[mbPreset],
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Fallback design defaults used when a manifest doesn't declare its own.
 * Tuned for the most common block: a content container with breathing room.
 */
export const FALLBACK_SPACING_DEFAULTS: SpacingDefaults = {
  padding: "md",
  marginTop: "sm",
  marginBottom: "sm",
};

/** Per-kind design defaults. Anything not listed falls back to FALLBACK above. */
export const SPACING_DEFAULTS_BY_KIND: Partial<
  Record<BlockKind, SpacingDefaults>
> = {
  hero: { padding: "xl", marginTop: "none", marginBottom: "lg" },
  "cta-section": { padding: "xl", marginTop: "none", marginBottom: "lg" },
  "page-header": { padding: "lg", marginTop: "none", marginBottom: "md" },
  "card-grid": { padding: "md", marginTop: "md", marginBottom: "md" },
  list: { padding: "md", marginTop: "md", marginBottom: "md" },
  form: { padding: "md", marginTop: "md", marginBottom: "md" },
  nav: { padding: "md", marginTop: "md", marginBottom: "md" },
  tabs: { padding: "md", marginTop: "md", marginBottom: "md" },
  modal: { padding: "lg", marginTop: "none", marginBottom: "none" },
  sheet: { padding: "lg", marginTop: "none", marginBottom: "none" },
  banner: { padding: "md", marginTop: "sm", marginBottom: "sm" },
  "empty-state": { padding: "md", marginTop: "sm", marginBottom: "sm" },
  button: { padding: "sm", marginTop: "sm", marginBottom: "sm" },
  badge: { padding: "sm", marginTop: "sm", marginBottom: "sm" },
  avatar: { padding: "sm", marginTop: "sm", marginBottom: "sm" },
  stat: { padding: "sm", marginTop: "sm", marginBottom: "sm" },
  input: { padding: "sm", marginTop: "sm", marginBottom: "sm" },
  divider: { padding: "none", marginTop: "none", marginBottom: "none" },
  "status-bar": { padding: "none", marginTop: "none", marginBottom: "none" },
  "bottom-nav": { padding: "none", marginTop: "none", marginBottom: "none" },
  "list-row": { padding: "sm", marginTop: "none", marginBottom: "none" },
  fab: { padding: "none", marginTop: "none", marginBottom: "none" },
  image: { padding: "md", marginTop: "md", marginBottom: "md" },
  footer: { padding: "md", marginTop: "md", marginBottom: "md" },
  sidebar: { padding: "md", marginTop: "md", marginBottom: "md" },
  text: { padding: "sm", marginTop: "sm", marginBottom: "sm" },
  // ── docs context ──
  heading: { padding: "none", marginTop: "lg", marginBottom: "sm" },
  paragraph: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  blockquote: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  callout: { padding: "none", marginTop: "md", marginBottom: "md" },
  "code-block": { padding: "none", marginTop: "md", marginBottom: "md" },
  "bullet-list": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  "numbered-list": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  checklist: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  table: { padding: "none", marginTop: "lg", marginBottom: "lg" },
  rule: { padding: "none", marginTop: "md", marginBottom: "md" },
  figure: { padding: "none", marginTop: "md", marginBottom: "md" },
  "link-card": { padding: "none", marginTop: "md", marginBottom: "md" },
  definition: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  decision: { padding: "none", marginTop: "lg", marginBottom: "lg" },
  persona: { padding: "none", marginTop: "lg", marginBottom: "lg" },
  "user-story": { padding: "none", marginTop: "lg", marginBottom: "lg" },
  risk: { padding: "none", marginTop: "lg", marginBottom: "lg" },
  metric: { padding: "none", marginTop: "lg", marginBottom: "lg" },
  // P7 docs additions
  milestone: { padding: "none", marginTop: "lg", marginBottom: "lg" },
  "release-note": { padding: "none", marginTop: "lg", marginBottom: "lg" },
  "color-swatch": { padding: "none", marginTop: "lg", marginBottom: "lg" },
  "journey-step": { padding: "none", marginTop: "lg", marginBottom: "lg" },
  "api-endpoint": { padding: "none", marginTop: "lg", marginBottom: "lg" },
};

export function spacingDefaultsFor(kind: BlockKind): SpacingDefaults {
  return SPACING_DEFAULTS_BY_KIND[kind] ?? FALLBACK_SPACING_DEFAULTS;
}

export function spacingFromBlockData(
  data: Record<string, unknown>,
): SpacingValue {
  const raw = (data as { spacing?: unknown }).spacing;
  if (!raw || typeof raw !== "object") return undefined;
  return raw as SpacingValue;
}
