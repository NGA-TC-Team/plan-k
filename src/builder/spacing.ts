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

export const SpacingFragment = z.object({
  spacing: z
    .object({
      padding: SpacingPresetSchema.optional(),
      marginTop: SpacingPresetSchema.optional(),
      marginBottom: SpacingPresetSchema.optional(),
    })
    .partial()
    .optional(),
});
export type SpacingValue = z.infer<typeof SpacingFragment>["spacing"];

export type SpacingDefaults = {
  padding: SpacingPreset;
  marginTop: SpacingPreset;
  marginBottom: SpacingPreset;
};

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
 * Resolve the override → defaults pair into Tailwind utility classes.
 * Uses `??` so explicit `"none"` overrides win over defaults.
 */
export function resolveSpacingClass(
  override: SpacingValue,
  defaults: SpacingDefaults,
): string {
  const padding = override?.padding ?? defaults.padding;
  const mt = override?.marginTop ?? defaults.marginTop;
  const mb = override?.marginBottom ?? defaults.marginBottom;
  return [PADDING_CLASS[padding], MARGIN_TOP_CLASS[mt], MARGIN_BOTTOM_CLASS[mb]]
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
  // Docs blocks mostly carry their own card-style padding inside the renderer
  // (callout, code-block, link-card, decision, persona, …) so the outer
  // padding stays at "none" — overrides set rhythm via marginTop/marginBottom.
  heading: { padding: "none", marginTop: "lg", marginBottom: "sm" },
  paragraph: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  blockquote: { padding: "sm", marginTop: "sm", marginBottom: "sm" },
  callout: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  "code-block": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  "bullet-list": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  "numbered-list": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  checklist: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  table: { padding: "none", marginTop: "md", marginBottom: "md" },
  rule: { padding: "none", marginTop: "md", marginBottom: "md" },
  figure: { padding: "none", marginTop: "md", marginBottom: "md" },
  "link-card": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  definition: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  decision: { padding: "none", marginTop: "md", marginBottom: "md" },
  persona: { padding: "none", marginTop: "md", marginBottom: "md" },
  "user-story": { padding: "none", marginTop: "md", marginBottom: "md" },
  risk: { padding: "none", marginTop: "md", marginBottom: "md" },
  metric: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  // P7 docs additions
  milestone: { padding: "none", marginTop: "sm", marginBottom: "sm" },
  "release-note": { padding: "none", marginTop: "md", marginBottom: "md" },
  "color-swatch": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  "journey-step": { padding: "none", marginTop: "sm", marginBottom: "sm" },
  "api-endpoint": { padding: "none", marginTop: "md", marginBottom: "md" },
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
