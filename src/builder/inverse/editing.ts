import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertEditing(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  const { intent } = entry;
  switch (intent.type) {
    case "BEGIN_EDIT":
      return { type: "CANCEL_EDIT" };
    case "CHANGE_DRAFT": {
      if (prevState.editing.kind !== "node") return null;
      return { type: "CHANGE_DRAFT", value: prevState.editing.draft };
    }
    case "CANCEL_EDIT": {
      if (prevState.editing.kind !== "node") return null;
      return { type: "BEGIN_EDIT", nodeId: prevState.editing.id };
    }
    case "COMMIT_EDIT": {
      if (prevState.editing.kind !== "node") return null;
      const editing = prevState.editing;
      const prevData = editing.previousValue as Record<string, unknown>;
      return {
        type: "UPDATE_BLOCK",
        nodeId: editing.id,
        patch: { data: prevData },
      };
    }
    default:
      return null;
  }
}
