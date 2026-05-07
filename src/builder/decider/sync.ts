import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome } from "../types/state";

export function decideSync(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  switch (intent.type) {
    case "PERSIST_SUCCEEDED":
    case "PERSIST_FAILED": {
      if (!(intent.entryId in state.pending)) {
        return { ok: false, reason: "DUPLICATE_ENTRY" };
      }
      return { ok: true };
    }
    case "REMOTE_INTENT_RECEIVED": {
      if (state.appliedEntries.includes(intent.entry.id)) {
        return { ok: false, reason: "DUPLICATE_ENTRY" };
      }
      return { ok: true };
    }
    default:
      return null;
  }
}
