import { isStrictlyGreater } from "../lamport";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome, EntityMeta } from "../types/state";

export function decideScreens(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_SCREEN": {
      const stale = lwwReject(state.entityMeta[intent.screen.id], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "DELETE_SCREEN":
    case "UPDATE_SCREEN": {
      if (!(intent.screenId in state.screens)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      const stale = lwwReject(state.entityMeta[intent.screenId], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "INSERT_SCREEN_EDGE": {
      if (!(intent.edge.from in state.screens)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (!(intent.edge.to in state.screens)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      const stale = lwwReject(state.entityMeta[intent.edge.id], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "DELETE_SCREEN_EDGE": {
      if (!(intent.edgeId in state.screenEdges)) {
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
