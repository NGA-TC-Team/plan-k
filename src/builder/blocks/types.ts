import type { z } from "zod";
import type {
  BlockContext,
  BlockKind,
  ProjectKind,
} from "@/builder/types/entity";

/**
 * Single-source manifest for a block kind. Aggregates the (label/group/
 * shortcut/platform) listing metadata, the zod schema + defaults, and the
 * three renderer roles (detail / wireframe / editor).
 *
 * The renderer fields hold the resolved component, not a lazy import — this
 * keeps `pickRenderer` synchronous and avoids spinner flashing inside the
 * builder canvas. If a kind needs code splitting later, swap in `lazy()` at
 * the call site.
 */
export type BlockManifest<T = Record<string, unknown>> = {
  context: BlockContext;
  kind: BlockKind;
  label: string;
  group: string;
  /** Single-letter hotkey active inside the insert popover. */
  shortcut?: string;
  /** Mobile-only blocks live under context "app" but are gated by platform. */
  platform?: "mobile";
  /**
   * Zod schema describing the block's `data` shape. Used by editors for
   * validation and by the inspect panel for property introspection.
   */
  schema: z.ZodTypeAny;
  /** Default `data` value injected on INSERT_BLOCK. */
  defaults: T;
  /**
   * One-line readable summary derived from a value — used by the inspect
   * panel header and the parent canvas hover tooltip. Defaults to a shallow
   * stringify when omitted.
   */
  summary?: (value: T) => string;
};

export type ProjectKindList = ProjectKind[];
