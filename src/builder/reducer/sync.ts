import { merge } from "../lamport";
import type { Command, IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export const APPLIED_ENTRIES_LIMIT = 1000;

export function applySync(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  switch (intent.type) {
    case "PERSIST_SUCCEEDED": {
      const nextPending = removeKey(state.pending, intent.entryId);
      return { state: { ...state, pending: nextPending }, commands: [] };
    }

    case "PERSIST_FAILED": {
      const failed = state.pending[intent.entryId];
      const nextPending = removeKey(state.pending, intent.entryId);
      const commands: Command[] = [
        {
          type: "EMIT_TOAST",
          level: "error",
          message: `persist failed: ${intent.reason}`,
        },
      ];
      if (failed?.inverse) {
        commands.push({ type: "DISPATCH_INTENT", intent: failed.inverse });
      }
      return {
        state: {
          ...state,
          pending: nextPending,
          lastError: { reason: intent.reason, at: entry.createdAt },
        },
        commands,
      };
    }

    case "REMOTE_INTENT_RECEIVED": {
      const incomingId = intent.entry.id;
      const appended = [...state.appliedEntries, incomingId];
      const trimmed =
        appended.length > APPLIED_ENTRIES_LIMIT
          ? appended.slice(-APPLIED_ENTRIES_LIMIT)
          : appended;
      return {
        state: {
          ...state,
          lamport: merge(state.lamport, intent.entry.lamport),
          appliedEntries: trimmed,
        },
        commands: [],
      };
    }

    default:
      return null;
  }
}

function removeKey<V>(
  record: Record<string, V>,
  key: string,
): Record<string, V> {
  if (!(key in record)) return record;
  const next: Record<string, V> = {};
  for (const k of Object.keys(record)) {
    if (k !== key) next[k] = record[k] as V;
  }
  return next;
}
