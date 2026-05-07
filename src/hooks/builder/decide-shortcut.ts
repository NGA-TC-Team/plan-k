import type { Intent } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";

export type ShortcutEvent = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  /** True when focus is in an input/textarea/select/contenteditable. */
  isTyping: boolean;
};

/**
 * Pure resolver from a keyboard event + relevant state slice to a builder
 * intent (or null when the shortcut doesn't apply). Extracted from
 * `useBuilderShortcuts` so we can unit-test the decision matrix without
 * mounting a hook or simulating DOM events.
 */
export function decideShortcut(
  e: ShortcutEvent,
  state: Pick<AppState, "editing" | "selection">,
): Intent | null {
  const isMod = !!(e.metaKey || e.ctrlKey);
  const editing = state.editing.kind === "node";

  // Cancel — works even while typing inside the editor's textareas.
  if (e.key === "Escape" && editing) return { type: "CANCEL_EDIT" };

  // Commit with mod+Enter — works while typing.
  if (isMod && e.key === "Enter" && editing) return { type: "COMMIT_EDIT" };

  if (e.isTyping) return null;

  if (isMod && (e.key === "z" || e.key === "Z")) {
    return { type: e.shiftKey ? "REDO" : "UNDO" };
  }
  if (isMod && (e.key === "y" || e.key === "Y")) return { type: "REDO" };

  // Plain Enter while editing commits; while only selected, opens editor.
  if (e.key === "Enter") {
    if (editing) return { type: "COMMIT_EDIT" };
    if (state.selection.kind === "node")
      return { type: "BEGIN_EDIT", nodeId: state.selection.id };
  }

  if (
    (e.key === "Delete" || e.key === "Backspace") &&
    !editing &&
    state.selection.kind === "node"
  ) {
    return { type: "DELETE_BLOCK", nodeId: state.selection.id };
  }

  return null;
}
