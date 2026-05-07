import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertSelection(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  if (entry.intent.type !== "SELECT_NODE") return null;
  const prevNodeId =
    prevState.selection.kind === "node" ? prevState.selection.id : null;
  return { type: "SELECT_NODE", nodeId: prevNodeId };
}
