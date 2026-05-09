import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockKind } from "@/builder/types/entity";

export type SuggestedKind = {
  kind: BlockKind;
  label: string;
  /** One-line English description shown under the label in the quick-start card. */
  description: string;
  shortcut?: string;
  /** Lucide icon name — resolved to the LucideIcon component in the card UI. */
  icon: BlockKind;
};

// ── per-kind description copy ──────────────────────────────────────────────────
// Stored inline; localizable extraction is a separate phase.

const DESCRIPTIONS: Partial<Record<BlockKind, string>> = {
  // docs
  heading: "Start with a title or section header",
  paragraph: "Add free-form prose or a brief summary",
  figure: "Embed an image with a caption",
  decision: "Record an architectural decision (ADR)",
  persona: "Define a user persona with goals and pains",
  metric: "Track a KPI or success metric",
  // app
  hero: "Full-width banner with headline and CTA",
  "card-grid": "Responsive grid of content cards",
  form: "Input form with labelled fields",
  nav: "Top navigation bar with links",
  image: "Standalone image block",
  "page-header": "Screen title with breadcrumbs and actions",
};

// ── curated kind lists (registry-order preserved) ──────────────────────────────
// Selection rule: group priority then KIND_ORDER position.
// Docs: Prose first (heading, paragraph) → Media (figure) → Spec (decision, persona, metric)
// App:  Content first (hero, card-grid, text, image) → Navigation (nav) → Input (form)
// No registry mutation; purely derived via filter + slice.

const DOCS_KINDS: BlockKind[] = [
  "heading",
  "paragraph",
  "figure",
  "decision",
  "persona",
  "metric",
];

const APP_KINDS: BlockKind[] = [
  "hero",
  "card-grid",
  "form",
  "nav",
  "image",
  "page-header",
];

// ── registry validation set (lazily built once) ────────────────────────────────
let _registryKindSet: Set<BlockKind> | null = null;

function registryKindSet(): Set<BlockKind> {
  if (_registryKindSet === null) {
    _registryKindSet = new Set(BLOCK_KIND_REGISTRY.map((s) => s.kind));
  }
  return _registryKindSet;
}

function buildSuggested(kinds: BlockKind[]): SuggestedKind[] {
  const set = registryKindSet();
  return kinds
    .filter((k) => set.has(k))
    .map((kind) => {
      const spec = BLOCK_KIND_REGISTRY.find((s) => s.kind === kind);
      return {
        kind,
        label: spec?.label ?? kind,
        description: DESCRIPTIONS[kind] ?? "",
        shortcut: spec?.shortcut,
        icon: kind,
      };
    });
}

// ── public API ─────────────────────────────────────────────────────────────────

/**
 * Returns 4–6 curated SuggestedKind entries for the given builder context.
 * Derived entirely from BLOCK_KIND_REGISTRY — no registry modifications.
 */
export function getSuggestedKinds(
  context: "docs" | "app" | "agent",
): SuggestedKind[] {
  switch (context) {
    case "docs":
      return buildSuggested(DOCS_KINDS);
    case "app":
      return buildSuggested(APP_KINDS);
    case "agent":
      // agent is out of scope for PR-C; return empty so callers can guard.
      return [];
  }
}
