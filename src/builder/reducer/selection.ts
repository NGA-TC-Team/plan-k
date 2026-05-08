import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

function nodeExists(state: AppState, id: string): boolean {
  return id in state.blocks || id in state.screens || id in state.agentNodes;
}

export function applySelection(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  if (entry.intent.type === "SELECT_NODE") {
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
  if (entry.intent.type === "SELECT_NODES") {
    const ids = entry.intent.ids.filter((id) => nodeExists(state, id));
    let next: AppState["selection"];
    if (ids.length === 0) next = { kind: "none" };
    else if (ids.length === 1) next = { kind: "node", id: ids[0] };
    else next = { kind: "multi", ids };
    return { state: { ...state, selection: next }, commands: [] };
  }
  return null;
}
