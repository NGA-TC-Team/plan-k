import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export function applySelection(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  if (entry.intent.type !== "SELECT_NODE") return null;
  const { nodeId } = entry.intent;
  return {
    state: {
      ...state,
      selection:
        nodeId === null ? { kind: "none" } : { kind: "node", id: nodeId },
    },
    commands: [],
  };
}
