import type { Intent } from "./types/intent";
import type { AppState } from "./types/state";

export type ClickModifier = "none" | "shift" | "toggle";

/**
 * Resolve a click on a block into the next selection intent.
 *
 * - "none": single select the clicked id.
 * - "toggle" (Cmd/Ctrl): add/remove the clicked id from the current set.
 * - "shift": select the inclusive range between the existing anchor and the
 *   clicked id, scoped to siblings of the clicked block's parent. If the
 *   anchor is not a sibling, fall back to single select.
 *
 * Multi-selection is restricted to **blocks** for now — clicks on screens or
 * agent nodes always reduce to a single SELECT_NODE.
 */
export function resolveClickSelection(
  state: AppState,
  clickedId: string,
  modifier: ClickModifier,
): Intent {
  // Non-block clicks: keep simple single-select semantics.
  if (!(clickedId in state.blocks)) {
    return { type: "SELECT_NODE", nodeId: clickedId };
  }

  const sel = state.selection;

  if (modifier === "toggle") {
    const current = currentIds(sel);
    const next = current.includes(clickedId)
      ? current.filter((id) => id !== clickedId)
      : [...current, clickedId];
    return { type: "SELECT_NODES", ids: next };
  }

  if (modifier === "shift") {
    const anchor = anchorOf(sel);
    if (!anchor || anchor === clickedId) {
      return { type: "SELECT_NODE", nodeId: clickedId };
    }
    const block = state.blocks[clickedId];
    const parentId = block?.parentId;
    if (!parentId) return { type: "SELECT_NODE", nodeId: clickedId };
    const siblings = state.children[parentId] ?? [];
    const a = siblings.indexOf(anchor);
    const b = siblings.indexOf(clickedId);
    if (a === -1 || b === -1) {
      // Anchor not a sibling — degrade gracefully.
      return { type: "SELECT_NODE", nodeId: clickedId };
    }
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const ids = siblings.slice(lo, hi + 1);
    return { type: "SELECT_NODES", ids };
  }

  return { type: "SELECT_NODE", nodeId: clickedId };
}

function currentIds(selection: AppState["selection"]): string[] {
  if (selection.kind === "node") return [selection.id];
  if (selection.kind === "multi") return [...selection.ids];
  return [];
}

function anchorOf(selection: AppState["selection"]): string | null {
  if (selection.kind === "node") return selection.id;
  if (selection.kind === "multi" && selection.ids.length > 0) {
    return selection.ids[0];
  }
  return null;
}
