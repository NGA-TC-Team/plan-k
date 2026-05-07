import { isStrictlyGreater } from "../lamport";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome, EntityMeta } from "../types/state";

export function decideAgent(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_AGENT_NODE": {
      const stale = lwwReject(state.entityMeta[intent.node.id], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "DELETE_AGENT_NODE": {
      if (!(intent.nodeId in state.agentNodes)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      return { ok: true };
    }
    case "CONNECT_AGENT_NODES": {
      if (!(intent.edge.from in state.agentNodes)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (!(intent.edge.to in state.agentNodes)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      const stale = lwwReject(state.entityMeta[intent.edge.id], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "DISCONNECT_AGENT_NODES": {
      if (!(intent.edgeId in state.agentEdges)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      return { ok: true };
    }
    default:
      return null;
  }
}

function lwwReject(
  existing: EntityMeta | undefined,
  entry: IntentLogEntry,
): DecideOutcome | null {
  if (!existing) return null;
  const incoming = { lamport: entry.lamport, origin: entry.origin };
  if (isStrictlyGreater(incoming, existing)) return null;
  return { ok: false, reason: "STALE_LAMPORT" };
}
