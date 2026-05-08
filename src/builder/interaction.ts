import { z } from "zod";
import type { BlockKind } from "./types/entity";

/**
 * Per-block interaction record. Stored as `BlockEntity.data.interactions: Interaction[]`
 * — an optional array. Generalises the `button.action` / `fab.action` shape so
 * any app-context block can declare event → action mappings as design metadata.
 *
 * Interactions are **declarative documentation** at this stage: nothing executes
 * them at runtime. They surface in exports and inspector summaries.
 */
export const INTERACTION_EVENTS = [
  "tap",
  "submit",
  "longPress",
  "change",
  "appear",
  "dismiss",
] as const;
export type InteractionEvent = (typeof INTERACTION_EVENTS)[number];

export const INTERACTION_EVENT_LABEL: Record<InteractionEvent, string> = {
  tap: "Tap",
  submit: "Submit",
  longPress: "Long press",
  change: "Change",
  appear: "Appear",
  dismiss: "Dismiss",
};

export const InteractionActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("screen"), screenId: z.string().default("") }),
  z.object({ kind: z.literal("url"), href: z.string().default("") }),
  z.object({ kind: z.literal("modal"), modalBlockId: z.string().default("") }),
  z.object({ kind: z.literal("dismiss") }),
  z.object({ kind: z.literal("custom"), note: z.string().default("") }),
]);
export type InteractionAction = z.infer<typeof InteractionActionSchema>;

export const INTERACTION_ACTION_KINDS = [
  "none",
  "screen",
  "url",
  "modal",
  "dismiss",
  "custom",
] as const;
export type InteractionActionKind = (typeof INTERACTION_ACTION_KINDS)[number];

export const INTERACTION_ACTION_LABEL: Record<InteractionActionKind, string> = {
  none: "Do nothing",
  screen: "Go to screen",
  url: "Open URL",
  modal: "Open modal/sheet",
  dismiss: "Dismiss",
  custom: "Custom (note)",
};

export const InteractionSchema = z.object({
  id: z.string(),
  event: z.enum(INTERACTION_EVENTS),
  action: InteractionActionSchema,
  note: z.string().optional(),
});
export type Interaction = z.infer<typeof InteractionSchema>;

export const InteractionsFragment = z.object({
  interactions: z.array(InteractionSchema).optional(),
});

/** Allowed events per block kind. Empty/missing entry = "tap" only. */
export const ALLOWED_EVENTS_BY_KIND: Partial<
  Record<BlockKind, readonly InteractionEvent[]>
> = {
  button: ["tap"],
  fab: ["tap", "longPress"],
  "card-grid": ["tap"],
  "list-row": ["tap", "longPress"],
  banner: ["tap", "dismiss"],
  "empty-state": ["tap"],
  "cta-section": ["tap"],
  modal: ["appear", "dismiss"],
  sheet: ["appear", "dismiss"],
  form: ["submit"],
  input: ["change"],
  tabs: ["change"],
  nav: ["tap"],
  sidebar: ["tap"],
  "bottom-nav": ["tap"],
  hero: ["tap", "appear"],
  image: ["tap"],
  badge: ["tap"],
  avatar: ["tap"],
  stat: ["tap"],
};

export function allowedEventsFor(kind: BlockKind): readonly InteractionEvent[] {
  return ALLOWED_EVENTS_BY_KIND[kind] ?? ["tap"];
}

export function interactionsFromBlockData(
  data: Record<string, unknown>,
): Interaction[] {
  const raw = (data as { interactions?: unknown }).interactions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((it): it is Interaction => {
    const r = InteractionSchema.safeParse(it);
    return r.success;
  });
}

export function newInteractionId(): string {
  // Short non-cryptographic id; collisions across one block's array are
  // negligible for human-authored lists.
  return `ix_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Read the legacy `button.action` / `fab.action` shape (or anything matching
 * the same schema) and surface it as the first synthetic interaction so the
 * common Interactions panel can edit it without per-kind branches.
 *
 * The adapter writes back **both** shapes when committing — this keeps existing
 * renderers functional while new code consumes `interactions[]`.
 */
export type LegacyButtonAction =
  | { kind: "none" }
  | { kind: "screen"; screenId: string }
  | { kind: "url"; href: string };

export function legacyActionToInteraction(
  action: LegacyButtonAction | undefined,
  event: InteractionEvent = "tap",
): Interaction | null {
  if (!action || action.kind === "none") return null;
  return {
    id: newInteractionId(),
    event,
    action,
  };
}

export function interactionToLegacyAction(
  it: Interaction | undefined,
): LegacyButtonAction {
  if (!it) return { kind: "none" };
  const a = it.action;
  if (a.kind === "screen") return { kind: "screen", screenId: a.screenId };
  if (a.kind === "url") return { kind: "url", href: a.href };
  return { kind: "none" };
}
