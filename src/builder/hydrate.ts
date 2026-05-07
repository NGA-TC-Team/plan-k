import { decide } from "./decider";
import { compareStamps } from "./lamport";
import { apply } from "./reducer";
import { APPLIED_ENTRIES_LIMIT } from "./reducer/sync";
import type { IntentLogEntry } from "./types/intent";
import type { AppState } from "./types/state";

export function hydrate(
  snapshot: AppState,
  tailEntries: IntentLogEntry[],
): AppState {
  const sorted = [...tailEntries].sort((a, b) =>
    compareStamps(
      { lamport: a.lamport, origin: a.origin },
      { lamport: b.lamport, origin: b.origin },
    ),
  );

  let state = snapshot;
  let maxLamport = state.lamport;
  const appliedIds: string[] = [...state.appliedEntries];

  for (const entry of sorted) {
    const decision = decide(state, entry);
    if (!decision.ok) continue;
    const result = apply(state, entry);
    state = result.state;
    appliedIds.push(entry.id);
    if (entry.lamport > maxLamport) maxLamport = entry.lamport;
  }

  const trimmed =
    appliedIds.length > APPLIED_ENTRIES_LIMIT
      ? appliedIds.slice(-APPLIED_ENTRIES_LIMIT)
      : appliedIds;

  return {
    ...state,
    appliedEntries: trimmed,
    lamport: maxLamport + 1,
  };
}
