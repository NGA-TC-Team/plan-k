import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome } from "../types/state";

export function decideSelection(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  if (intent.type !== "SELECT_NODE") return null;
  if (intent.nodeId === null) return { ok: true };
  if (!nodeExists(state, intent.nodeId)) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  return { ok: true };
}

function nodeExists(state: AppState, id: string): boolean {
  return id in state.blocks || id in state.screens || id in state.agentNodes;
}
