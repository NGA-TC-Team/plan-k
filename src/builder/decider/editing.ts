import { isStrictlyGreater } from "../lamport";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome } from "../types/state";

export function decideEditing(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  switch (intent.type) {
    case "BEGIN_EDIT": {
      if (!(intent.nodeId in state.blocks)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (state.editing.kind === "node") {
        const existing = {
          lamport: state.editing.lamport,
          origin: state.editing.origin,
        };
        const incoming = { lamport: entry.lamport, origin: entry.origin };
        if (!isStrictlyGreater(incoming, existing)) {
          return { ok: false, reason: "STALE_LAMPORT" };
        }
      }
      return { ok: true };
    }
    case "CHANGE_DRAFT":
    case "COMMIT_EDIT":
    case "CANCEL_EDIT": {
      if (state.editing.kind !== "node") {
        return { ok: false, reason: "WRONG_MODE" };
      }
      if (state.editing.origin !== entry.origin) {
        return { ok: false, reason: "WRONG_MODE" };
      }
      return { ok: true };
    }
    default:
      return null;
  }
}
