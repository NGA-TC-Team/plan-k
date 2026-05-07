import { isStrictlyGreater } from "../lamport";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome } from "../types/state";

export function decideProjects(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  if (intent.type === "UPDATE_PROJECT") {
    if (!(intent.projectId in state.projects)) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    const existing = state.entityMeta[intent.projectId];
    if (existing) {
      const incoming = { lamport: entry.lamport, origin: entry.origin };
      if (!isStrictlyGreater(incoming, existing)) {
        return { ok: false, reason: "STALE_LAMPORT" };
      }
    }
    return { ok: true };
  }
  if (intent.type === "DELETE_PROJECT") {
    if (!(intent.projectId in state.projects)) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    return { ok: true };
  }
  return null;
}
