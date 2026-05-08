import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertSelection(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  if (
    entry.intent.type !== "SELECT_NODE" &&
    entry.intent.type !== "SELECT_NODES"
  ) {
    return null;
  }
  const prev = prevState.selection;
  if (prev.kind === "multi") {
    return { type: "SELECT_NODES", ids: [...prev.ids] };
  }
  const prevNodeId = prev.kind === "node" ? prev.id : null;
  return { type: "SELECT_NODE", nodeId: prevNodeId };
}
