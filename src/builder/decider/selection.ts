import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome } from "../types/state";

export function decideSelection(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  if (intent.type === "SELECT_NODE") {
    if (intent.nodeId === null) return { ok: true };
    if (!nodeExists(state, intent.nodeId)) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    return { ok: true };
  }
  if (intent.type === "SELECT_NODES") {
    // Tolerate stale ids by filtering them in the reducer; only reject if
    // every id is unknown.
    if (intent.ids.length === 0) return { ok: true };
    const anyExists = intent.ids.some((id) => nodeExists(state, id));
    if (!anyExists) return { ok: false, reason: "NOT_FOUND" };
    return { ok: true };
  }
  return null;
}

function nodeExists(state: AppState, id: string): boolean {
  return (
    id in state.blocks ||
    id in state.screens ||
    id in state.agentNodes ||
    id in state.sections
  );
}
